"""Unit tests for Sentry initialization.

`sentry_sdk.init` is monkeypatched throughout: these tests assert the arguments
we pass, and must never open a transport. Two of the assertions are about
privacy rather than mechanics -- these endpoints carry bearer tokens, email
addresses, and full-body photographs, and none of that is Sentry's to hold.
"""

import logging
import sys

import pytest
import sentry_sdk
from sentry_sdk.integrations import logging as sentry_logging

from app.config import settings
from app.observability import context as ctx
from app.observability.logging_config import ACCESS_LOGGER_NAME
from app.observability.sentry import _before_send, init_sentry

DSN = "https://public@o0.ingest.sentry.io/1"


# =============================================================================
# HELPERS
# =============================================================================

@pytest.fixture
def init_kwargs(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Capture what init_sentry would have passed to the SDK."""
    captured: dict = {}
    monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: captured.update(kwargs))
    return captured


@pytest.fixture
def configured(monkeypatch: pytest.MonkeyPatch):
    """A DSN present, as in production."""
    monkeypatch.setattr(settings, "SENTRY_DSN", DSN)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")


@pytest.fixture
def in_request():
    ctx.start_request_context("req-abc")
    yield
    ctx.reset_request_context()


# =============================================================================
# ENABLEMENT
# =============================================================================

def test_no_dsn_means_no_sentry(init_kwargs, monkeypatch, caplog) -> None:
    """The default in development and in tests: no DSN, no network calls."""
    caplog.set_level(logging.INFO)
    monkeypatch.setattr(settings, "SENTRY_DSN", "")

    init_sentry()

    assert init_kwargs == {}
    assert "Sentry disabled" in caplog.text


def test_blank_dsn_is_not_a_dsn(monkeypatch) -> None:
    monkeypatch.setattr(settings, "SENTRY_DSN", "   ")
    assert settings.sentry_enabled is False


def test_a_dsn_enables_reporting(configured, init_kwargs) -> None:
    init_sentry()

    assert init_kwargs["dsn"] == DSN
    assert init_kwargs["environment"] == "production"
    assert init_kwargs["release"] == f"siy-api@{settings.app_version}"


def test_a_missing_sdk_does_not_stop_the_app(configured, monkeypatch, caplog) -> None:
    """Observability is never allowed to be the reason the API fails to boot."""
    # A None entry in sys.modules makes `import sentry_sdk` raise ImportError.
    monkeypatch.setitem(sys.modules, "sentry_sdk", None)

    init_sentry()

    assert "sentry-sdk is not installed" in caplog.text


# =============================================================================
# PRIVACY DEFAULTS
# =============================================================================

def test_request_bodies_are_never_captured(configured, init_kwargs) -> None:
    """Uploads here are photographs of people."""
    init_sentry()

    assert init_kwargs["max_request_body_size"] == "never"


def test_pii_is_off(configured, init_kwargs) -> None:
    init_sentry()

    assert init_kwargs["send_default_pii"] is False


def test_users_are_identified_by_id_alone(monkeypatch) -> None:
    captured: list = []
    monkeypatch.setattr(sentry_sdk, "set_user", captured.append)

    ctx.bind_user("user-7")

    assert captured == [{"id": "user-7"}]


# =============================================================================
# TRACING
# =============================================================================

def test_tracing_is_off_by_default(configured, init_kwargs, monkeypatch) -> None:
    """0 would still build traces and sample none; None builds none at all."""
    monkeypatch.setattr(settings, "SENTRY_TRACES_SAMPLE_RATE", 0.0)

    init_sentry()

    assert init_kwargs["traces_sample_rate"] is None


def test_tracing_honors_a_configured_rate(configured, init_kwargs, monkeypatch) -> None:
    monkeypatch.setattr(settings, "SENTRY_TRACES_SAMPLE_RATE", 0.25)

    init_sentry()

    assert init_kwargs["traces_sample_rate"] == 0.25


# =============================================================================
# EVENT SHAPING
# =============================================================================

def test_events_are_tagged_with_the_request(in_request) -> None:
    """The tag is what joins an issue to the log lines from the same request."""
    event = _before_send({}, {})

    assert event["tags"]["request_id"] == "req-abc"


def test_events_raised_outside_a_request_are_left_alone() -> None:
    assert _before_send({}, {}) == {}


def test_existing_tags_survive(in_request) -> None:
    event = _before_send({"tags": {"kept": "yes"}}, {})

    assert event["tags"] == {"kept": "yes", "request_id": "req-abc"}


def test_the_access_line_does_not_file_its_own_issue(
    configured, init_kwargs, monkeypatch
) -> None:
    """A 5xx logs an ERROR access line too; without this it files two issues."""
    ignored: list[str] = []
    monkeypatch.setattr(sentry_logging, "ignore_logger", ignored.append)

    init_sentry()

    assert ACCESS_LOGGER_NAME in ignored
