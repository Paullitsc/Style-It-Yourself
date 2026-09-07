"""Sentry error reporting.

Until now an unhandled exception in production went to stdout and notified
nobody. This wires up the SDK so it does, and does it without any change to the
33 existing ``logger.error(...)`` call sites: the SDK's default
``LoggingIntegration`` turns every ``ERROR`` record into an issue, which covers
the handled-then-logged failures (a Gemini call that exhausted its retries, a
Supabase timeout) that never reach an exception handler at all.

Design choices worth knowing:

- **No DSN means no Sentry.** That is the default in development and in tests:
  no network calls, no noise, no accidental reporting from a laptop.
- **``send_default_pii=False`` and ``max_request_body_size="never"``.** These
  endpoints carry bearer tokens, email addresses, and full-body photographs.
  None of that should leave the service, so bodies are never captured and the
  user is identified by id alone (see ``bind_user`` in ``context.py``).
- **Tracing off by default.** ``SENTRY_TRACES_SAMPLE_RATE`` defaults to 0,
  which keeps the free tier comfortable. Worth knowing before turning it up:
  the SDK auto-enables integrations for whatever it finds installed, google-genai
  included, so tracing starts recording spans around the Gemini calls (their
  timing and model, not their prompts, which stay behind send_default_pii).
- **The import is soft.** Observability must never be the reason the API fails
  to boot, so a missing ``sentry-sdk`` degrades to a warning.
"""

import logging
from typing import Any

from app.config import settings
from app.observability.context import get_request_id
from app.observability.logging_config import ACCESS_LOGGER_NAME

logger = logging.getLogger(__name__)


def _before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any]:
    """Tag each event with the request it came from.

    The tag is what makes an issue joinable to the logs: copy the request id
    out of Sentry, grep it in Cloud Logging, get every line from that request.
    """
    request_id = get_request_id()
    if request_id:
        event.setdefault("tags", {})["request_id"] = request_id
    return event


def init_sentry() -> None:
    """Initialize error reporting, if a DSN is configured.

    Called at import time from ``app/main.py``, before the ``FastAPI`` object
    exists: the SDK's Starlette integration patches
    ``Starlette.build_middleware_stack``, so initializing after the app is
    constructed would leave the app unpatched.
    """
    if not settings.sentry_enabled:
        logger.info(
            "Sentry disabled (no SENTRY_DSN); errors go to logs only",
            extra={"environment": settings.ENVIRONMENT},
        )
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.logging import ignore_logger
    except ImportError:
        logger.warning(
            "SENTRY_DSN is set but sentry-sdk is not installed; "
            "error reporting is off. Install it: pip install -r requirements.txt"
        )
        return

    # The per-request access line is already an ERROR on a 5xx, and the
    # exception that caused it is reported separately. Without this a single
    # failed request files two issues. (Uvicorn's re-raise of the same
    # exception is collapsed by the SDK's default dedupe integration.)
    ignore_logger(ACCESS_LOGGER_NAME)

    rate = settings.SENTRY_TRACES_SAMPLE_RATE
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN.strip(),
        environment=settings.ENVIRONMENT,
        release=f"siy-api@{settings.app_version}",
        # 0 would still build traces and merely sample none of them; None turns
        # the tracing machinery off outright, which is what we want by default.
        traces_sample_rate=rate if rate > 0 else None,
        send_default_pii=False,
        max_request_body_size="never",
        before_send=_before_send,
    )
    logger.info(
        "Sentry initialized",
        extra={
            "environment": settings.ENVIRONMENT,
            "traces_sample_rate": rate,
        },
    )
