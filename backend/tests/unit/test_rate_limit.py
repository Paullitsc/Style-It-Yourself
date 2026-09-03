"""Unit tests for the shared rate limiter.

The regression these guard against: counters used to live in a per-process
dict, so on Cloud Run the effective limit was multiplied by the instance count
and reset on every cold start. `test_two_instances_share_one_budget` is the
test that would have failed before the fix.
"""

import pytest
from fastapi import HTTPException

from app.config import settings
from app.middleware.rate_limit import IPRateLimitMiddleware, get_client_ip
from app.models.schemas import User
from app.services import rate_limit as rl

# =============================================================================
# HELPERS
# =============================================================================

class FakeClock:
    """Controllable wall clock, in epoch seconds."""

    def __init__(self, now: float = 1_000_000.0) -> None:
        self.now = now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeRPC:
    def __init__(self, store, params):
        self._store = store
        self._params = params

    async def execute(self):
        return FakeResponse(self._store.consume(**self._params))


class FakePostgres:
    """Stands in for the ``consume_rate_limit`` RPC.

    Mirrors the SQL: fixed windows floored onto a boundary, one shared counter
    per (key, window). Shared deliberately, so two limiter objects standing in
    for two Cloud Run instances contend for the same budget.
    """

    def __init__(self, clock: FakeClock) -> None:
        self.clock = clock
        self.counters: dict[tuple[str, int], int] = {}
        self.calls = 0
        self.fail_with: Exception | None = None

    def consume(self, p_key, p_limit, p_window_seconds):
        self.calls += 1
        if self.fail_with is not None:
            raise self.fail_with
        window_start = int(self.clock.now // p_window_seconds) * p_window_seconds
        slot = (p_key, window_start)
        self.counters[slot] = self.counters.get(slot, 0) + 1
        count = self.counters[slot]
        allowed = count <= p_limit
        retry_after = 0
        if not allowed:
            retry_after = max(1, int(window_start + p_window_seconds - self.clock.now))
        return [{
            "allowed": allowed,
            "remaining": max(0, p_limit - count),
            "retry_after": retry_after,
        }]

    def client(self):
        store = self

        class _Client:
            def rpc(self, _name, params):
                return FakeRPC(store, params)

        return _Client()


@pytest.fixture
def enabled(monkeypatch: pytest.MonkeyPatch):
    """Turn the limiter on (conftest disables it suite-wide)."""
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)


@pytest.fixture
def pg(monkeypatch: pytest.MonkeyPatch, enabled):
    """A working fake Postgres backend wired into the module facade."""
    clock = FakeClock()
    store = FakePostgres(clock)

    async def fake_client():
        return store.client()

    monkeypatch.setattr(rl, "get_supabase_client", fake_client)
    rl._in_process.reset()
    return store


# =============================================================================
# In-process limiter
# =============================================================================

@pytest.mark.asyncio
async def test_in_process_allows_up_to_limit() -> None:
    limiter = rl.InProcessLimiter()
    for _ in range(3):
        assert (await limiter.check("k", 3, 60)).allowed


@pytest.mark.asyncio
async def test_in_process_denies_past_limit_with_retry_after() -> None:
    limiter = rl.InProcessLimiter()
    for _ in range(3):
        await limiter.check("k", 3, 60)

    decision = await limiter.check("k", 3, 60)
    assert not decision.allowed
    assert 0 < decision.retry_after <= 61


@pytest.mark.asyncio
async def test_in_process_keys_are_independent() -> None:
    limiter = rl.InProcessLimiter()
    for _ in range(2):
        await limiter.check("a", 2, 60)

    assert not (await limiter.check("a", 2, 60)).allowed
    assert (await limiter.check("b", 2, 60)).allowed


@pytest.mark.asyncio
async def test_in_process_window_expires(monkeypatch: pytest.MonkeyPatch) -> None:
    limiter = rl.InProcessLimiter()
    fake_now = 500.0
    monkeypatch.setattr(rl, "monotonic", lambda: fake_now)

    for _ in range(2):
        await limiter.check("k", 2, 60)
    assert not (await limiter.check("k", 2, 60)).allowed

    fake_now += 61
    assert (await limiter.check("k", 2, 60)).allowed


