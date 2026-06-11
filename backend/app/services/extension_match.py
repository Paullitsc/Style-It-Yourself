"""Inverse matching for the extension: 'what in my closet works with THIS?'

The app's existing matching flow runs forward (recommendations -> closet items).
The extension needs the inverse: given a candidate product, find complementary
closet pieces. This reuses — rather than duplicates — the existing services:

  1. Convert the product into a ``ClothingItemBase`` (done by the caller).
  2. Generate category recommendations with ``generate_category_recommendations``.
  3. For each recommended category, rank closet items with ``rank_items_in_category``.
  4. Assemble the best picks and score the look with ``validate_outfit``.
  5. Return a compact, UI-ready result.
"""

from __future__ import annotations

from app.models.schemas import (
    ClosetMatchGroup,
    ClothingItemBase,
    ClothingItemResponse,
    MatchProductResponse,
)
from app.services.compatibility import (
    generate_category_recommendations,
    validate_outfit,
)
from app.services.matching import rank_items_in_category
from app.utils.constants import (
    MAX_OUTFIT_ITEMS,
    REQUIRED_CATEGORIES_STANDARD,
)

# Priority order for assembling a representative outfit from the best picks.
_OUTFIT_PRIORITY = ["Tops", "Bottoms", "Full Body", "Shoes", "Outerwear", "Accessories"]


def _label(item: ClothingItemResponse) -> str:
    """Human-readable pairing label, e.g. 'charcoal Trousers'."""
    name = (item.color.name or "").strip()
    return f"{name} {item.category.l2}".strip()


def _required_complementary_categories(candidate: ClothingItemBase) -> list[str]:
    """Categories needed to complete an outfit around the candidate."""
    if candidate.category.l1 == "Full Body":
        return ["Shoes"]
    return [c for c in REQUIRED_CATEGORIES_STANDARD if c != candidate.category.l1]


def build_match(
    candidate: ClothingItemBase,
    closet_items: list[ClothingItemResponse],
    limit: int = 4,
) -> MatchProductResponse:
    """Build the match-product response for a candidate against a closet."""
    total_closet = len(closet_items)

    # The candidate's own category is already "filled" by the product itself.
    recommendations = generate_category_recommendations(
        base_item=candidate,
        filled_categories=[candidate.category.l1],
    )

    groups: list[ClosetMatchGroup] = []
    best_pick_by_cat: dict[str, ClothingItemResponse] = {}

    for rec in recommendations:
        matches, others = rank_items_in_category(
            items=closet_items,
            category_l1=rec.category_l1,
            recommended_colors=rec.colors,
            formality_range=rec.formality_range,
            limit=limit,
        )
        if matches or others:
            groups.append(
                ClosetMatchGroup(
                    category_l1=rec.category_l1,
                    items=matches,
                    other_items=others,
                )
            )
        if matches:
            best_pick_by_cat[rec.category_l1] = matches[0]

    # Assemble a plausible look from the top pick of each category (capped so we
    # never exceed the outfit limit; candidate occupies one of the slots).
    best_items: list[ClothingItemResponse] = []
    for cat in _OUTFIT_PRIORITY:
        pick = best_pick_by_cat.get(cat)
        if pick is not None and len(best_items) < MAX_OUTFIT_ITEMS - 1:
            best_items.append(pick)

    # ClothingItemResponse extends ClothingItemBase, so it slots directly into
    # the validator without conversion.
    outfit_result = validate_outfit(items=best_items, base_item=candidate)

    # Warnings: outfit-level issues, plus a friendlier note when the user owns a
    # required category but nothing in it pairs cleanly.
    warnings = list(outfit_result.warnings)
    for cat in _required_complementary_categories(candidate):
        owns_category = any(it.category.l1 == cat for it in closet_items)
        matched = cat in best_pick_by_cat
        if owns_category and not matched:
            warnings.append(
                f"You own {cat.lower()} but none pair cleanly — see 'other options'."
            )
    warnings = list(dict.fromkeys(warnings))

    suggested_pairings = [_label(item) for item in best_items]

    total_matches = sum(len(g.items) for g in groups)
    if total_closet == 0:
        summary = "Your closet is empty. Add pieces to find matches."
    elif total_matches == 0:
        summary = "No strong matches yet — neutral pieces tend to bridge this best."
    else:
        piece_word = "piece" if total_matches == 1 else "pieces"
        summary = (
            f"{total_matches} closet {piece_word} pair well with this "
            f"{candidate.category.l2.lower()}."
        )

    if best_items:
        cohesion_score = outfit_result.cohesion_score
        verdict = outfit_result.verdict
    else:
        cohesion_score = 0
        verdict = "Add closet pieces to build a look around this."

    return MatchProductResponse(
        candidate_category=candidate.category.l1,
        matches_by_category=groups,
        suggested_pairings=suggested_pairings,
        warnings=warnings,
        cohesion_score=cohesion_score,
        verdict=verdict,
        summary=summary,
        total_closet_items=total_closet,
    )
