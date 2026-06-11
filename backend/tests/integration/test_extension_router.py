"""Integration tests for the extension router (HTTP endpoint testing)."""
import io
from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app.middleware.auth import get_current_user
from app.models.schemas import Category, ClothingItemResponse, Color, HSL, User
from app.routers import extension


# =============================================================================
# HELPERS / FIXTURES
# =============================================================================

def _solid_png(rgb=(210, 30, 30)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (24, 24), rgb).save(buf, format="PNG")
    return buf.getvalue()


def _clothing_item(item_id="item-1", l1="Tops", l2="T-Shirts") -> ClothingItemResponse:
    return ClothingItemResponse(
        id=item_id,
        user_id="test-user-123",
        image_url="https://cdn.example.com/clothing-images/item-1.jpg",
        color=Color(hex="#0B1C2D", hsl=HSL(h=210, s=61, l=11), name="navy", is_neutral=True),
        category=Category(l1=l1, l2=l2),
        formality=2.0,
        aesthetics=["Minimalist"],
        ownership="owned",
        created_at=datetime(2025, 1, 1, 12, 0, 0),
    )


def _navy_color() -> dict:
    return {
        "hex": "#0B1C2D",
        "hsl": {"h": 210, "s": 61, "l": 11},
        "name": "navy",
        "is_neutral": True,
    }


@pytest.fixture
def test_user() -> User:
    return User(id="test-user-123", email="test@example.com", name="Test User")


@pytest.fixture
def client(test_user: User) -> TestClient:
    app = FastAPI()
    app.include_router(extension.router)
    app.dependency_overrides[get_current_user] = lambda: test_user
    return TestClient(app)


# =============================================================================
# POST /api/extension/analyze-product
# =============================================================================

class TestAnalyzeProduct:
    def test_without_image_returns_suggestions(self, client: TestClient):
        response = client.post(
            "/api/extension/analyze-product",
            json={"page_url": "https://www.zara.com/x", "title": "Slim Dress Shirt"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["category"]["l1"] == "Tops"
        assert body["color"] is None  # no image -> no color suggestion
        assert body["source_url"] == "https://www.zara.com/x"
        assert body["source_platform"] == "zara"

    def test_with_image_suggests_color(self, client: TestClient, monkeypatch):
        async def fake_fetch(url, **kwargs):
            return _solid_png((210, 30, 30)), "image/png"

        monkeypatch.setattr("app.routers.extension.fetch_remote_image", fake_fetch)

        response = client.post(
            "/api/extension/analyze-product",
            json={
                "page_url": "https://shop.example.com/p",
                "image_url": "https://cdn.example.com/red.png",
                "title": "Red Hoodie",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["color"] is not None
        assert body["color"]["name"] == "red"

    def test_image_failure_is_non_fatal(self, client: TestClient, monkeypatch):
        async def boom(url, **kwargs):
            raise extension.RemoteImageError("blocked")

        monkeypatch.setattr("app.routers.extension.fetch_remote_image", boom)

        response = client.post(
            "/api/extension/analyze-product",
            json={
                "page_url": "https://x.com/p",
                "image_url": "http://10.0.0.1/x.png",
                "title": "Wool Coat",
            },
        )
        # Still 200 with suggestions, just no color.
        assert response.status_code == 200
        assert response.json()["color"] is None
        assert response.json()["category"]["l1"] == "Outerwear"


# =============================================================================
# POST /api/extension/import-item  (authenticated import flow)
# =============================================================================

class TestImportItem:
    def test_happy_path_returns_201(self, client: TestClient, monkeypatch):
        async def fake_fetch(url, **kwargs):
            return _solid_png(), "image/jpeg"

        async def fake_upload(**kwargs):
            return "https://cdn.example.com/clothing-images/stored.jpg"

        async def fake_create(user_id, item, image_url):
            assert image_url == "https://cdn.example.com/clothing-images/stored.jpg"
            return _clothing_item()

        monkeypatch.setattr("app.routers.extension.fetch_remote_image", fake_fetch)
        monkeypatch.setattr("app.routers.extension.supabase.upload_image", fake_upload)
        monkeypatch.setattr("app.routers.extension.supabase.create_clothing_item", fake_create)

        response = client.post(
            "/api/extension/import-item",
            json={
                "color": _navy_color(),
                "category": {"l1": "Tops", "l2": "T-Shirts"},
                "formality": 2.0,
                "aesthetics": ["Minimalist"],
                "image_url": "https://cdn.example.com/remote.jpg",
                "brand": "Uniqlo",
                "price": 19.9,
                "source_url": "https://www.uniqlo.com/item",
                "ownership": "wishlist",
                "title": "Navy Tee",
            },
        )
        assert response.status_code == 201
        assert response.json()["id"] == "item-1"

    def test_unsafe_image_url_rejected_400(self, client: TestClient):
        # No mocking: the real SSRF guard must reject a private address (no network).
        response = client.post(
            "/api/extension/import-item",
            json={
                "color": _navy_color(),
                "category": {"l1": "Tops", "l2": "T-Shirts"},
                "formality": 2.0,
                "aesthetics": [],
                "image_url": "http://127.0.0.1/secret.png",
            },
        )
        assert response.status_code == 400

    def test_missing_image_url_422(self, client: TestClient):
        response = client.post(
            "/api/extension/import-item",
            json={
                "color": _navy_color(),
                "category": {"l1": "Tops", "l2": "T-Shirts"},
                "formality": 2.0,
                "aesthetics": [],
            },
        )
        assert response.status_code == 422


# =============================================================================
# POST /api/extension/match-product
# =============================================================================

class TestMatchProduct:
    def test_returns_match_shape(self, client: TestClient, monkeypatch):
        async def fake_closet(user_id, limit=500):
            return [_clothing_item("b1", "Bottoms", "Chinos")]

        monkeypatch.setattr(
            "app.routers.extension.supabase.get_user_clothing_items", fake_closet
        )

        response = client.post(
            "/api/extension/match-product",
            json={
                "candidate": {
                    "color": _navy_color(),
                    "category": {"l1": "Tops", "l2": "T-Shirts"},
                    "formality": 2.0,
                    "aesthetics": ["Minimalist"],
                }
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["candidate_category"] == "Tops"
        assert 0 <= body["cohesion_score"] <= 100
        assert "summary" in body
        assert isinstance(body["matches_by_category"], list)

    def test_closet_timeout_returns_503(self, client: TestClient, monkeypatch):
        import httpx

        async def boom(user_id, limit=500):
            raise httpx.TimeoutException("slow")

        monkeypatch.setattr(
            "app.routers.extension.supabase.get_user_clothing_items", boom
        )

        response = client.post(
            "/api/extension/match-product",
            json={
                "candidate": {
                    "color": _navy_color(),
                    "category": {"l1": "Tops", "l2": "T-Shirts"},
                    "formality": 2.0,
                    "aesthetics": [],
                }
            },
        )
        assert response.status_code == 503
