"""Unit tests for request correlation.

The point of the correlation id is that lines emitted from different modules
during one request can be found together afterwards. Two tests carry most of
that weight:

- `test_router_logs_inherit_the_request_id`, which is the whole feature.
- `test_user_bound_inside_the_route_reaches_the_access_line`, which is the one
  that fails if the per-request context is ever simplified from a mutable dict
  into plain ContextVars. `IPRateLimitMiddleware` is a `BaseHTTPMiddleware`, so
  it runs the route in a child task, and a `ContextVar.set()` made in there is
  invisible to the access line emitted above it.
"""

import logging

import pytest
from fastapi import FastAPI
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.testclient import TestClient

from app.config import settings
from app.middleware.rate_limit import IPRateLimitMiddleware
from app.middleware.request_context import (
    REQUEST_ID_HEADER,
    RequestContextMiddleware,
    resolve_request_id,
)
from app.observability import context as ctx
from app.observability.logging_config import ACCESS_LOGGER_NAME, ContextFilter
from app.services import rate_limit as rl


# =============================================================================
# HELPERS
# =============================================================================

class RecordingHandler(logging.Handler):
    """Captures records after ContextFilter has stamped them.

    caplog's own handler carries no filter, so it would see records without the
    request id -- the very thing under test.
    """

    def __init__(self) -> None:
        super().__init__(level=logging.DEBUG)
        self.addFilter(ContextFilter())
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)

    def by_logger(self, name: str) -> list[logging.LogRecord]:
        return [r for r in self.records if r.name == name]

    @property
    def access(self) -> logging.LogRecord:
        records = self.by_logger(ACCESS_LOGGER_NAME)
        assert len(records) == 1, f"expected one access line, got {len(records)}"
        return records[0]


@pytest.fixture
def captured():
    """Capture every record in the process, with the context filter applied."""
    handler = RecordingHandler()
    root = logging.getLogger()
    previous_level = root.level
    root.addHandler(handler)
    root.setLevel(logging.DEBUG)
    yield handler
    root.removeHandler(handler)
    root.setLevel(previous_level)


@pytest.fixture
def limiter_enabled(monkeypatch: pytest.MonkeyPatch):
    """Turn the IP limiter on (conftest disables it suite-wide)."""
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    rl._in_process.reset()
    yield
    rl._in_process.reset()


def _request(headers: dict[str, str]) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/closet",
            "headers": Headers(headers).raw,
            "client": ("10.0.0.1", 12345),
        }
    )


def _app(*, with_rate_limiter: bool = False) -> FastAPI:
    """A minimal app in the same middleware order as `app/main.py`."""
    app = FastAPI()
    if with_rate_limiter:
        app.add_middleware(IPRateLimitMiddleware)
    app.add_middleware(RequestContextMiddleware)

    router_logger = logging.getLogger("app.routers.fake")

    @app.get("/ping")
    async def ping():
        router_logger.info("router did something")
        return {"ok": True}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/authed")
    async def authed():
        # Stands in for get_current_user, which binds the user from inside the
        # route -- below the BaseHTTPMiddleware task boundary.
        ctx.bind_user("user-7")
        return {"ok": True}

    @app.get("/boom")
    async def boom():
        raise RuntimeError("synthetic failure")

    return app


# =============================================================================
# ID RESOLUTION
# =============================================================================

def test_id_is_minted_when_the_caller_supplies_none() -> None:
    assert len(resolve_request_id(_request({}))) == 32


def test_inbound_request_id_is_honored() -> None:
    """So a client or proxy can correlate its own logs with ours."""
    assert resolve_request_id(_request({"x-request-id": "client-42"})) == "client-42"


def test_cloud_run_trace_id_is_adopted() -> None:
    """Cloud Run's own request log then describes the same id we do."""
    headers = {"x-cloud-trace-context": "105445aa7843bc8bf206b120001000/1;o=1"}

    assert resolve_request_id(_request(headers)) == "105445aa7843bc8bf206b120001000"


def test_explicit_request_id_outranks_the_trace_header() -> None:
    headers = {"x-request-id": "client-42", "x-cloud-trace-context": "abc/1;o=1"}

    assert resolve_request_id(_request(headers)) == "client-42"


