"""Unit tests for the extension inverse-match service (response shape + logic)."""
from datetime import datetime

import pytest

from app.models.schemas import Category, ClothingItemBase, ClothingItemResponse, Color, HSL
from app.services.extension_match import build_match


def _item(item_id, l1, l2, hex_, hsl, name, formality, neutral=False) -> ClothingItemResponse:
    return ClothingItemResponse(
        id=item_id,
        user_id="user-1",
        image_url=f"https://cdn.example.com/{item_id}.jpg",
        color=Color(hex=hex_, hsl=HSL(h=hsl[0], s=hsl[1], l=hsl[2]), name=name, is_neutral=neutral),
        category=Category(l1=l1, l2=l2),
        formality=formality,
        aesthetics=["Minimalist"],
        ownership="owned",
        created_at=datetime(2025, 1, 1),
    )


@pytest.fixture
def navy_top() -> ClothingItemBase:
    return ClothingItemBase(
        color=Color(hex="#0B1C2D", hsl=HSL(h=210, s=61, l=11), name="navy", is_neutral=True),
        category=Category(l1="Tops", l2="T-Shirts"),
        formality=2.0,
        aesthetics=["Minimalist"],
    )


@pytest.fixture
def closet() -> list[ClothingItemResponse]:
    return [
        _item("b1", "Bottoms", "Chinos", "#2E2E2E", (0, 0, 18), "charcoal", 2.0, neutral=True),
        _item("s1", "Shoes", "Sneakers", "#FFFFFF", (0, 0, 100), "white", 1.0, neutral=True),
        _item("a1", "Accessories", "Belts", "#000000", (0, 0, 0), "black", 3.0, neutral=True),
    ]


class TestBuildMatch:
    def test_response_shape(self, navy_top, closet):
        result = build_match(navy_top, closet, limit=4)

        assert result.candidate_category == "Tops"
        assert isinstance(result.matches_by_category, list)
        assert isinstance(result.suggested_pairings, list)
        assert isinstance(result.warnings, list)
        assert 0 <= result.cohesion_score <= 100
        assert isinstance(result.summary, str) and result.summary
        assert result.total_closet_items == 3

    def test_finds_complementary_pieces(self, navy_top, closet):
        result = build_match(navy_top, closet)
        matched_categories = {g.category_l1 for g in result.matches_by_category if g.items}
        # Neutral bottoms + shoes should pair with a navy top.
        assert "Bottoms" in matched_categories
        assert "Shoes" in matched_categories

    def test_never_recommends_candidate_category(self, navy_top, closet):
        result = build_match(navy_top, closet)
        assert all(g.category_l1 != "Tops" for g in result.matches_by_category)

    def test_suggested_pairings_drawn_from_closet(self, navy_top, closet):
        result = build_match(navy_top, closet)
        assert any("Chinos" in pairing for pairing in result.suggested_pairings)

    def test_empty_closet(self, navy_top):
        result = build_match(navy_top, [])
        assert result.total_closet_items == 0
        assert result.cohesion_score == 0
        assert "empty" in result.summary.lower()
        assert result.matches_by_category == []