@pytest.mark.asyncio
async def test_in_process_sweeps_stale_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    """The key table must not grow one entry per IP seen since boot."""
    limiter = rl.InProcessLimiter()
    monkeypatch.setattr(rl, "_SWEEP_EVERY", 50)
    fake_now = 100.0
    monkeypatch.setattr(rl, "monotonic", lambda: fake_now)

    for i in range(40):
        await limiter.check(f"key-{i}", 10, 60)
    assert len(limiter._history) == 40

    # Push past the window, then past the sweep threshold.
    fake_now += 120
    for i in range(20):
        await limiter.check("survivor", 100, 60)

    assert "survivor" in limiter._history
    assert len(limiter._history) < 40


# =============================================================================
# Postgres limiter
# =============================================================================

@pytest.mark.asyncio
async def test_postgres_limiter_parses_row(pg) -> None:
    limiter = rl.PostgresLimiter()
    decision = await limiter.check("k", 5, 60)
    assert decision.allowed
    assert decision.retry_after == 0


@pytest.mark.asyncio
async def test_postgres_limiter_reports_denial(pg) -> None:
    limiter = rl.PostgresLimiter()
    for _ in range(2):
        await limiter.check("k", 2, 60)

    decision = await limiter.check("k", 2, 60)
    assert not decision.allowed
    assert decision.retry_after > 0


@pytest.mark.asyncio
async def test_postgres_limiter_rejects_empty_result(monkeypatch, enabled) -> None:
    """An empty RPC payload must raise, so the facade falls back rather than
    silently treating it as 'allowed'."""
    class _Client:
        def rpc(self, _name, _params):
            class _RPC:
                async def execute(self):
                    return FakeResponse([])
            return _RPC()

    async def fake_client():
        return _Client()

    monkeypatch.setattr(rl, "get_supabase_client", fake_client)
    with pytest.raises(ValueError):
        await rl.PostgresLimiter().check("k", 5, 60)


# =============================================================================
# The regression: shared budget across instances
# =============================================================================

@pytest.mark.asyncio
async def test_two_instances_share_one_budget(pg) -> None:
    """Two limiters against one store must not each get a full allowance.

    This is the deploy bug in miniature: with per-process counters, instance_b
    would have had its own untouched budget.
    """
    instance_a = rl.PostgresLimiter()
    instance_b = rl.PostgresLimiter()

    for _ in range(10):
        assert (await instance_a.check("tryon:user:u1", 10, 60)).allowed

    assert not (await instance_b.check("tryon:user:u1", 10, 60)).allowed


@pytest.mark.asyncio
async def test_budget_resets_on_window_roll(pg) -> None:
    limiter = rl.PostgresLimiter()
    for _ in range(2):
        await limiter.check("k", 2, 60)
    assert not (await limiter.check("k", 2, 60)).allowed

    pg.clock.advance(60)
    assert (await limiter.check("k", 2, 60)).allowed


# =============================================================================
# Facade: fallback behaviour
# =============================================================================

@pytest.mark.asyncio
async def test_facade_prefers_postgres(pg) -> None:
    decision = await rl.check("k", 5, 60)
    assert decision.allowed
    assert pg.calls == 1


@pytest.mark.asyncio
async def test_facade_falls_back_to_in_process_when_rpc_fails(pg) -> None:
    """A Supabase blip degrades to per-instance limiting, not to no limiting."""
    pg.fail_with = RuntimeError("supabase unreachable")

    for _ in range(3):
        assert (await rl.check("k", 3, 60)).allowed

    decision = await rl.check("k", 3, 60)
    assert not decision.allowed


@pytest.mark.asyncio
async def test_in_process_stays_warm_while_postgres_works(pg) -> None:
    """The fallback counter must track traffic even while unused, so it can take
    over immediately rather than handing out a fresh budget mid-incident."""
    for _ in range(3):
        await rl.check("k", 3, 60)

    pg.fail_with = RuntimeError("supabase unreachable")
    assert not (await rl.check("k", 3, 60)).allowed


@pytest.mark.asyncio
async def test_disabled_short_circuits(monkeypatch, pg) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", False)
    for _ in range(50):
        assert (await rl.check("k", 1, 60)).allowed
    assert pg.calls == 0


# =============================================================================
# FastAPI dependency
# =============================================================================

