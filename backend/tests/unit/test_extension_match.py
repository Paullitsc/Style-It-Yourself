"""Unit tests for the extension inverse-match service (response shape + logic)."""
from datetime import datetime

import pytest

from app.models.schemas import Category, ClothingItemBase, ClothingItemResponse, Color, HSL
from app.services.event_context import get_event
from app.services.extension_match import build_match
from app.utils.constants import MAX_OUTFIT_ITEMS


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


@pytest.fixture
def wide_closet(closet) -> list[ClothingItemResponse]:
    """A closet with several neutral options in every complementary category —
    enough candidates that the outfit cap, not scarcity, is the binding limit."""
    return closet + [
        _item("b2", "Bottoms", "Trousers", "#3A3A3A", (0, 0, 23), "graphite", 3.0, neutral=True),
        _item("s2", "Shoes", "Loafers", "#1A1A1A", (0, 0, 10), "black", 3.0, neutral=True),
        _item("o1", "Outerwear", "Coats", "#4A4A4A", (0, 0, 29), "gray", 3.0, neutral=True),
        _item("o2", "Outerwear", "Jackets", "#2B2B2B", (0, 0, 17), "charcoal", 2.0, neutral=True),
        _item("f1", "Full Body", "Jumpsuits", "#222222", (0, 0, 13), "black", 3.0, neutral=True),
        _item("a2", "Accessories", "Scarves", "#EFEFEF", (0, 0, 94), "ivory", 2.0, neutral=True),
    ]


class TestBuildMatch:
    def test_response_shape(self, navy_top, closet):
        result = build_match(navy_top, closet, limit=4)

        assert result.candidate_category == "Tops"
        assert isinstance(result.matches_by_category, list)
        assert isinstance(result.suggested_pairings, list)
        assert isinstance(result.suggested_pairing_ids, list)
        assert len(result.suggested_pairing_ids) == len(result.suggested_pairings)
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

    def test_pairing_ids_resolve_to_returned_items(self, navy_top, closet):
        """The extension resolves each pairing id inside matches_by_category to
        render its thumbnail — so every id must be a top pick of some group."""
        result = build_match(navy_top, closet)
        top_picks = {g.items[0].id for g in result.matches_by_category if g.items}
        assert result.suggested_pairing_ids
        assert set(result.suggested_pairing_ids) <= top_picks

    def test_pairing_ids_follow_outfit_priority(self, navy_top, closet):
        result = build_match(navy_top, closet)
        categories = [
            g.category_l1
            for pid in result.suggested_pairing_ids
            for g in result.matches_by_category
            if g.items and g.items[0].id == pid
        ]
        assert categories == ["Bottoms", "Shoes", "Accessories"]

    def test_pairing_ids_respect_outfit_cap(self, navy_top, wide_closet):
        # The candidate itself occupies one of the MAX_OUTFIT_ITEMS slots.
        result = build_match(navy_top, wide_closet)
        assert len(result.suggested_pairing_ids) <= MAX_OUTFIT_ITEMS - 1
        assert len(set(result.suggested_pairing_ids)) == len(result.suggested_pairing_ids)

    def test_empty_closet(self, navy_top):
        result = build_match(navy_top, [])
        assert result.total_closet_items == 0
        assert result.cohesion_score == 0
        assert "empty" in result.summary.lower()
        assert result.matches_by_category == []
        assert result.suggested_pairing_ids == []


class TestBuildMatchWithEvent:
    def test_event_fit_absent_without_pin(self, navy_top, closet):
        result = build_match(navy_top, closet)
        assert result.event_fit is None

    def test_event_fit_present_when_pinned(self, navy_top, closet):
        event = get_event("job-interview")
        result = build_match(navy_top, closet, event=event)
        assert result.event_fit is not None
        assert result.event_fit.event_id == "job-interview"
        assert result.event_fit.label == "Job Interview"

    def test_summary_reframes_for_event(self, navy_top, closet):
        event = get_event("job-interview")
        result = build_match(navy_top, closet, event=event)
        assert "Job Interview" in result.summary

    def test_nonoverlapping_band_falls_back_and_warns(self, closet):
        # A very casual candidate (formality 1.0) has a natural Bottoms range
        # of (1.0, 2.0) — no overlap with Wedding Guest's (3.0, 5.0) band.
        # The pinned event should win over the candidate's own range.
        candidate = ClothingItemBase(
            color=Color(hex="#0B1C2D", hsl=HSL(h=210, s=61, l=11), name="navy", is_neutral=True),
            category=Category(l1="Tops", l2="T-Shirts"),
            formality=1.0,
            aesthetics=["Minimalist"],
        )
        event = get_event("wedding-guest")
        result = build_match(candidate, closet, event=event)
        assert any("Wedding Guest formality" in w for w in result.warnings)
