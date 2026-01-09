"""
Unit tests for outfits router.
"""
from datetime import datetime

import httpx
import pytest
from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from app.middleware.auth import get_current_user
from app.models.schemas import (
    OutfitCreate,
    OutfitResponse,
    OutfitSummary,
    User,
)
from app.routers import outfits as outfits_router
from app.routers.outfits import router, OutfitNotFoundError, OutfitPermissionError


pytestmark = pytest.mark.asyncio


# =============================================================================
# FIXTURES / HELPERS
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
# UNIT TESTS - create_outfit
# =============================================================================

async def test_create_outfit_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Successfully creates outfit."""
    user = _make_user()
    outfit_create = OutfitCreate(name="Summer Look", item_ids=["item-1", "item-2"])
    expected = _make_outfit_response(name="Summer Look")

    async def fake_create_outfit(user_id: str, outfit: OutfitCreate):
        assert user_id == user.id
        assert outfit.name == "Summer Look"
        return expected

    monkeypatch.setattr(outfits_router.supabase, "create_outfit", fake_create_outfit)

    response = await outfits_router.create_outfit(outfit_create, user)

    assert response.name == "Summer Look"
    assert response.id == "outfit-123"


async def test_create_outfit_validation_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """ValueError maps to 400."""
    user = _make_user()
    outfit_create = OutfitCreate(name="Test", item_ids=["item-1"])

    async def fake_create_outfit(user_id: str, outfit: OutfitCreate):
        raise ValueError("Invalid item IDs")

    monkeypatch.setattr(outfits_router.supabase, "create_outfit", fake_create_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.create_outfit(outfit_create, user)

    assert excinfo.value.status_code == status.HTTP_400_BAD_REQUEST


async def test_create_outfit_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    """Timeout maps to 503."""
    user = _make_user()
    outfit_create = OutfitCreate(name="Test", item_ids=["item-1"])

    async def fake_create_outfit(user_id: str, outfit: OutfitCreate):
        raise httpx.TimeoutException("timeout", request=httpx.Request("POST", "http://test"))

    monkeypatch.setattr(outfits_router.supabase, "create_outfit", fake_create_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.create_outfit(outfit_create, user)

    assert excinfo.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


async def test_create_outfit_unexpected_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unexpected errors map to 500."""
    user = _make_user()
    outfit_create = OutfitCreate(name="Test", item_ids=["item-1"])

    async def fake_create_outfit(user_id: str, outfit: OutfitCreate):
        raise RuntimeError("Database exploded")

    monkeypatch.setattr(outfits_router.supabase, "create_outfit", fake_create_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.create_outfit(outfit_create, user)

    assert excinfo.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "Database exploded" not in excinfo.value.detail


# =============================================================================
# UNIT TESTS - get_outfits
# =============================================================================

async def test_get_outfits_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Returns list of outfit summaries."""
    user = _make_user()
    expected = [
        _make_outfit_summary("outfit-1", "Work", 3),
        _make_outfit_summary("outfit-2", "Casual", 2),
    ]

    async def fake_get_user_outfits(user_id: str):
        assert user_id == user.id
        return expected

    monkeypatch.setattr(outfits_router.supabase, "get_user_outfits", fake_get_user_outfits)

    response = await outfits_router.get_outfits(user)

    assert len(response) == 2
    assert response[0].name == "Work"
    assert response[1].name == "Casual"


async def test_get_outfits_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """Returns empty list when no outfits."""
    user = _make_user()

    async def fake_get_user_outfits(user_id: str):
        return []

    monkeypatch.setattr(outfits_router.supabase, "get_user_outfits", fake_get_user_outfits)

    response = await outfits_router.get_outfits(user)

    assert response == []


# =============================================================================
# UNIT TESTS - get_outfit
# =============================================================================

async def test_get_outfit_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Returns outfit by ID."""
    user = _make_user()
    expected = _make_outfit_response()

    async def fake_get_outfit(outfit_id: str, user_id: str):
        assert outfit_id == "outfit-123"
        assert user_id == user.id
        return expected

    monkeypatch.setattr(outfits_router.supabase, "get_outfit", fake_get_outfit)

    response = await outfits_router.get_outfit("outfit-123", user)

    assert response.id == "outfit-123"


async def test_get_outfit_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """Returns 404 when outfit doesn't exist."""
    user = _make_user()

    async def fake_get_outfit(outfit_id: str, user_id: str):
        return None

    monkeypatch.setattr(outfits_router.supabase, "get_outfit", fake_get_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.get_outfit("nonexistent", user)

    assert excinfo.value.status_code == status.HTTP_404_NOT_FOUND


async def test_get_outfit_raises_not_found_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """OutfitNotFoundError maps to 404."""
    user = _make_user()

    async def fake_get_outfit(outfit_id: str, user_id: str):
        raise OutfitNotFoundError("Outfit does not exist")

    monkeypatch.setattr(outfits_router.supabase, "get_outfit", fake_get_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.get_outfit("nonexistent", user)

    assert excinfo.value.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in excinfo.value.detail.lower()


async def test_get_outfit_permission_denied(monkeypatch: pytest.MonkeyPatch) -> None:
    """OutfitPermissionError maps to 403."""
    user = _make_user()

    async def fake_get_outfit(outfit_id: str, user_id: str):
        raise OutfitPermissionError()

    monkeypatch.setattr(outfits_router.supabase, "get_outfit", fake_get_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.get_outfit("other-user-outfit", user)

    assert excinfo.value.status_code == status.HTTP_403_FORBIDDEN


# =============================================================================
# UNIT TESTS - delete_outfit
# =============================================================================

async def test_delete_outfit_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Successfully deletes outfit."""
    user = _make_user()

    async def fake_delete_outfit(outfit_id: str, user_id: str):
        assert outfit_id == "outfit-123"
        return True

    monkeypatch.setattr(outfits_router.supabase, "delete_outfit", fake_delete_outfit)

    await outfits_router.delete_outfit("outfit-123", user)


async def test_delete_outfit_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """Returns 404 when outfit doesn't exist."""
    user = _make_user()

    async def fake_delete_outfit(outfit_id: str, user_id: str):
        return False

    monkeypatch.setattr(outfits_router.supabase, "delete_outfit", fake_delete_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.delete_outfit("nonexistent", user)

    assert excinfo.value.status_code == status.HTTP_404_NOT_FOUND


async def test_delete_outfit_raises_not_found_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """OutfitNotFoundError maps to 404."""
    user = _make_user()

    async def fake_delete_outfit(outfit_id: str, user_id: str):
        raise OutfitNotFoundError()

    monkeypatch.setattr(outfits_router.supabase, "delete_outfit", fake_delete_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.delete_outfit("nonexistent", user)

    assert excinfo.value.status_code == status.HTTP_404_NOT_FOUND


async def test_delete_outfit_permission_denied(monkeypatch: pytest.MonkeyPatch) -> None:
    """OutfitPermissionError maps to 403."""
    user = _make_user()

    async def fake_delete_outfit(outfit_id: str, user_id: str):
        raise OutfitPermissionError()

    monkeypatch.setattr(outfits_router.supabase, "delete_outfit", fake_delete_outfit)

    with pytest.raises(HTTPException) as excinfo:
        await outfits_router.delete_outfit("other-user-outfit", user)

    assert excinfo.value.status_code == status.HTTP_403_FORBIDDEN


# =============================================================================
# INTEGRATION TESTS - HTTP layer
# =============================================================================

def test_post_outfits_returns_201(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/outfits returns 201."""
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


def test_get_outfits_returns_200(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits returns 200."""
    async def fake_get(user_id):
        return [_make_outfit_summary()]

    monkeypatch.setattr("app.routers.outfits.supabase.get_user_outfits", fake_get)

    response = client.get("/api/outfits")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_outfit_returns_200(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits/{id} returns 200."""
    async def fake_get(outfit_id, user_id):
        return _make_outfit_response(outfit_id=outfit_id)

    monkeypatch.setattr("app.routers.outfits.supabase.get_outfit", fake_get)

    response = client.get("/api/outfits/outfit-123")

    assert response.status_code == 200
    assert response.json()["id"] == "outfit-123"


def test_get_outfit_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits/{id} returns 404 when not found."""
    async def fake_get(outfit_id, user_id):
        return None

    monkeypatch.setattr("app.routers.outfits.supabase.get_outfit", fake_get)

    response = client.get("/api/outfits/nonexistent")

    assert response.status_code == 404


def test_get_outfit_returns_404_on_not_found_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits/{id} returns 404 when OutfitNotFoundError raised."""
    async def fake_get(outfit_id, user_id):
        raise OutfitNotFoundError()

    monkeypatch.setattr("app.routers.outfits.supabase.get_outfit", fake_get)

    response = client.get("/api/outfits/nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_outfit_returns_403_on_permission_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /api/outfits/{id} returns 403 when OutfitPermissionError raised."""
    async def fake_get(outfit_id, user_id):
        raise OutfitPermissionError()

    monkeypatch.setattr("app.routers.outfits.supabase.get_outfit", fake_get)

    response = client.get("/api/outfits/other-user-outfit")

    assert response.status_code == 403
    assert "permission" in response.json()["detail"].lower()


def test_delete_outfit_returns_204(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DELETE /api/outfits/{id} returns 204."""
    async def fake_delete(outfit_id, user_id):
        return True

    monkeypatch.setattr("app.routers.outfits.supabase.delete_outfit", fake_delete)

    response = client.delete("/api/outfits/outfit-123")

    assert response.status_code == 204
    assert response.content == b""


def test_delete_outfit_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DELETE /api/outfits/{id} returns 404 when not found."""
    async def fake_delete(outfit_id, user_id):
        return False

    monkeypatch.setattr("app.routers.outfits.supabase.delete_outfit", fake_delete)

    response = client.delete("/api/outfits/nonexistent")

    assert response.status_code == 404


def test_delete_outfit_returns_404_on_not_found_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DELETE /api/outfits/{id} returns 404 when OutfitNotFoundError raised."""
    async def fake_delete(outfit_id, user_id):
        raise OutfitNotFoundError()

    monkeypatch.setattr("app.routers.outfits.supabase.delete_outfit", fake_delete)

    response = client.delete("/api/outfits/nonexistent")

    assert response.status_code == 404


def test_delete_outfit_returns_403_on_permission_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DELETE /api/outfits/{id} returns 403 when OutfitPermissionError raised."""
    async def fake_delete(outfit_id, user_id):
        raise OutfitPermissionError()

    monkeypatch.setattr("app.routers.outfits.supabase.delete_outfit", fake_delete)

    response = client.delete("/api/outfits/other-user-outfit")

    assert response.status_code == 403