@pytest.mark.asyncio
async def test_dependency_raises_429_with_retry_after(pg) -> None:
    dependency = rl.rate_limit("tryon-generate", 2, label="Try-on")
    user = User(id="u1", email="a@b.c", name="A")

    for _ in range(2):
        await dependency(current_user=user)

    with pytest.raises(HTTPException) as exc:
        await dependency(current_user=user)

    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"].isdigit()
    # Clients render `detail` verbatim, so it has to read as a sentence.
    assert "Try-on rate limit hit (2 per 60s)" in exc.value.detail


@pytest.mark.asyncio
async def test_dependency_scopes_budget_per_user(pg) -> None:
    dependency = rl.rate_limit("tryon-generate", 1)
    first = User(id="u1", email="a@b.c", name="A")
    second = User(id="u2", email="d@e.f", name="B")

    await dependency(current_user=first)
    with pytest.raises(HTTPException):
        await dependency(current_user=first)

    await dependency(current_user=second)


@pytest.mark.asyncio
async def test_separate_names_have_separate_budgets(pg) -> None:
    generate = rl.rate_limit("tryon-generate", 1)
    upload = rl.rate_limit("tryon-upload", 1)
    user = User(id="u1", email="a@b.c", name="A")

    await generate(current_user=user)
    with pytest.raises(HTTPException):
        await generate(current_user=user)

    await upload(current_user=user)


# =============================================================================
# IP middleware
# =============================================================================

def _request(headers: dict[str, str], client_host: str | None = "10.0.0.1"):
    from starlette.datastructures import Headers
    from starlette.requests import Request

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/try-on/single",
        "headers": Headers(headers).raw,
        "client": (client_host, 12345) if client_host else None,
    }
    return Request(scope)


def test_client_ip_prefers_forwarded_for(monkeypatch) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_FORWARDED_FOR", True)
    request = _request({"x-forwarded-for": "203.0.113.7, 70.41.3.18"})
    assert get_client_ip(request) == "203.0.113.7"


def test_client_ip_falls_back_to_peer(monkeypatch) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_FORWARDED_FOR", True)
    assert get_client_ip(_request({})) == "10.0.0.1"


def test_client_ip_ignores_forwarded_for_when_untrusted(monkeypatch) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_FORWARDED_FOR", False)
    request = _request({"x-forwarded-for": "203.0.113.7"})
    assert get_client_ip(request) == "10.0.0.1"


def test_client_ip_handles_missing_peer(monkeypatch) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_FORWARDED_FOR", False)
    assert get_client_ip(_request({}, client_host=None)) == "unknown"


def test_middleware_limits_by_ip(monkeypatch, enabled) -> None:
    """Third request from one IP is refused; a different IP is unaffected."""
    rl._in_process.reset()
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    monkeypatch.setattr(settings, "RATE_LIMIT_IP_PER_MINUTE", 2)

    app = FastAPI()
    app.add_middleware(IPRateLimitMiddleware)

    @app.get("/ping")
    async def ping():
        return {"ok": True}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    client = TestClient(app)
    noisy = {"x-forwarded-for": "203.0.113.9"}

    assert client.get("/ping", headers=noisy).status_code == 200
    assert client.get("/ping", headers=noisy).status_code == 200

    blocked = client.get("/ping", headers=noisy)
    assert blocked.status_code == 429
    assert blocked.headers["Retry-After"].isdigit()
    assert "Too many requests" in blocked.json()["detail"]

    # Liveness probes stay reachable, and other callers are unaffected.
    assert client.get("/health", headers=noisy).status_code == 200
    assert client.get("/ping", headers={"x-forwarded-for": "198.51.100.4"}).status_code == 200


@pytest.mark.asyncio
async def test_check_local_never_touches_postgres(pg) -> None:
    """The per-IP path must not put a database round-trip on every request."""
    for _ in range(5):
        await rl.check_local("ip:203.0.113.9", 10, 60)
    assert pg.calls == 0


@pytest.mark.asyncio
async def test_check_local_enforces_its_limit(enabled) -> None:
    rl._in_process.reset()
    for _ in range(2):
        assert (await rl.check_local("ip:x", 2, 60)).allowed
    assert not (await rl.check_local("ip:x", 2, 60)).allowed
