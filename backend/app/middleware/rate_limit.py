"""Per-IP rate limiting, applied before authentication.

This has to be middleware rather than a dependency. ``get_current_user`` spends
an outbound ``supabase.auth.get_user`` round-trip on *every* request, including
ones carrying a junk token, and dependencies run too late to prevent that. A
flood of forged bearer tokens would otherwise cost real latency and Supabase
auth quota with nothing bounding it.

The per-user limits in ``app/services/rate_limit.py`` remain the real control;
this is the outer bound on unauthenticated volume.

Deliberately per-instance (``check_local``) rather than Supabase-backed: this
runs on every request, and a database round-trip here would tax the latency of
the whole API to sharpen a bound that only needs to be approximate. With N Cloud
Run instances the true ceiling is N x the configured limit.
"""

import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.services import rate_limit as rate_limit_service

logger = logging.getLogger(__name__)

# Liveness probes must stay reachable under load, and CORS preflights are not
# something a caller chooses to send -- charging them would break the browser
# flow with a confusing opaque failure rather than a readable 429.
_EXEMPT_PATHS = frozenset({"/health", "/"})


def get_client_ip(request: Request) -> str:
    """Best-effort client IP.

    Behind Cloud Run the socket peer is a Google frontend shared by every user,
    so ``request.client.host`` would bucket the whole world together. The
    left-most X-Forwarded-For entry is the documented client position there,
    but it is caller-supplied and spoofable -- see
    ``RATE_LIMIT_TRUST_FORWARDED_FOR`` in config.
    """
    if settings.RATE_LIMIT_TRUST_FORWARDED_FOR:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            first = forwarded.split(",")[0].strip()
            if first:
                return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


class IPRateLimitMiddleware(BaseHTTPMiddleware):
    """Bound total request volume per client IP."""

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        limit = settings.RATE_LIMIT_IP_PER_MINUTE
        decision = await rate_limit_service.check_local(
            f"ip:{get_client_ip(request)}", limit, 60
        )
        if not decision.allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": (
                        f"Too many requests ({limit} per 60s from this address). "
                        f"Try again in {decision.retry_after}s."
                    )
                },
                headers={"Retry-After": str(decision.retry_after)},
            )

        return await call_next(request)
