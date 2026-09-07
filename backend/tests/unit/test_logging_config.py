"""Unit tests for the logging configuration.

The gap these guard against: `backend/app/` had no logging configuration at
all. Every logger inherited uvicorn's defaults, so on Cloud Run an ERROR and a
DEBUG arrived indistinguishable and unfilterable. The two things worth being
strict about are therefore the JSON shape (Cloud Logging reads `severity` and
`message`, and nothing else it isn't given) and the level resolution.
"""

import json
import logging

import pytest

from app.config import settings
from app.observability import context as ctx
from app.observability import logging_config as lc


# =============================================================================
# HELPERS
# =============================================================================

def _record(
    *,
    level: int = logging.INFO,
    msg: str = "hello %s",
    args: tuple = ("world",),
    exc_info=None,
    **extra,
) -> logging.LogRecord:
    """A LogRecord shaped the way ``Logger.makeRecord`` shapes one."""
    record = logging.LogRecord(
        name="app.test",
        level=level,
        pathname="app/test.py",
        lineno=42,
        msg=msg,
        args=args,
        exc_info=exc_info,
    )
    record.__dict__.update(extra)
    return record


def _formatted(record: logging.LogRecord) -> dict:
    return json.loads(lc.JsonFormatter().format(record))


@pytest.fixture
def isolated_logging():
    """Restore every logger this module reconfigures.

    ``configure_logging`` mutates process-wide state, and the rest of the suite
    (351 tests) runs in the same process. Without this a level change here
    silences assertions there.
    """
    watched = ["", "uvicorn", "uvicorn.error", "uvicorn.asgi", "uvicorn.access"]
    watched += list(lc._NOISY_LOGGERS)
    saved = {
        name: (
            list(logging.getLogger(name).handlers),
            logging.getLogger(name).level,
            logging.getLogger(name).propagate,
            logging.getLogger(name).disabled,
        )
        for name in watched
    }
    was_configured = lc._configured

    yield

    for name, (handlers, level, propagate, disabled) in saved.items():
        logger = logging.getLogger(name)
        logger.handlers[:] = handlers
        logger.setLevel(level)
        logger.propagate = propagate
        logger.disabled = disabled
    lc._configured = was_configured


@pytest.fixture
def in_request():
    """Run the test as though a request were in flight."""
    ctx.start_request_context("req-abc")
    yield
    ctx.reset_request_context()


# =============================================================================
# LEVEL AND FORMAT RESOLUTION
# =============================================================================

