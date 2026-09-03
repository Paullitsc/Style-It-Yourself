"""Shared test fixtures.

Rate limiting is disabled for the suite by default. Without this, every test
that exercises a limited endpoint would consume real budget, and the Postgres
backend (unreachable in tests) would log a fallback error on each call. Tests
that actually exercise the limiter turn it back on explicitly.
"""

import pytest

from app.config import settings
from app.services import rate_limit as rate_limit_service


@pytest.fixture(autouse=True)
def _disable_rate_limiting(monkeypatch: pytest.MonkeyPatch):
    """Neutralize rate limiting unless a test opts back in."""
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", False)
    rate_limit_service._in_process.reset()
    yield
    rate_limit_service._in_process.reset()
