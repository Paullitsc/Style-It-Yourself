"""
Unit tests for closet router behavior.
"""
from datetime import datetime

import httpx
import pytest
from fastapi import HTTPException, status

from app.models.schemas import (
    User,
    ClothingItemResponse,
    ClosetResponse,
    Color,
    HSL,
    Category,
    OutfitSummary,
)
from app.routers import closet as closet_router


pytestmark = pytest.mark.asyncio


# =============================================================================
# FIXTURES / HELPERS
# =============================================================================

def _make_color(name: str = "navy", hex_value: str = "#123456") -> Color:
    """Create a minimal Color for ClothingItemResponse."""
    is_neutral = name.lower() in [
        "black", "white", "gray", "grey", "navy", "beige", "cream", "tan", "khaki"
    ]
    return Color(
        hex=hex_value,
        hsl=HSL(h=210, s=50, l=30),
        name=name,
        is_neutral=is_neutral,
    )


def _make_item(
    item_id: str,
    user_id: str,
    category_l1: str,
    category_l2: str,
) -> ClothingItemResponse:
    """Create a minimal ClothingItemResponse."""
    return ClothingItemResponse(
        id=item_id,
        user_id=user_id,
        image_url="https://example.com/item.jpg",
        created_at=datetime(2024, 1, 1, 12, 0, 0),
        color=_make_color(),
        category=Category(l1=category_l1, l2=category_l2),
        formality=3.0,
        aesthetics=["Minimalist"],
    )


def _make_outfit(outfit_id: str, name: str, item_count: int = 2) -> OutfitSummary:
    """Create a minimal OutfitSummary."""
    return OutfitSummary(
        id=outfit_id,
        name=name,
        item_count=item_count,
        thumbnail_url=None,
        created_at=datetime(2024, 1, 2, 12, 0, 0),
    )


def _make_closet_response(
    items: list[ClothingItemResponse],
    outfits: list[OutfitSummary],
) -> ClosetResponse:
    """Create a ClosetResponse from items and outfits."""
    items_by_category: dict[str, list[ClothingItemResponse]] = {}
    for item in items:
        items_by_category.setdefault(item.category.l1, []).append(item)

    return ClosetResponse(
        items_by_category=items_by_category,
        outfits=outfits,
        total_items=len(items),
        total_outfits=len(outfits),
    )


# =============================================================================
# TESTS - Using service-level mocking
# =============================================================================

async def test_get_closet_groups_items_and_counts(monkeypatch: pytest.MonkeyPatch) -> None:
    """Groups items by category and returns accurate totals."""
    user = User(id="user-1")
    items = [
        _make_item("item-1", user.id, "Tops", "T-Shirts"),
        _make_item("item-2", user.id, "Tops", "Sweaters"),
        _make_item("item-3", user.id, "Bottoms", "Jeans"),
    ]
    outfits = [
        _make_outfit("outfit-1", "Work"),
        _make_outfit("outfit-2", "Weekend", item_count=3),
    ]

    async def fake_get_closet(user_id: str) -> ClosetResponse:
        assert user_id == user.id
        return _make_closet_response(items, outfits)

    monkeypatch.setattr(
        "app.services.supabase.get_closet",
        fake_get_closet,
    )
    # Also patch the import in the router module
    monkeypatch.setattr(
        closet_router,
        "get_closet_from_db",
        fake_get_closet,
    )

    response = await closet_router.get_closet(current_user=user)

    assert response.total_items == len(items)
    assert response.total_outfits == len(outfits)
    assert set(response.items_by_category.keys()) == {"Tops", "Bottoms"}
    assert [item.id for item in response.items_by_category["Tops"]] == ["item-1", "item-2"]
    assert [item.id for item in response.items_by_category["Bottoms"]] == ["item-3"]
    assert [outfit.id for outfit in response.outfits] == ["outfit-1", "outfit-2"]


async def test_get_closet_empty_results(monkeypatch: pytest.MonkeyPatch) -> None:
    """Handles empty closet responses."""
    user = User(id="user-1")

    async def fake_get_closet(user_id: str) -> ClosetResponse:
        return ClosetResponse(
            items_by_category={},
            outfits=[],
            total_items=0,
            total_outfits=0,
        )

    monkeypatch.setattr(
        closet_router,
        "get_closet_from_db",
        fake_get_closet,
    )

    response = await closet_router.get_closet(current_user=user)

    assert response.items_by_category == {}
    assert response.outfits == []
    assert response.total_items == 0
    assert response.total_outfits == 0


async def test_get_closet_timeout_maps_to_503(monkeypatch: pytest.MonkeyPatch) -> None:
    """Timeouts map to 503 responses."""
    user = User(id="user-1")
    request = httpx.Request("GET", "https://example.com")

    async def fake_get_closet(user_id: str) -> ClosetResponse:
        raise httpx.TimeoutException("timeout", request=request)

    monkeypatch.setattr(
        closet_router,
        "get_closet_from_db",
        fake_get_closet,
    )

    with pytest.raises(HTTPException) as excinfo:
        await closet_router.get_closet(current_user=user)

    assert excinfo.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert excinfo.value.detail == "Closet service timed out."


async def test_get_closet_value_error_maps_to_400(monkeypatch: pytest.MonkeyPatch) -> None:
    """Validation errors map to 400 responses."""
    user = User(id="user-1")

    async def fake_get_closet(user_id: str) -> ClosetResponse:
        raise ValueError("bad input")

    monkeypatch.setattr(
        closet_router,
        "get_closet_from_db",
        fake_get_closet,
    )

    with pytest.raises(HTTPException) as excinfo:
        await closet_router.get_closet(current_user=user)

    assert excinfo.value.status_code == status.HTTP_400_BAD_REQUEST
    assert excinfo.value.detail == "bad input"


async def test_get_closet_unexpected_error_maps_to_502(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unexpected errors map to 502 responses."""
    user = User(id="user-1")

    async def fake_get_closet(user_id: str) -> ClosetResponse:
        raise RuntimeError("boom")

    monkeypatch.setattr(
        closet_router,
        "get_closet_from_db",
        fake_get_closet,
    )

    with pytest.raises(HTTPException) as excinfo:
        await closet_router.get_closet(current_user=user)

    assert excinfo.value.status_code == status.HTTP_502_BAD_GATEWAY
    assert excinfo.value.detail == "Failed to get Closet."