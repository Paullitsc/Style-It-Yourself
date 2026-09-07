"""The logging configuration the application never had.

Every router and service already holds a ``logging.getLogger(__name__)``, but
until now nothing set a level, a format, or a handler, so all of it inherited
uvicorn's defaults. On Cloud Run that has a concrete cost: stdout arrives at
Cloud Logging as unparsed text at a single default severity, so an ``ERROR``
and a ``DEBUG`` look identical, cannot be filtered, and cannot be alerted on.

:func:`configure_logging` installs one stdout handler on the root logger with:

- a level chosen per environment (``settings.log_level``),
- a JSON formatter in production, whose ``severity`` and ``message`` keys are
  exactly what Cloud Logging lifts out of a JSON line, and a human-readable one
  in development,
- a filter that stamps every record with the in-flight request's correlation id.

It also takes over uvicorn's own loggers, so server messages share the format
instead of arriving alongside it in a different one.

Called at import time from ``app/main.py`` rather than from the lifespan hook:
uvicorn configures its loggers in ``Config.__init__`` and only imports the app
afterwards, so configuring at import wins that race, while lifespan runs later
still and would leave every record emitted during import and app construction
unformatted.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.observability.context import UNKNOWN, current_context

# Logger for the one access line per request emitted by
# ``app/middleware/request_context.py``. Named here because Sentry needs to
# know it (see app/observability/sentry.py) and the middleware needs to use it.
ACCESS_LOGGER_NAME = "app.access"

# Marks the handler this module owns, so reconfiguring replaces it instead of
# stacking a second copy, and so we never rip out handlers we did not install
# (pytest's caplog attaches its own to the root logger).
_HANDLER_NAME = "siy"

# Attributes every LogRecord carries. Anything outside this set arrived via
# ``logger.info(..., extra={...})`` and belongs in the JSON payload.
_STANDARD_RECORD_ATTRS = frozenset(
    {
        "args", "asctime", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelname", "levelno", "lineno", "message", "module",
        "msecs", "msg", "name", "pathname", "process", "processName",
        "relativeCreated", "stack_info", "taskName", "thread", "threadName",
    }
)

# Fields the ContextFilter adds. Real data, but promoted to top-level keys
# rather than dumped in with the caller's extras.
_CONTEXT_ATTRS = frozenset({"request_id", "user_id"})

# Extras worth discarding rather than serializing. Uvicorn attaches
# color_message to its startup records: the same text again, wrapped in ANSI
# escapes, which is noise in a log aggregator.
_DROPPED_RECORD_ATTRS = frozenset({"color_message"})

# Chatty at DEBUG and never what anyone is debugging: httpx logs a line per
# outbound call (we make several per try-on), h2/hpack log frame-level detail,
# python-multipart logs per-chunk during image uploads, and asyncio announces
# its event loop selector on every startup.
_NOISY_LOGGERS = (
    "asyncio",
    "httpx",
    "httpcore",
    "hpack",
    "h2",
    "urllib3",
    "multipart",
    "python_multipart",
)

_configured = False


class ContextFilter(logging.Filter):
    """Stamp each record with the in-flight request's correlation ids.

    Attached to the handler rather than to a logger, so it reaches records from
    every logger in the process including uvicorn's and third-party ones.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        context = current_context() or {}
        record.request_id = context.get("request_id", UNKNOWN)
        record.user_id = context.get("user_id", UNKNOWN)
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line, shaped for Cloud Logging.

    ``severity`` and ``message`` are the two keys Cloud Logging interprets:
    severity drives the level shown in the console and the log-based alerts,
    message becomes the collapsed summary. Everything else is preserved under
    ``jsonPayload`` and remains queryable.
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "severity": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", UNKNOWN),
        }

        user_id = getattr(record, "user_id", UNKNOWN)
        if user_id != UNKNOWN:
            payload["user_id"] = user_id

        # Whatever the call site passed as extra={...}, merged in at the top
        # level so it is queryable in Cloud Logging without string parsing.
        for key, value in record.__dict__.items():
            if (
                key not in _STANDARD_RECORD_ATTRS
                and key not in _CONTEXT_ATTRS
                and key not in _DROPPED_RECORD_ATTRS
            ):
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)

        # default=str so an unserializable extra degrades to its repr rather
        # than raising inside the logging call and losing the record entirely.
        return json.dumps(payload, default=str)


class ConsoleFormatter(logging.Formatter):
    """Human-readable single line for local development."""

    def __init__(self) -> None:
        super().__init__(
            fmt="%(asctime)s %(levelname)-8s %(name)s [%(request_id)s] %(message)s",
            datefmt="%H:%M:%S",
        )

    def format(self, record: logging.LogRecord) -> str:
        # The filter normally supplies these. Defaulting here keeps the
        # formatter usable on a bare record (a direct unit test, a handler
        # someone wires up without the filter) instead of raising KeyError.
        if not hasattr(record, "request_id"):
            record.request_id = UNKNOWN
        return super().format(record)


def build_formatter(log_format: str) -> logging.Formatter:
    """Formatter for ``"json"`` or ``"console"``; unknown names fall back to JSON."""
    return ConsoleFormatter() if log_format == "console" else JsonFormatter()


def configure_logging(
    level: str | None = None,
    log_format: str | None = None,
    *,
    force: bool = False,
) -> None:
    """Install the application's logging configuration. Idempotent.

    Arguments override ``settings``; they exist for tests, which need to assert
    both formats without mutating global config.
    """
    global _configured
    if _configured and not force:
        return

    requested_level = (level or settings.log_level).upper()
    resolved_level = logging.getLevelName(requested_level)
    # A typo in LOG_LEVEL must not be the thing that stops the API booting.
    unusable_level = None if isinstance(resolved_level, int) else requested_level
    if unusable_level is not None:
        resolved_level = logging.INFO

    log_format = log_format or settings.log_format

    handler = logging.StreamHandler(sys.stdout)
    handler.set_name(_HANDLER_NAME)
    handler.setFormatter(build_formatter(log_format))
    handler.addFilter(ContextFilter())

    root = logging.getLogger()
    # Drop only our own previous handler. Clearing the list wholesale would
    # also remove handlers other people own -- pytest's caplog, most visibly.
    for existing in [h for h in root.handlers if h.get_name() == _HANDLER_NAME]:
        root.removeHandler(existing)
    root.addHandler(handler)
    root.setLevel(resolved_level)

    _take_over_uvicorn_loggers()

    for name in _NOISY_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)

    _configured = True

    if unusable_level is not None:
        # Logged only now that the handler exists, so the warning is visible.
        logging.getLogger(__name__).warning(
            "Unknown log level %r; falling back to INFO", unusable_level
        )


def _take_over_uvicorn_loggers() -> None:
    """Route uvicorn's output through our handler, and retire its access log.

    Uvicorn installs its own handlers with ``propagate = False``, so without
    this its startup lines and tracebacks arrive in uvicorn's format next to
    everything else in ours. ``uvicorn.access`` is disabled outright because
    ``RequestContextMiddleware`` emits a richer line for the same request --
    one carrying the correlation id, the duration, and the user -- and two
    lines per request is one too many.
    """
    for name in ("uvicorn", "uvicorn.error", "uvicorn.asgi"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True
        # NOTSET so the root level governs, rather than uvicorn's own choice.
        logger.setLevel(logging.NOTSET)

    access = logging.getLogger("uvicorn.access")
    access.handlers.clear()
    access.propagate = False
    access.disabled = True
