"""Unit tests for event context scoring: candidate-vs-event fit and
recommendation constraining (see app/services/event_context.py)."""
import pytest

from app.models.schemas import (
    CategoryRecommendation,
    Color,
    FormalityRange,
    HSL,
    RecommendedColor,
)
from app.services.event_context import (
    constrain_recommendations,
    get_event,
    score_event_fit,
)


def _color(hex_, h, s, l, name, neutral=False) -> Color:
    return Color(hex=hex_, hsl=HSL(h=h, s=s, l=l), name=name, is_neutral=neutral)


class TestGetEvent:
    def test_known_id_resolves(self):
        event = get_event("job-interview")
        assert event is not None
        assert event.label == "Job Interview"
        assert event.formality_min == 3.0
        assert event.formality_max == 4.0

    def test_unknown_id_returns_none(self):
        # Extension/backend constants are manually mirrored — a stale
        # extension build sending an unrecognized id must degrade quietly.
        assert get_event("burning-man") is None

    def test_none_id_returns_none(self):
        assert get_event(None) is None

    def test_empty_string_returns_none(self):
        assert get_event("") is None


class TestScoreEventFit:
    def test_in_band_palette_color_scores_well(self):
        event = get_event("job-interview")
        navy = _color("#0B1C2D", 210, 61, 11, "navy", neutral=True)
        result = score_event_fit(navy, 3.5, event)
        assert result.status == "ok"
        assert result.score >= 70
        assert result.reasons == []
        assert result.event_id == "job-interview"
        assert result.label == "Job Interview"

    def test_formality_outside_band_is_penalized(self):
        event = get_event("job-interview")  # band 3.0-4.0
        navy = _color("#0B1C2D", 210, 61, 11, "navy", neutral=True)
        in_band = score_event_fit(navy, 3.5, event)
        out_of_band = score_event_fit(navy, 1.0, event)
        assert out_of_band.score < in_band.score
        assert any("formality" in r.lower() for r in out_of_band.reasons)

    def test_avoided_color_forces_mismatch(self):
        event = get_event("wedding-guest")
        white = _color("#FFFFFF", 0, 0, 100, "white", neutral=True)
        result = score_event_fit(white, 4.0, event)
        assert result.status == "mismatch"
        assert result.reasons

    def test_off_palette_color_scores_lower_than_anchor_color(self):
        event = get_event("wedding-guest")
        navy_anchor = _color("#0B1C2D", 210, 61, 11, "navy", neutral=True)
        neon_green = _color("#39FF14", 110, 100, 54, "green")
        anchor_result = score_event_fit(navy_anchor, 4.0, event)
        off_palette_result = score_event_fit(neon_green, 4.0, event)
        assert off_palette_result.score < anchor_result.score

    def test_score_bounded_0_100(self):
        event = get_event("casual-weekend")
        candidate = _color("#39FF14", 110, 100, 54, "green")
        result = score_event_fit(candidate, 5.0, event)
        assert 0 <= result.score <= 100


class TestConstrainRecommendations:
    def _rec(self, category_l1, min_f, max_f, colors=None) -> CategoryRecommendation:
        return CategoryRecommendation(
            category_l1=category_l1,
            colors=colors
            if colors is not None
            else [RecommendedColor(hex="#FF0000", name="red", harmony_type="analogous")],
            formality_range=FormalityRange(min=min_f, max=max_f),
            aesthetics=["Classic"],
            suggested_l2=["Dress Shirts"],
            example="Dress Shirts in red",
        )

    def test_overlapping_range_is_intersected(self):
        event = get_event("job-interview")  # 3.0-4.0
        rec = self._rec("Tops", 2.0, 4.0)
        constrained, warnings = constrain_recommendations([rec], event)
        assert constrained[0].formality_range.min == 3.0
        assert constrained[0].formality_range.max == 4.0
        assert warnings == []

    def test_non_overlapping_range_falls_back_to_event_band(self):
        event = get_event("job-interview")  # 3.0-4.0
        rec = self._rec("Tops", 1.0, 2.0)
        constrained, warnings = constrain_recommendations([rec], event)
        assert constrained[0].formality_range.min == event.formality_min
        assert constrained[0].formality_range.max == event.formality_max
        assert len(warnings) == 1
        assert "Tops" in warnings[0]

    def test_event_palette_is_merged_into_colors(self):
        event = get_event("job-interview")
        rec = self._rec("Tops", 2.0, 4.0)
        constrained, _ = constrain_recommendations([rec], event)
        hexes = {c.hex.upper() for c in constrained[0].colors}
        assert "#0B1C2D" in hexes  # navy anchor present
        assert "#FF0000" in hexes  # original harmony color preserved

    def test_avoided_colors_are_dropped(self):
        event = get_event("wedding-guest")
        rec = self._rec(
            "Tops",
            3.0,
            5.0,
            colors=[RecommendedColor(hex="#FFFFFF", name="white", harmony_type="neutral")],
        )
        constrained, _ = constrain_recommendations([rec], event)
        hexes = {c.hex.upper() for c in constrained[0].colors}
        assert "#FFFFFF" not in hexes

    def test_multiple_recommendations_each_constrained(self):
        event = get_event("wedding-guest")
        recs = [self._rec("Tops", 1.0, 3.0), self._rec("Bottoms", 4.0, 5.0)]
        constrained, warnings = constrain_recommendations(recs, event)
        assert len(constrained) == 2
        # Tops (1-3) overlaps event band (3-5) only at 3.0 -> no fallback.
        assert constrained[0].formality_range.min == 3.0
        # Bottoms (4-5) fully inside event band -> unchanged intersection.
        assert constrained[1].formality_range.min == 4.0
        assert constrained[1].formality_range.max == 5.0
