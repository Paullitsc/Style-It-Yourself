"""Shared rate limiting for expensive endpoints.

Every limited endpoint costs something real: a paid Gemini call, an outbound
fetch of a caller-supplied URL, a Supabase storage write. The counters
therefore have to be shared across Cloud Run instances. A per-process dict
multiplies the effective limit by the instance count and resets on every cold
start, which with ``--min-instances 0`` happens on ordinary traffic gaps.

Layering:

1. :class:`PostgresLimiter` is authoritative. One RPC round-trip per limited
   call, atomic under concurrency (``consume_rate_limit`` in
   ``supabase_schema.sql``).
2. :class:`InProcessLimiter` runs on every call regardless, and supplies the
   decision only when the RPC fails. Failing fully open would leave the
   expensive endpoints unprotected during a Supabase blip; falling back to the
   old per-instance behaviour is bounded, if loose.

Both backends are keyed identically, so a key means the same thing in either.

Note the two enforcement points differ deliberately:

- :func:`rate_limit` is a FastAPI dependency and is therefore *post-auth*. It
  keys on the authenticated user id.
- The IP limiter is middleware (``app/middleware/rate_limit.py``) because it has
  to run *before* ``get_current_user``, which spends a Supabase round-trip on
  every request including ones carrying a junk token.
"""

import asyncio
import logging
from collections import defaultdict, deque
from dataclasses import dataclass
from time import monotonic

from fastapi import Depends, HTTPException, status

from app.config import settings
from app.middleware.auth import get_current_user
from app.models.schemas import ErrorResponse, User
from app.services.supabase import get_supabase_client

logger = logging.getLogger(__name__)


# Spread into a route's ``responses`` so the 429 shows up in the OpenAPI schema
# alongside the 401.
RATE_LIMIT_RESPONSES = {
    429: {
        "model": ErrorResponse,
        "description": (
            "Rate limit exceeded. Retry after the number of seconds in the "
            "Retry-After header."
        ),
        "content": {
            "application/json": {
                "example": {
                    "detail": "Try-on rate limit hit (10 per 60s). Try again in 12s."
                }
            }
        },
    }
}


@dataclass(frozen=True)
class Decision:
    """Outcome of consuming one unit of budget."""

    allowed: bool
    retry_after: int = 0


# Sweep the in-process key table every N checks. Without this the dict grows
# one entry per distinct user or IP seen since boot, which matters now that the
# IP limiter routes every request through here.
_SWEEP_EVERY = 1000


class InProcessLimiter:
    """Sliding-window limiter scoped to a single process.

    Stricter than the Postgres fixed window (no boundary doubling), but only
    ever sees the share of traffic this instance handled.
    """

    def __init__(self) -> None:
        self._history: dict[str, deque] = defaultdict(deque)
        self._lock = asyncio.Lock()
        self._checks_since_sweep = 0

    async def check(self, key: str, limit: int, window_seconds: int) -> Decision:
        now = monotonic()
        cutoff = now - window_seconds
        async with self._lock:
            history = self._history[key]
            while history and history[0] < cutoff:
                history.popleft()

            self._checks_since_sweep += 1
            if self._checks_since_sweep >= _SWEEP_EVERY:
                self._checks_since_sweep = 0
                self._sweep(cutoff)

            if len(history) >= limit:
                retry_after = max(1, int(history[0] + window_seconds - now) + 1)
                return Decision(allowed=False, retry_after=retry_after)

            history.append(now)
            return Decision(allowed=True)

    def _sweep(self, cutoff: float) -> None:
        """Drop keys with no live entries. Caller holds the lock."""
        stale = [
            key
            for key, history in self._history.items()
            if not history or history[-1] < cutoff
        ]
        for key in stale:
            del self._history[key]

    def reset(self) -> None:
        """Clear all state. Test helper."""
        self._history.clear()
        self._checks_since_sweep = 0


class PostgresLimiter:
    """Fixed-window limiter backed by the ``consume_rate_limit`` RPC."""

    async def check(self, key: str, limit: int, window_seconds: int) -> Decision:
        client = await get_supabase_client()
        response = await client.rpc(
            "consume_rate_limit",
            {
                "p_key": key,
                "p_limit": limit,
                "p_window_seconds": window_seconds,
            },
        ).execute()

        row = response.data
        # A RETURNS TABLE function comes back as a single-row list; tolerate a
        # bare dict in case the client unwraps it.
        if isinstance(row, list):
            if not row:
                raise ValueError("consume_rate_limit returned no rows")
            row = row[0]
        if not isinstance(row, dict):
            raise TypeError(f"unexpected consume_rate_limit payload: {type(row)}")

        return Decision(
            allowed=bool(row["allowed"]),
            retry_after=int(row.get("retry_after") or 0),
        )


_in_process = InProcessLimiter()
_postgres = PostgresLimiter()


async def check(key: str, limit: int, window_seconds: int) -> Decision:
    """Consume one unit of budget for ``key``.

    The in-process limiter is always consulted so its window stays warm and can
    take over immediately if the RPC starts failing; its verdict is used only
    in that case.
    """
    if not settings.RATE_LIMIT_ENABLED:
        return Decision(allowed=True)

    local = await _in_process.check(key, limit, window_seconds)

    try:
        return await _postgres.check(key, limit, window_seconds)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Rate limit RPC failed for %s; falling back to in-process counter: %r",
            key,
            exc,
        )
        return local


async def check_local(key: str, limit: int, window_seconds: int) -> Decision:
    """Per-instance check that never touches the database.

    For the coarse per-IP bound, routing every request through the RPC would put
    a Supabase round-trip on the hot path of the entire API -- latency on cheap
    endpoints, and the whole service's availability behind one table -- to
    sharpen a limit that only needs to be approximate. With N instances the
    real ceiling is N x limit, which is fine for a DoS speed bump.

    The paid endpoints do not get that latitude: they use :func:`check`.
    """
    if not settings.RATE_LIMIT_ENABLED:
        return Decision(allowed=True)
    return await _in_process.check(key, limit, window_seconds)


def _detail(what: str, limit: int, window_seconds: int, retry_after: int) -> str:
    """Human-readable 429 body.

    Clients render `detail` verbatim and neither inspects status codes, so a
    bare 429 surfaces in the UI as "API error: 429".
    """
    return (
        f"{what} rate limit hit ({limit} per {window_seconds}s). "
        f"Try again in {retry_after}s."
    )


def rate_limit(
    name: str,
    limit: int,
    window_seconds: int = 60,
    *,
    label: str | None = None,
):
    """Build a per-user rate limit dependency.

    Attach with ``dependencies=[Depends(rate_limit(...))]`` so the policy stays
    visible in the route decorator instead of buried in the handler body.

    Depending on ``get_current_user`` here costs nothing extra: FastAPI caches
    dependency results per request, so the endpoint's own auth dependency and
    this one share a single Supabase token check.
    """
    what = label or name.replace("-", " ").replace("_", " ").capitalize()

    async def _dependency(current_user: User = Depends(get_current_user)) -> None:
        decision = await check(f"{name}:user:{current_user.id}", limit, window_seconds)
        if not decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=_detail(what, limit, window_seconds, decision.retry_after),
                headers={"Retry-After": str(decision.retry_after)},
            )

    return _dependency