def test_inbound_id_cannot_forge_a_log_record() -> None:
    """The id is caller-supplied and lands in log output; newlines go."""
    forged = "abc\nERROR fake line injected"

    assert resolve_request_id(_request({"x-request-id": forged})) == "abcERRORfakelineinjected"


def test_inbound_id_is_length_capped() -> None:
    assert len(resolve_request_id(_request({"x-request-id": "z" * 500}))) == 64


def test_unusable_inbound_id_falls_back_to_a_minted_one() -> None:
    assert len(resolve_request_id(_request({"x-request-id": "!!!"}))) == 32


# =============================================================================
# RESPONSE HEADER
# =============================================================================

def test_response_echoes_the_request_id() -> None:
    response = TestClient(_app()).get("/ping")

    assert len(response.headers[REQUEST_ID_HEADER]) == 32


def test_each_request_gets_its_own_id() -> None:
    client = TestClient(_app())
    first = client.get("/ping").headers[REQUEST_ID_HEADER]
    second = client.get("/ping").headers[REQUEST_ID_HEADER]

    assert first != second


def test_rejected_request_still_carries_an_id(limiter_enabled, monkeypatch) -> None:
    """A 429 is exactly the response someone will ask you to explain."""
    monkeypatch.setattr(settings, "RATE_LIMIT_IP_PER_MINUTE", 1)
    client = TestClient(_app(with_rate_limiter=True))
    headers = {"x-forwarded-for": "203.0.113.9"}

    assert client.get("/ping", headers=headers).status_code == 200
    blocked = client.get("/ping", headers=headers)

    assert blocked.status_code == 429
    assert len(blocked.headers[REQUEST_ID_HEADER]) == 32


# =============================================================================
# CORRELATION
# =============================================================================

def test_router_logs_inherit_the_request_id(captured) -> None:
    """Untouched `logging.getLogger(__name__)` call sites become correlatable."""
    response = TestClient(_app()).get("/ping")
    request_id = response.headers[REQUEST_ID_HEADER]

    router_record = captured.by_logger("app.routers.fake")[0]
    assert router_record.request_id == request_id
    assert captured.access.request_id == request_id


def test_user_bound_inside_the_route_reaches_the_access_line(captured) -> None:
    """Crosses the BaseHTTPMiddleware task boundary; see the module docstring."""
    TestClient(_app(with_rate_limiter=True)).get("/authed")

    assert captured.access.user_id == "user-7"


def test_no_request_means_no_request_id(captured) -> None:
    """Startup and background records must not inherit a stale id."""
    logging.getLogger("app.routers.fake").info("outside any request")

    assert captured.by_logger("app.routers.fake")[0].request_id == "-"


# =============================================================================
# ACCESS LINE
# =============================================================================

def test_access_line_records_the_request(captured) -> None:
    TestClient(_app()).get("/ping")
    record = captured.access

    assert record.levelno == logging.INFO
    assert record.method == "GET"
    assert record.path == "/ping"
    assert record.status == 200
    assert record.duration_ms >= 0
    assert record.client_ip == "testclient"
    assert record.getMessage() == f"GET /ping 200 {record.duration_ms}ms"


def test_liveness_probes_are_logged_at_debug(captured) -> None:
    """Docker's healthcheck hits /health every 30s and says nothing."""
    TestClient(_app()).get("/health")

    assert captured.access.levelno == logging.DEBUG


def test_client_errors_are_logged_at_warning(captured) -> None:
    TestClient(_app()).get("/does-not-exist")

    assert captured.access.levelno == logging.WARNING
    assert captured.access.status == 404


def test_unhandled_exception_is_logged_as_a_failed_request(captured) -> None:
    with pytest.raises(RuntimeError):
        TestClient(_app()).get("/boom")

    record = captured.access
    assert record.levelno == logging.ERROR
    assert record.status == 500
    assert record.error == "RuntimeError"


def test_query_strings_are_not_logged(captured) -> None:
    """They are user-supplied and can carry identifiers we need not keep."""
    TestClient(_app()).get("/ping?email=someone%40example.com")

    assert captured.access.path == "/ping"
    assert "example.com" not in captured.access.getMessage()
