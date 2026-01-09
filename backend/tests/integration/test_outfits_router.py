"""
Integration tests for outfits router - HTTP endpoint testing.
"""
from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.auth import get_current_user
from app.models.schemas import (
    OutfitResponse,
    OutfitSummary,
    User,
)
from app.routers.outfits import router, OutfitNotFoundError, OutfitPermissionError


# =============================================================================
# HELPERS
# =============================================================================

def _make_user(user_id: str = "test-user-123") -> User:
    """Create a test user."""
    return User(id=user_id, email="test@example.com", name="Test User")


def _make_outfit_response(
    outfit_id: str = "outfit-123",
    user_id: str = "test-user-123",
    name: str = "Test Outfit",
) -> OutfitResponse:
    """Create an OutfitResponse."""
    return OutfitResponse(
        id=outfit_id,
        user_id=user_id,
        name=name,
        items=[],
        generated_image_url=None,
        created_at=datetime(2024, 1, 1, 12, 0, 0),
    )


def _make_outfit_summary(
    outfit_id: str = "outfit-123",
    name: str = "Test Outfit",
    item_count: int = 2,
) -> OutfitSummary:
    """Create an OutfitSummary."""
    return OutfitSummary(
        id=outfit_id,
        name=name,
        item_count=item_count,
        thumbnail_url=None,
        created_at=datetime(2024, 1, 1, 12, 0, 0),
    )


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def test_user() -> User:
    """Test user fixture."""
    return _make_user()


@pytest.fixture
def app(test_user: User) -> FastAPI:
    """Create test app with auth override."""
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: test_user
    return app


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """Test client fixture."""
    return TestClient(app)


# =============================================================================
# POST /api/outfits
# =============================================================================

def test_post_outfits_returns_201(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/outfits returns 201 on success."""
    async def fake_create(user_id, outfit):
        return _make_outfit_response(name=outfit.name)

    monkeypatch.setattr("app.routers.outfits.supabase.create_outfit", fake_create)

    response = client.post(
        "/api/outfits",
        json={"name": "New Outfit", "item_ids": ["item-1"]},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "New Outfit"


def test_post_outfits_empty_items_returns_422(client: TestClient) -> None:
    """POST /api/outfits with empty item_ids returns 422."""
    response = client.post(
        "/api/outfits",
        json={"name": "Test", "item_ids": []},
    )

    assert response.status_code == 422


def test_post_outfits_missing_name_returns_422(client: TestClient) -> None:
    """POST /api/outfits without name returns 422."""
    response = client.post(
        "/api/outfits",
        json={"item_ids": ["item-1"]},
    )

    assert response.status_code == 422


def test_post_outfits_server_error_returns_500(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/outfits returns 500 on unexpected error."""
    async def fake_create(user_id, outfit):
        raise RuntimeError("Database error")

    monkeypatch.setattr("app.routers.outfits.supabase.create_outfit", fake_create)

    response = client.post(
        "/api/outfits",
        json={"name": "Test", "item_ids": ["item-1"]},
    )

    assert response.status_code == 500
    assert "Database error" not in response.json()["detail"]


# =============================================================================
# GET /api/outfits
# =============================================================================

def test_get_outfits_returns_200(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits returns 200 with list."""
    async def fake_get(user_id):
        return [
            _make_outfit_summary("outfit-1", "Work"),
            _make_outfit_summary("outfit-2", "Casual"),
        ]

    monkeypatch.setattr("app.routers.outfits.supabase.get_user_outfits", fake_get)

    response = client.get("/api/outfits")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Work"
    assert data[1]["name"] == "Casual"


def test_get_outfits_empty_returns_200(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits returns 200 with empty list."""
    async def fake_get(user_id):
        return []

    monkeypatch.setattr("app.routers.outfits.supabase.get_user_outfits", fake_get)

    response = client.get("/api/outfits")

    assert response.status_code == 200
    assert response.json() == []


# =============================================================================
# GET /api/outfits/{outfit_id}
# =============================================================================

def test_get_outfit_returns_200(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits/{id} returns 200 on success."""
    async def fake_get(outfit_id, user_id):
        return _make_outfit_response(outfit_id=outfit_id)

    monkeypatch.setattr("app.routers.outfits.supabase.get_outfit", fake_get)

    response = client.get("/api/outfits/outfit-123")

    assert response.status_code == 200
    assert response.json()["id"] == "outfit-123"


def test_get_outfit_none_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits/{id} returns 404 when not found."""
    async def fake_get(outfit_id, user_id):
        return None

    monkeypatch.setattr("app.routers.outfits.supabase.get_outfit", fake_get)

    response = client.get("/api/outfits/nonexistent")

    assert response.status_code == 404


def test_get_outfit_not_found_error_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits/{id} returns 404 on OutfitNotFoundError."""
    async def fake_get(outfit_id, user_id):
        raise OutfitNotFoundError()

    monkeypatch.setattr("app.routers.outfits.supabase.get_outfit", fake_get)

    response = client.get("/api/outfits/nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_outfit_permission_error_returns_403(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits/{id} returns 403 on OutfitPermissionError."""
    async def fake_get(outfit_id, user_id):
        raise OutfitPermissionError()

    monkeypatch.setattr("app.routers.outfits.supabase.get_outfit", fake_get)

    response = client.get("/api/outfits/other-user-outfit")

    assert response.status_code == 403
    assert "permission" in response.json()["detail"].lower()


# =============================================================================
# DELETE /api/outfits/{outfit_id}
# =============================================================================

def test_delete_outfit_returns_204(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DELETE /api/outfits/{id} returns 204 on success."""
    async def fake_delete(outfit_id, user_id):
        return True

    monkeypatch.setattr("app.routers.outfits.supabase.delete_outfit", fake_delete)

    response = client.delete("/api/outfits/outfit-123")

    assert response.status_code == 204
    assert response.content == b""


def test_delete_outfit_false_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DELETE /api/outfits/{id} returns 404 when not found."""
    async def fake_delete(outfit_id, user_id):
        return False

    monkeypatch.setattr("app.routers.outfits.supabase.delete_outfit", fake_delete)

    response = client.delete("/api/outfits/nonexistent")

    assert response.status_code == 404


def test_delete_outfit_not_found_error_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DELETE /api/outfits/{id} returns 404 on OutfitNotFoundError."""
    async def fake_delete(outfit_id, user_id):
        raise OutfitNotFoundError()

    monkeypatch.setattr("app.routers.outfits.supabase.delete_outfit", fake_delete)

    response = client.delete("/api/outfits/nonexistent")

    assert response.status_code == 404


def test_delete_outfit_permission_error_returns_403(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DELETE /api/outfits/{id} returns 403 on OutfitPermissionError."""
    async def fake_delete(outfit_id, user_id):
        raise OutfitPermissionError()

    monkeypatch.setattr("app.routers.outfits.supabase.delete_outfit", fake_delete)

    response = client.delete("/api/outfits/other-user-outfit")

    assert response.status_code == 403