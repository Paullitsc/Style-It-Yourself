"""Correlation id per request, plus the one access line that carries it.

A failed try-on emits lines from the router, ``services/gemini.py``, and
``services/supabase.py``. Before this there was nothing tying them to each
other, to the user, or to the response the caller actually saw -- which is
precisely the situation you are in when someone reports that try-on failed
twenty minutes ago.

This middleware stamps every request with an id, threads it through the logging
context so every line above picks it up automatically, echoes it back in the
``X-Request-ID`` response header so a user can quote it, and closes the request
with a single structured access line.

Written as raw ASGI rather than ``BaseHTTPMiddleware`` on purpose:

- ``BaseHTTPMiddleware`` runs the rest of the app in a child task, which is the
  boundary that makes the mutable context dict in ``observability/context.py``
  necessary. Adding a second such hop here would cost latency for nothing.
- It has to wrap ``send`` to attach the header to *every* response, including
  the 429 that ``IPRateLimitMiddleware`` returns without ever calling the app.
"""

import logging
from time import monotonic
from uuid import uuid4

from starlette.datastructures import MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.middleware.rate_limit import get_client_ip
from app.observability.context import start_request_context
from app.observability.logging_config import ACCESS_LOGGER_NAME

logger = logging.getLogger(ACCESS_LOGGER_NAME)

REQUEST_ID_HEADER = "X-Request-ID"

# Cloud Run sets this on every inbound request as ``TRACE_ID/SPAN_ID;o=1``.
# Adopting its trace id as our correlation id means our lines and Cloud Run's
# own request log describe the same request under the same identifier.
CLOUD_TRACE_HEADER = "X-Cloud-Trace-Context"

# Liveness probes and the metadata root hit constantly (Docker's healthcheck
# every 30s, plus whatever uptime monitoring is pointed at them) and say
# nothing. Logged at DEBUG so they stay visible when explicitly wanted.
_QUIET_PATHS = frozenset({"/health", "/"})

# An inbound id is caller-supplied and ends up in log lines and a response
# header, so it is constrained rather than trusted: no newlines to forge log
# records with, and no unbounded length.
_ID_ALLOWED = frozenset(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
)
_MAX_ID_LENGTH = 64


def _sanitize(raw: str) -> str:
    """Reduce a caller-supplied id to safe characters, or "" if nothing is left."""
    return "".join(c for c in raw if c in _ID_ALLOWED)[:_MAX_ID_LENGTH]


def resolve_request_id(request: Request) -> str:
    """Correlation id for this request.

    Prefers an id the caller already knows (so a client, or an upstream proxy,
    can correlate its own logs with ours), then Cloud Run's trace id, and
    otherwise mints one.
    """
    incoming = _sanitize(request.headers.get(REQUEST_ID_HEADER, ""))
    if incoming:
        return incoming

    trace = request.headers.get(CLOUD_TRACE_HEADER, "")
    if trace:
        trace_id = _sanitize(trace.split("/")[0])
        if trace_id:
            return trace_id

    return uuid4().hex


def _access_level(status_code: int, path: str) -> int:
    if status_code >= 500:
        return logging.ERROR
    if status_code >= 400:
        return logging.WARNING
    if path in _QUIET_PATHS:
        return logging.DEBUG
    return logging.INFO


class RequestContextMiddleware:
    """Assign a correlation id, then log the request that used it."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        request_id = resolve_request_id(request)
        context = start_request_context(request_id)

        # Deliberately not reset afterwards. The ASGI server runs each request
        # in its own task, so the context dies with it; clearing it here would
        # instead strip the id from the traceback uvicorn logs *after* an
        # unhandled exception propagates back out of this middleware.

        method = scope.get("method", "")
        path = scope.get("path", "")
        client_ip = get_client_ip(request)
        started = monotonic()
        # Only overwritten once the response starts. If it never does we left
        # through the except branch below, which is a 500 by definition.
        status_code = 500

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception as exc:
            _log_access(
                method=method,
                path=path,
                status_code=status_code,
                started=started,
                client_ip=client_ip,
                context=context,
                error=type(exc).__name__,
            )
            raise
        else:
            _log_access(
                method=method,
                path=path,
                status_code=status_code,
                started=started,
                client_ip=client_ip,
                context=context,
            )


def _log_access(
    *,
    method: str,
    path: str,
    status_code: int,
    started: float,
    client_ip: str,
    context: dict,
    error: str | None = None,
) -> None:
    """Emit the request's one access line.

    ``user_id`` is read from the context dict rather than a ContextVar because
    ``get_current_user`` binds it below a ``BaseHTTPMiddleware`` boundary; see
    ``observability/context.py``. The query string is left out on purpose --
    it is user-supplied and can carry identifiers we have no reason to persist.
    """
    duration_ms = round((monotonic() - started) * 1000, 1)
    # request_id and user_id are also stamped on every record by ContextFilter.
    # Passed explicitly here because on this one line they are the payload
    # rather than decoration, and the record should carry them even if it
    # reaches a handler wired up without the filter.
    details = {
        "request_id": context.get("request_id"),
        "method": method,
        "path": path,
        "status": status_code,
        "duration_ms": duration_ms,
        "client_ip": client_ip,
    }
    user_id = context.get("user_id")
    if user_id:
        details["user_id"] = user_id
    if error:
        details["error"] = error

    logger.log(
        _access_level(status_code, path),
        "%s %s %s %sms",
        method,
        path,
        status_code,
        duration_ms,
        extra=details,
    )
