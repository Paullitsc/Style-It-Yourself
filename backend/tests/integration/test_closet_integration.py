"""
Integration tests for closet router - tests full HTTP request/response cycle.
"""
from datetime import datetime
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from typing import AsyncGenerator

from app.middleware import get_current_user
from app.models.schemas import (
    ClothingItemResponse,
    ClosetResponse,
    Color,
    HSL,
    Category,
    OutfitSummary,
    User,
)
from app.routers.closet import router


pytestmark = pytest.mark.asyncio


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def test_user() -> User:
    """Test user for dependency override."""
    return User(id="test-user-123", email="test@example.com", name="Test User")


@pytest.fixture
def app(test_user: User) -> FastAPI:
    """Create test FastAPI app with closet router."""
    app = FastAPI()
    app.include_router(router)

    # Override auth dependency
    app.dependency_overrides[get_current_user] = lambda: test_user

    return app


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """Sync test client."""
    return TestClient(app)


@pytest.fixture
async def async_client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Async test client for async tests."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


def _make_closet_response() -> ClosetResponse:
    """Create sample closet response."""
    items = [
        ClothingItemResponse(
            id="item-1",
            user_id="test-user-123",
            image_url="https://example.com/shirt.jpg",
            created_at=datetime(2024, 1, 1),
            color=Color(
                hex="#1E3A5F",
                hsl=HSL(h=210, s=50, l=30),
                name="navy",
                is_neutral=True,
            ),
            category=Category(l1="Tops", l2="T-Shirts"),
            formality=2.5,
            aesthetics=["Minimalist"],
        ),
        ClothingItemResponse(
            id="item-2",
            user_id="test-user-123",
            image_url="https://example.com/jeans.jpg",
            created_at=datetime(2024, 1, 2),
            color=Color(
                hex="#2E4057",
                hsl=HSL(h=215, s=30, l=26),
                name="indigo",
                is_neutral=False,
            ),
            category=Category(l1="Bottoms", l2="Jeans"),
            formality=2.0,
            aesthetics=["Classic"],
        ),
    ]

    outfits = [
        OutfitSummary(
            id="outfit-1",
            name="Casual Friday",
            item_count=3,
            thumbnail_url="https://example.com/thumb.jpg",
            created_at=datetime(2024, 1, 5),
        ),
    ]

    return ClosetResponse(
        items_by_category={
            "Tops": [items[0]],
            "Bottoms": [items[1]],
        },
        outfits=outfits,
        total_items=2,
        total_outfits=1,
    )


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

def test_get_closet_returns_200_with_valid_response(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/closet returns 200 with properly structured response."""
    mock_closet = _make_closet_response()

    async def fake_get_closet(user_id: str) -> ClosetResponse:
        return mock_closet

    monkeypatch.setattr(
        "app.routers.closet.get_closet_from_db",
        fake_get_closet,
    )

    response = client.get("/api/closet")

    assert response.status_code == 200
    data = response.json()
    assert data["total_items"] == 2
    assert data["total_outfits"] == 1
    assert "Tops" in data["items_by_category"]
    assert "Bottoms" in data["items_by_category"]
    assert len(data["outfits"]) == 1
    assert data["outfits"][0]["name"] == "Casual Friday"


def test_get_closet_empty_closet(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/closet returns 200 with empty closet."""
    async def fake_get_closet(user_id: str) -> ClosetResponse:
        return ClosetResponse(
            items_by_category={},
            outfits=[],
            total_items=0,
            total_outfits=0,
        )

    monkeypatch.setattr(
        "app.routers.closet.get_closet_from_db",
        fake_get_closet,
    )

    response = client.get("/api/closet")

    assert response.status_code == 200
    data = response.json()
    assert data["total_items"] == 0
    assert data["total_outfits"] == 0
    assert data["items_by_category"] == {}
    assert data["outfits"] == []


def test_get_closet_timeout_returns_503(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/closet returns 503 on timeout."""
    import httpx

    async def fake_get_closet(user_id: str) -> ClosetResponse:
        raise httpx.TimeoutException(
            "timeout",
            request=httpx.Request("GET", "https://example.com"),
        )

    monkeypatch.setattr(
        "app.routers.closet.get_closet_from_db",
        fake_get_closet,
    )

    response = client.get("/api/closet")

    assert response.status_code == 503
    assert response.json()["detail"] == "Closet service timed out."


def test_get_closet_validation_error_returns_400(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/closet returns 400 on validation error."""
    async def fake_get_closet(user_id: str) -> ClosetResponse:
        raise ValueError("Invalid user_id format")

    monkeypatch.setattr(
        "app.routers.closet.get_closet_from_db",
        fake_get_closet,
    )

    response = client.get("/api/closet")

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid user_id format"


def test_get_closet_unexpected_error_returns_502(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/closet returns 502 on unexpected error."""
    async def fake_get_closet(user_id: str) -> ClosetResponse:
        raise RuntimeError("Database connection lost")

    monkeypatch.setattr(
        "app.routers.closet.get_closet_from_db",
        fake_get_closet,
    )

    response = client.get("/api/closet")

    assert response.status_code == 502
    assert response.json()["detail"] == "Failed to get Closet."


def test_get_closet_requires_authentication(monkeypatch: pytest.MonkeyPatch) -> None:
    """GET /api/closet returns 401 without authentication."""
    # Create app WITHOUT dependency override
    app = FastAPI()
    app.include_router(router)

    # Mock the auth to raise 401
    from fastapi import HTTPException

    def fake_auth_failure():
        raise HTTPException(status_code=401, detail="Not authenticated")

    app.dependency_overrides[get_current_user] = fake_auth_failure

    client = TestClient(app)
    response = client.get("/api/closet")

    assert response.status_code == 401
