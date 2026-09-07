"""Per-request context shared by the logger, the middleware, and Sentry.

One :class:`~contextvars.ContextVar` holding a **mutable dict**, rather than one
ContextVar per value. That looks roundabout and is deliberate.

``IPRateLimitMiddleware`` is a Starlette ``BaseHTTPMiddleware``, which runs the
rest of the application in a *child* task (``task_group.start_soon(coro)`` in
``starlette/middleware/base.py``). A child task inherits a copy of the context,
so a ``ContextVar.set()`` made below that boundary -- binding the user id inside
``get_current_user``, for instance -- is invisible to anything above it,
including the middleware that writes the access line at the end of the request.
Mutating a dict the child inherited *by reference* crosses the boundary in both
directions.

Each request gets its own dict, so there is no cross-talk between concurrent
requests, and the event loop is single-threaded, so the mutations need no lock.
Endpoints run in a threadpool inherit the same context (``run_in_threadpool``
copies it), which means the same dict object.
"""

from contextvars import ContextVar
from typing import Any

# Absent outside a request: startup, shutdown, background work, and tests that
# call a service directly. Readers must cope with None rather than assume a
# request is in flight.
_request_context: ContextVar[dict[str, Any] | None] = ContextVar(
    "siy_request_context", default=None
)

# Rendered in place of a missing id so every log line keeps the same shape.
UNKNOWN = "-"


def start_request_context(request_id: str) -> dict[str, Any]:
    """Seed a fresh context for one request and return it.

    The returned dict is the object later mutated by :func:`bind_user`; the
    caller holds it so it can read those mutations back after the response.
    """
    context: dict[str, Any] = {"request_id": request_id}
    _request_context.set(context)
    return context


def reset_request_context() -> None:
    """Clear the context. Only needed where a task outlives one request."""
    _request_context.set(None)


def current_context() -> dict[str, Any] | None:
    """The in-flight request's context, or None outside a request."""
    return _request_context.get()


def get_request_id() -> str | None:
    """Correlation id of the in-flight request, if there is one."""
    context = _request_context.get()
    return context.get("request_id") if context else None


def get_user_id() -> str | None:
    """Authenticated user of the in-flight request, if one has been bound."""
    context = _request_context.get()
    return context.get("user_id") if context else None


def bind_user(user_id: str) -> None:
    """Attach the authenticated user to this request.

    Called once per request from ``get_current_user``, so every log line and
    every Sentry event raised after authentication is attributable without any
    router having to pass the id around.
    """
    context = _request_context.get()
    if context is not None:
        context["user_id"] = user_id

    # Sentry is optional (no DSN in dev, and the SDK may not be installed at
    # all), so this must never be the thing that breaks a request.
    try:
        import sentry_sdk
    except ImportError:  # pragma: no cover - exercised only without the SDK
        return
    # Id only: send_default_pii is off precisely so email and IP stay here.
    sentry_sdk.set_user({"id": user_id})
