"""
Matching service - Find closet items that match recommendations.
"""
import math
from typing import List, Tuple

from app.models.schemas import ClothingItemResponse, FormalityRange, RecommendedColor


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def color_distance(hex1: str, hex2: str) -> float:
    """
    Calculate color distance using weighted Euclidean distance in RGB space.
    Returns a value between 0 (identical) and ~441 (black vs white).
    """
    r1, g1, b1 = hex_to_rgb(hex1)
    r2, g2, b2 = hex_to_rgb(hex2)
    
    # Weighted RGB distance (human eye is more sensitive to green)
    return math.sqrt(
        2 * (r1 - r2) ** 2 +
        4 * (g1 - g2) ** 2 +
        3 * (b1 - b2) ** 2
    )


def is_color_similar(item_hex: str, recommended_hex: str, threshold: float = 80.0) -> bool:
    """Check if two colors are similar within threshold."""
    return color_distance(item_hex, recommended_hex) <= threshold


def score_item_match(
    item: ClothingItemResponse,
    recommended_colors: List[RecommendedColor],
    formality_range: FormalityRange,
) -> float:
    """
    Score how well an item matches recommendations.
    Returns 0-100 score (higher = better match).
    """
    score = 0.0
    
    # Color matching (0-50 points)
    best_color_distance = float('inf')
    for rec_color in recommended_colors:
        dist = color_distance(item.color.hex, rec_color.hex)
        best_color_distance = min(best_color_distance, dist)
    
    # Convert distance to score (0 distance = 50 points, 150+ distance = 0 points)
    color_score = max(0, 50 - (best_color_distance / 3))
    score += color_score
    
    # Formality matching (0-50 points)
    if formality_range.min <= item.formality <= formality_range.max:
        # Perfect match - full points
        score += 50
    else:
        # Partial points based on how close
        if item.formality < formality_range.min:
            diff = formality_range.min - item.formality
        else:
            diff = item.formality - formality_range.max
        # Lose 15 points per level outside range
        formality_score = max(0, 50 - (diff * 15))
        score += formality_score
    
    return score


def _score_category_items(
    items: List[ClothingItemResponse],
    category_l1: str,
    recommended_colors: List[RecommendedColor],
    formality_range: FormalityRange,
) -> List[Tuple[ClothingItemResponse, float]]:
    """Filter items to the target category and return (item, score) pairs sorted by score desc."""
    scored = [
        (item, score_item_match(item, recommended_colors, formality_range))
        for item in items
        if item.category.l1 == category_l1
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored


def filter_and_rank_items(
    items: List[ClothingItemResponse],
    category_l1: str,
    recommended_colors: List[RecommendedColor],
    formality_range: FormalityRange,
    limit: int = 5,
    min_score: float = 40.0,
) -> List[ClothingItemResponse]:
    """Return items in the category whose score >= min_score, sorted best-first."""
    scored = _score_category_items(items, category_l1, recommended_colors, formality_range)
    return [item for item, score in scored if score >= min_score][:limit]


def rank_items_in_category(
    items: List[ClothingItemResponse],
    category_l1: str,
    recommended_colors: List[RecommendedColor],
    formality_range: FormalityRange,
    limit: int = 5,
    min_score: float = 40.0,
) -> Tuple[List[ClothingItemResponse], List[ClothingItemResponse]]:
    """Partition category items into (matches, others) by min_score.

    Both lists are sorted best-first and capped at `limit`. Lets callers offer
    an escape hatch when no items clear the threshold but the user still has
    things in this category.
    """
    scored = _score_category_items(items, category_l1, recommended_colors, formality_range)
    matches = [item for item, score in scored if score >= min_score][:limit]
    others = [item for item, score in scored if score < min_score][:limit]
    return matches, others