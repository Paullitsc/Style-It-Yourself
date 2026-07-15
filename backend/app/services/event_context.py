"""Event context: score a candidate product, and constrain closet
recommendations, against a pinned shopping intent's formality band and
palette (golden-paths.md path 2 — "Style for an event").

The pin itself is session state that lives client-side (the extension popup
writes it to chrome.storage.local); this module is the read-only definition
and scoring layer the router and extension_match call into. Event ids are
resolved softly — an unknown id (e.g. a stale extension build) degrades to no
event context rather than a 4xx, since EVENT_CONTEXTS is duplicated into the
extension's constants.ts per the project's manual-mirroring convention.
"""

from __future__ import annotations

from app.models.schemas import (
    CategoryRecommendation,
    Color,
    EventFitResult,
    FormalityRange,
    RecommendedColor,
)
from app.services.matching import color_distance
from app.utils.constants import EVENT_CONTEXTS

# Same threshold matching.is_color_similar uses for "is this effectively the
# same color" — reused here so avoid/palette hits use one consistent notion
# of color proximity across the matching and event-fit systems.
_COLOR_SIMILARITY_THRESHOLD = 80.0


class EventContext:
    """Resolved event definition: formality band + palette rules."""

    def __init__(self, event_id: str, data: dict):
        self.event_id = event_id
        self.label: str = data["label"]
        self.formality_min, self.formality_max = data["formality"]
        self.palette: list[dict] = data["palette"]
        self.avoid: list[dict] = data.get("avoid", [])


def get_event(event_id: str | None) -> EventContext | None:
    """Soft lookup — None/unknown ids resolve to None rather than raising."""
    if not event_id:
        return None
    data = EVENT_CONTEXTS.get(event_id)
    return EventContext(event_id, data) if data else None


def _closest_distance(hex_color: str, anchors: list[dict]) -> float:
    return min((color_distance(hex_color, a["hex"]) for a in anchors), default=float("inf"))


def _matches_any(hex_color: str, anchors: list[dict]) -> bool:
    return any(
        color_distance(hex_color, a["hex"]) <= _COLOR_SIMILARITY_THRESHOLD for a in anchors
    )


def score_event_fit(candidate: Color, formality: float, event: EventContext) -> EventFitResult:
    """Score a candidate item's color + formality against a pinned event.

    Mirrors matching.score_item_match's 50/50 formality/color split so the
    two systems read consistently, even though the inputs here are an
    event's fixed band/palette rather than a per-slot recommendation.
    """
    reasons: list[str] = []

    if event.formality_min <= formality <= event.formality_max:
        formality_score = 50.0
    else:
        diff = (
            event.formality_min - formality
            if formality < event.formality_min
            else formality - event.formality_max
        )
        formality_score = max(0.0, 50.0 - diff * 15.0)
        reasons.append(f"Formality falls outside the {event.label} range.")

    avoided = _matches_any(candidate.hex, event.avoid)
    if avoided:
        palette_score = 0.0
        reasons.append(f"{candidate.name.capitalize()} is best avoided for {event.label}.")
    else:
        palette_score = max(0.0, 50.0 - _closest_distance(candidate.hex, event.palette) / 3.0)
        if palette_score < 25.0:
            reasons.append(f"{candidate.name.capitalize()} sits outside the {event.label} palette.")

    score = max(0, min(100, int(round(formality_score + palette_score))))

    # A high score can mask a real issue (e.g. an on-palette color offsetting
    # a formality mismatch) — any reason caps the tier at "warning", mirroring
    # compatibility.get_verdict's "no warnings" gate for its top tier.
    if avoided or score < 40:
        status = "mismatch"
    elif score < 70 or reasons:
        status = "warning"
    else:
        status = "ok"

    return EventFitResult(
        event_id=event.event_id,
        label=event.label,
        status=status,
        score=score,
        reasons=reasons,
    )


def constrain_recommendations(
    recommendations: list[CategoryRecommendation],
    event: EventContext,
) -> tuple[list[CategoryRecommendation], list[str]]:
    """Narrow category recommendations to an event's formality band and
    palette before they're handed to matching.rank_items_in_category.

    Returns (constrained recommendations, extra warnings generated while
    constraining — e.g. when a slot's natural range doesn't overlap the
    event band at all).
    """
    warnings: list[str] = []
    constrained: list[CategoryRecommendation] = []

    event_colors = [
        RecommendedColor(hex=a["hex"], name=a["name"], harmony_type="event")
        for a in event.palette
    ]
    event_hexes = {c.hex.lower() for c in event_colors}

    for rec in recommendations:
        lo = max(rec.formality_range.min, event.formality_min)
        hi = min(rec.formality_range.max, event.formality_max)
        if lo > hi:
            # No overlap between this slot's natural (base ± 1) range and the
            # event's band — the pinned intent wins over generic cohesion, so
            # closet matches are scored at the event's band instead.
            lo, hi = event.formality_min, event.formality_max
            warnings.append(
                f"{rec.category_l1} matches are shown at {event.label} formality "
                "rather than the candidate's usual range."
            )

        kept = [c for c in rec.colors if not _matches_any(c.hex, event.avoid)]
        merged_colors = event_colors + [
            c for c in kept if c.hex.lower() not in event_hexes
        ]

        constrained.append(
            rec.model_copy(
                update={
                    "formality_range": FormalityRange(min=lo, max=hi),
                    "colors": merged_colors,
                }
            )
        )

    return constrained, warnings