def test_level_defaults_to_debug_in_development(monkeypatch) -> None:
    monkeypatch.setattr(settings, "LOG_LEVEL", "")
    monkeypatch.setattr(settings, "debug", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    assert settings.log_level == "DEBUG"


def test_level_defaults_to_info_in_production(monkeypatch) -> None:
    monkeypatch.setattr(settings, "LOG_LEVEL", "")
    monkeypatch.setattr(settings, "debug", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert settings.log_level == "INFO"


def test_level_override_wins_and_is_normalized(monkeypatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "LOG_LEVEL", "  warning  ")
    assert settings.log_level == "WARNING"


def test_format_defaults_to_console_in_development(monkeypatch) -> None:
    monkeypatch.setattr(settings, "LOG_FORMAT", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    assert settings.log_format == "console"


def test_format_defaults_to_json_in_production(monkeypatch) -> None:
    monkeypatch.setattr(settings, "LOG_FORMAT", "")
    monkeypatch.setattr(settings, "debug", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert settings.log_format == "json"


def test_format_override_wins(monkeypatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "LOG_FORMAT", "JSON")
    assert settings.log_format == "json"


def test_unrecognized_format_falls_back_to_the_default(monkeypatch) -> None:
    """A typo must not leave the service with no usable format."""
    monkeypatch.setattr(settings, "debug", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "LOG_FORMAT", "logfmt")
    assert settings.log_format == "json"


# =============================================================================
# JSON FORMATTER
# =============================================================================

def test_json_carries_the_fields_cloud_logging_reads() -> None:
    """`severity` and `message` are the two keys Cloud Logging interprets."""
    payload = _formatted(_record(level=logging.ERROR))

    assert payload["severity"] == "ERROR"
    assert payload["message"] == "hello world"
    assert payload["logger"] == "app.test"
    assert payload["timestamp"].endswith("Z")


def test_json_merges_extra_fields_at_the_top_level() -> None:
    """`extra={...}` has to be queryable without string-parsing the message."""
    payload = _formatted(_record(item_id="abc", duration_ms=12.5))

    assert payload["item_id"] == "abc"
    assert payload["duration_ms"] == 12.5


def test_json_includes_the_traceback() -> None:
    try:
        raise ValueError("boom")
    except ValueError:
        import sys

        payload = _formatted(_record(level=logging.ERROR, exc_info=sys.exc_info()))

    assert "ValueError: boom" in payload["exception"]


def test_json_drops_uvicorns_ansi_duplicate_message() -> None:
    """Uvicorn attaches the same text again wrapped in escape codes."""
    payload = _formatted(_record(color_message="\\x1b[36mhello\\x1b[0m"))

    assert "color_message" not in payload


def test_json_survives_an_unserializable_extra() -> None:
    """Losing the record entirely would be worse than losing the field's type."""
    payload = _formatted(_record(client=object()))

    assert "object object at" in payload["client"]


def test_json_omits_user_id_when_no_user_is_bound() -> None:
    assert "user_id" not in _formatted(_record())


def test_json_includes_user_id_when_bound() -> None:
    assert _formatted(_record(user_id="user-7"))["user_id"] == "user-7"


# =============================================================================
# CONSOLE FORMATTER
# =============================================================================

def test_console_line_shows_the_request_id() -> None:
    line = lc.ConsoleFormatter().format(_record(request_id="req-abc"))

    assert "[req-abc]" in line
    assert "app.test" in line
    assert line.endswith("hello world")


def test_console_line_works_without_the_filter() -> None:
    """A handler wired up without ContextFilter must not raise KeyError."""
    assert f"[{lc.UNKNOWN}]" in lc.ConsoleFormatter().format(_record())


# =============================================================================
# CONTEXT FILTER
# =============================================================================

def test_filter_marks_records_raised_outside_a_request() -> None:
    record = _record()
    lc.ContextFilter().filter(record)

    assert record.request_id == lc.UNKNOWN
    assert record.user_id == lc.UNKNOWN


def test_filter_stamps_the_request_and_the_user(in_request) -> None:
    ctx.bind_user("user-7")
    record = _record()
    lc.ContextFilter().filter(record)

    assert record.request_id == "req-abc"
    assert record.user_id == "user-7"


# =============================================================================
# configure_logging
# =============================================================================

def test_configure_installs_one_handler_with_the_filter(isolated_logging) -> None:
    lc.configure_logging("INFO", "json", force=True)
    ours = [h for h in logging.getLogger().handlers if h.get_name() == "siy"]

    assert len(ours) == 1
    assert isinstance(ours[0].formatter, lc.JsonFormatter)
    assert any(isinstance(f, lc.ContextFilter) for f in ours[0].filters)
    assert logging.getLogger().level == logging.INFO


def test_configure_is_idempotent(isolated_logging) -> None:
    """Import-time configuration must not stack a handler per caller."""
    lc.configure_logging("INFO", "json", force=True)
    lc.configure_logging("DEBUG", "console")

    root = logging.getLogger()
    assert len([h for h in root.handlers if h.get_name() == "siy"]) == 1
    # The second call was a no-op, so the first call's level still stands.
    assert root.level == logging.INFO


def test_configure_with_force_replaces_rather_than_appends(isolated_logging) -> None:
    lc.configure_logging("INFO", "json", force=True)
    lc.configure_logging("DEBUG", "console", force=True)

    root = logging.getLogger()
    ours = [h for h in root.handlers if h.get_name() == "siy"]
    assert len(ours) == 1
    assert isinstance(ours[0].formatter, lc.ConsoleFormatter)
    assert root.level == logging.DEBUG


def test_configure_leaves_handlers_it_does_not_own(isolated_logging) -> None:
    """pytest's caplog attaches to the root logger; ripping it out breaks it."""
    foreign = logging.NullHandler()
    root = logging.getLogger()
    root.addHandler(foreign)

    lc.configure_logging("INFO", "json", force=True)

    assert foreign in root.handlers


def test_uvicorn_output_is_routed_through_our_handler(isolated_logging) -> None:
    """Uvicorn sets propagate=False and its own handlers; we take both back."""
    uvicorn_error = logging.getLogger("uvicorn.error")
    uvicorn_error.handlers.append(logging.NullHandler())
    uvicorn_error.propagate = False

    lc.configure_logging("INFO", "json", force=True)

    assert uvicorn_error.handlers == []
    assert uvicorn_error.propagate is True


def test_uvicorn_access_log_is_retired(isolated_logging) -> None:
    """RequestContextMiddleware emits the access line; two would be one too many."""
    lc.configure_logging("INFO", "json", force=True)

    assert logging.getLogger("uvicorn.access").disabled is True


def test_an_unknown_level_falls_back_rather_than_crashing(
    isolated_logging, caplog
) -> None:
    """A typo in LOG_LEVEL must not be what stops the API from booting."""
    caplog.set_level(logging.WARNING)

    lc.configure_logging("TRACE", "json", force=True)

    assert logging.getLogger().level == logging.INFO
    assert "Unknown log level" in caplog.text


def test_noisy_third_party_loggers_are_damped(isolated_logging) -> None:
    """LOG_LEVEL=DEBUG must stay readable; httpx logs a line per Gemini call."""
    lc.configure_logging("DEBUG", "console", force=True)

    assert logging.getLogger("httpx").level == logging.WARNING
    assert logging.getLogger("asyncio").level == logging.WARNING
