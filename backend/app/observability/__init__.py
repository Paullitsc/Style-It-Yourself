"""Observability: logging configuration, request correlation, error reporting.

``app/main.py`` calls :func:`configure_logging` and :func:`init_sentry` at
import time; ``RequestContextMiddleware`` seeds the per-request context; and
``get_current_user`` calls :func:`bind_user` once a token verifies. Nothing
else needs to know this package exists -- the existing
``logging.getLogger(__name__)`` call sites pick up the format, the level, and
the correlation id without being touched.
"""

from app.observability.context import (
    bind_user,
    current_context,
    get_request_id,
    get_user_id,
    reset_request_context,
    start_request_context,
)
from app.observability.logging_config import ACCESS_LOGGER_NAME, configure_logging
from app.observability.sentry import init_sentry

__all__ = [
    "ACCESS_LOGGER_NAME",
    "bind_user",
    "configure_logging",
    "current_context",
    "get_request_id",
    "get_user_id",
    "init_sentry",
    "reset_request_context",
    "start_request_context",
]
