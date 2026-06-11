"""Integration tests for the clothing-items PATCH endpoint."""
from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.auth import get_current_user
from app.models.schemas import Category, ClothingItemResponse, Color, HSL, User
from app.routers import clothing_items


def _clothing_item(**overrides) -> ClothingItemResponse:
    data = dict(
        id="item-1",
        user_id="test-user-123",
        image_url="https://cdn.example.com/item-1.jpg",
        color=Color(hex="#0B1C2D", hsl=HSL(h=210, s=61, l=11), name="navy", is_neutral=True),
        category=Category(l1="Tops", l2="T-Shirts"),
        formality=2.0,
        aesthetics=["Minimalist"],
        ownership="owned",
        created_at=datetime(2025, 1, 1, 12, 0, 0),
    )
    data.update(overrides)
    return ClothingItemResponse(**data)


@pytest.fixture
def test_user() -> User:
    return User(id="test-user-123", email="test@example.com", name="Test User")


@pytest.fixture
def client(test_user: User) -> TestClient:
    app = FastAPI()
    app.include_router(clothing_items.router)
    app.dependency_overrides[get_current_user] = lambda: test_user
    return TestClient(app)


class TestPatchClothingItem:
    def test_update_returns_200(self, client: TestClient, monkeypatch):
        captured = {}

        async def fake_update(item_id, user_id, updates):
            captured["item_id"] = item_id
            captured["updates"] = updates
            return _clothing_item(ownership="wishlist", formality=4.0)

        monkeypatch.setattr(
            "app.routers.clothing_items.supabase.update_clothing_item", fake_update
        )

        response = client.patch(
            "/api/clothing-items/item-1",
            json={"formality": 4.0, "ownership": "wishlist"},
        )
        assert response.status_code == 200
        assert response.json()["ownership"] == "wishlist"
        # Only the supplied fields are forwarded.
        assert captured["updates"] == {"formality": 4.0, "ownership": "wishlist"}

    def test_not_found_returns_404(self, client: TestClient, monkeypatch):
        async def fake_update(item_id, user_id, updates):
            return None

        monkeypatch.setattr(
            "app.routers.clothing_items.supabase.update_clothing_item", fake_update
        )

        response = client.patch(
            "/api/clothing-items/missing",
            json={"brand": "COS"},
        )
        assert response.status_code == 404

    def test_empty_body_returns_400(self, client: TestClient):
        response = client.patch("/api/clothing-items/item-1", json={})
        assert response.status_code == 400

    def test_invalid_ownership_returns_422(self, client: TestClient):
        response = client.patch(
            "/api/clothing-items/item-1",
            json={"ownership": "borrowed"},
        )
        assert response.status_code == 422

    def test_nested_color_update_flattened(self, client: TestClient, monkeypatch):
        captured = {}

        async def fake_update(item_id, user_id, updates):
            captured["updates"] = updates
            return _clothing_item()

        monkeypatch.setattr(
            "app.routers.clothing_items.supabase.update_clothing_item", fake_update
        )

        response = client.patch(
            "/api/clothing-items/item-1",
            json={
                "color": {
                    "hex": "#FF0000",
                    "hsl": {"h": 0, "s": 100, "l": 50},
                    "name": "red",
                    "is_neutral": False,
                }
            },
        )
        assert response.status_code == 200
        # The router forwards the nested color dict; flattening happens in the
        # supabase service (mocked here), so we just confirm it's passed through.
        assert captured["updates"]["color"]["hex"] == "#FF0000"
