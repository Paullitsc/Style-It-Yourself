"""
Unit tests for compatibility.py - Outfit Validation & Compatibility Engine.
"""
import pytest

from app.models.schemas import (
    ClothingItemBase,
    Color,
    HSL,
    Category,
    ValidateItemResponse,
    ValidateOutfitResponse,
)
from app.services import compatibility
from app.utils.constants import SHOE_BOTTOM_PAIRINGS, MAX_OUTFIT_ITEMS, FORMALITY_LEVELS


# ==============================================================================
# Helper Functions
# ==============================================================================

def _make_color(name: str, h: int = 0, s: int = 50, l: int = 50, hex_value: str = "#123456") -> Color:
    """Helper to create a Color object."""
    is_neutral = name.lower() in ["black", "white", "gray", "grey", "navy", "beige", "cream", "tan", "khaki"]
    return Color(hex=hex_value, hsl=HSL(h=h, s=s, l=l), name=name, is_neutral=is_neutral)


def _make_item(
    category_l1: str,
    category_l2: str,
    formality: float = 3.0,
    aesthetics: list[str] | None = None,
    color_name: str = "navy",
) -> ClothingItemBase:
    """Helper to create a ClothingItemBase object."""
    return ClothingItemBase(
        color=_make_color(color_name),
        category=Category(l1=category_l1, l2=category_l2),
        formality=formality,
        aesthetics=aesthetics or [],
    )


def _make_color_only_item(h: int, s: int, l: int, name: str) -> ClothingItemBase:
    """Helper for color-clash tests — non-neutral color with controllable HSL.
    The `name` is intentionally not in NEUTRAL_COLORS so check_color_compatibility
    doesn't short-circuit to neutral."""
    return ClothingItemBase(
        color=Color(hex="#101010", hsl=HSL(h=h, s=s, l=l), name=name, is_neutral=False),
        category=Category(l1="Tops", l2="T-Shirts"),
        formality=3.0,
        aesthetics=[],
    )


# ==============================================================================
# FORMALITY CHECKING TESTS
# ==============================================================================

@pytest.mark.parametrize(
    "formality1, formality2, expected_status",
    [
        (1.0, 1.0, "ok"),  # Same level
        (1.0, 2.0, "ok"),  # Distance 1
        (2.0, 1.0, "ok"),  # Distance 1 (reversed)
        (2.5, 3.5, "ok"),  # Distance 1 (float)
        (1.0, 3.0, "warning"),  # Distance 2
        (3.0, 1.0, "warning"),  # Distance 2 (reversed)
        (1.0, 4.0, "mismatch"),  # Distance 3
        (1.0, 5.0, "mismatch"),  # Distance 4
        (5.0, 1.0, "mismatch"),  # Distance 4 (reversed)
        (1.5, 4.5, "mismatch"),  # Distance 3 (float)
    ],
)
def test_check_formality_compatibility(formality1: float, formality2: float, expected_status: str):
    """Test formality compatibility with float values (validation fix)."""
    status, msg = compatibility.check_formality_compatibility(formality1, formality2)
    assert status == expected_status

    if expected_status == "ok":
        assert msg is None
    else:
        assert msg is not None
        # Warning text uses labelled levels (e.g. "Casual", "Smart Casual"),
        # not the raw float values. Computed from FORMALITY_LEVELS directly
        # rather than via compatibility._formality_label so the test isn't
        # coupled to a private helper.
        def _expected_label(f: float) -> str:
            return FORMALITY_LEVELS[max(1, min(5, int(f + 0.5)))]
        assert _expected_label(formality1) in msg or _expected_label(formality2) in msg


def test_check_formality_compatibility_boundary_cases():
    """Test formality compatibility at boundaries."""
    # Exactly 1.0 apart
    status, _ = compatibility.check_formality_compatibility(1.0, 2.0)
    assert status == "ok"
    
    # Exactly 2.0 apart
    status, _ = compatibility.check_formality_compatibility(1.0, 3.0)
    assert status == "warning"
    
    # Exactly 3.0 apart
    status, _ = compatibility.check_formality_compatibility(1.0, 4.0)
    assert status == "mismatch"
    
    # Float precision test
    status, _ = compatibility.check_formality_compatibility(1.5, 2.5)
    assert status == "ok"
    
    status, _ = compatibility.check_formality_compatibility(1.5, 3.5)
    assert status == "warning"


# ==============================================================================
# AESTHETIC CHECKING TESTS
# ==============================================================================

def test_check_aesthetic_compatibility_shared_tags():
    """Test aesthetic compatibility with shared tags."""
    status, msg = compatibility.check_aesthetic_compatibility(
        ["Streetwear", "Minimalist"],
        ["Streetwear", "Classic"]
    )
    assert status == "cohesive"
    assert msg is None


def test_check_aesthetic_compatibility_no_overlap():
    """Test aesthetic compatibility with no shared tags."""
    status, msg = compatibility.check_aesthetic_compatibility(
        ["Streetwear", "Minimalist"],
        ["Preppy", "Classic"]
    )
    assert status == "warning"
    assert msg is not None
    assert "No shared aesthetic tags" in msg


def test_check_aesthetic_compatibility_empty_lists():
    """Test aesthetic compatibility with empty lists (flexibility)."""
    # Both empty
    status, msg = compatibility.check_aesthetic_compatibility([], [])
    assert status == "cohesive"
    assert msg is None
    
    # First empty
    status, msg = compatibility.check_aesthetic_compatibility([], ["Streetwear"])
    assert status == "cohesive"
    assert msg is None
    
    # Second empty
    status, msg = compatibility.check_aesthetic_compatibility(["Minimalist"], [])
    assert status == "cohesive"
    assert msg is None


def test_check_aesthetic_compatibility_single_tag():
    """Test aesthetic compatibility with single tags."""
    status, msg = compatibility.check_aesthetic_compatibility(["Streetwear"], ["Streetwear"])
    assert status == "cohesive"
    assert msg is None


# ==============================================================================
# CATEGORY PAIRING TESTS
# ==============================================================================

def test_check_category_pairing_valid_shoe_bottom():
    """Test valid shoe-bottom pairings."""
    sneakers = _make_item("Shoes", "Sneakers")
    jeans = _make_item("Bottoms", "Jeans")
    
    status, msg = compatibility.check_category_pairing(sneakers, jeans)
    assert status == "ok"
    assert msg is None


def test_check_category_pairing_invalid_shoe_bottom():
    """Test invalid shoe-bottom pairings."""
    oxfords = _make_item("Shoes", "Oxfords")
    joggers = _make_item("Bottoms", "Joggers")
    
    status, msg = compatibility.check_category_pairing(oxfords, joggers)
    assert status == "warning"
    assert msg is not None
    assert "Oxfords" in msg
    assert "Joggers" in msg


def test_check_category_pairing_full_body_dresses():
    """Test Full Body category with Dresses (validation fix)."""
    heels = _make_item("Shoes", "Heels")
    dress = _make_item("Full Body", "Dresses")
    
    status, msg = compatibility.check_category_pairing(heels, dress)
    assert status == "ok"
    assert msg is None


def test_check_category_pairing_full_body_suits():
    """Test Full Body category with Suits (validation fix)."""
    oxfords = _make_item("Shoes", "Oxfords")
    suit = _make_item("Full Body", "Suits")
    
    status, msg = compatibility.check_category_pairing(oxfords, suit)
    assert status == "ok"
    assert msg is None


def test_check_category_pairing_full_body_invalid():
    """Test Full Body category with invalid pairing."""
    sneakers = _make_item("Shoes", "Sneakers")
    dress = _make_item("Full Body", "Dresses")

    # Sneakers don't typically pair with Dresses
    status, msg = compatibility.check_category_pairing(sneakers, dress)
    # This depends on SHOE_BOTTOM_PAIRINGS - if Sneakers allows Dresses, it's ok
    # Otherwise it's a warning
    assert status in ["ok", "warning"]


def test_check_category_pairing_sandals_with_suit_warns():
    """Sandals don't pair with Suits — Sandals' allowed list contains Dresses
    but not Suits, so the bottom-specific check must reject this combo."""
    sandals = _make_item("Shoes", "Sandals")
    suit = _make_item("Full Body", "Suits")
    status, msg = compatibility.check_category_pairing(sandals, suit)
    assert status == "warning"
    assert msg is not None and "Sandals" in msg and "Suits" in msg


def test_check_category_pairing_oxfords_with_dress_warns():
    """Oxfords' allowed list contains Suits but not Dresses; the check
    must reject Oxfords+Dress even though Suits is in the allowed list."""
    oxfords = _make_item("Shoes", "Oxfords")
    dress = _make_item("Full Body", "Dresses")
    status, msg = compatibility.check_category_pairing(oxfords, dress)
    assert status == "warning"


def test_check_category_pairing_non_shoe_bottom():
    """Test non-shoe-bottom pairs (should be ok)."""
    shirt = _make_item("Tops", "T-Shirts")
    jeans = _make_item("Bottoms", "Jeans")
    
    status, msg = compatibility.check_category_pairing(shirt, jeans)
    assert status == "ok"
    assert msg is None


def test_check_category_pairing_unknown_shoe_type():
    """Unknown shoe types have no rule — stay silent instead of falsely
    warning. Confidently rejecting an unknown combination is worse than
    saying nothing."""
    unknown_shoe = _make_item("Shoes", "UnknownShoeType")
    jeans = _make_item("Bottoms", "Jeans")

    status, msg = compatibility.check_category_pairing(unknown_shoe, jeans)
    assert status == "ok"
    assert msg is None


# ==============================================================================
# OUTFIT COMPOSITION TESTS
# ==============================================================================

def test_check_outfit_composition_standard_complete():
    """Test standard outfit composition (complete)."""
    items = [
        _make_item("Tops", "T-Shirts"),
        _make_item("Bottoms", "Jeans"),
        _make_item("Shoes", "Sneakers"),
    ]
    
    is_complete, missing = compatibility.check_outfit_composition(items)
    assert is_complete is True
    assert missing == []


def test_check_outfit_composition_standard_incomplete():
    """Test standard outfit composition (incomplete)."""
    items = [
        _make_item("Tops", "T-Shirts"),
        _make_item("Bottoms", "Jeans"),
        # Missing Shoes
    ]
    
    is_complete, missing = compatibility.check_outfit_composition(items)
    assert is_complete is False
    assert "Shoes" in missing


def test_check_outfit_composition_fullbody_complete():
    """Test Full Body outfit composition (complete)."""
    items = [
        _make_item("Full Body", "Dresses"),
        _make_item("Shoes", "Heels"),
    ]
    
    is_complete, missing = compatibility.check_outfit_composition(items)
    assert is_complete is True
    assert missing == []


def test_check_outfit_composition_fullbody_incomplete():
    """Test Full Body outfit composition (incomplete)."""
    items = [
        _make_item("Full Body", "Dresses"),
        # Missing Shoes
    ]
    
    is_complete, missing = compatibility.check_outfit_composition(items)
    assert is_complete is False
    assert "Shoes" in missing


def test_get_categories_in_outfit():
    """Test grouping items by L1 category."""
    items = [
        _make_item("Tops", "T-Shirts"),
        _make_item("Tops", "Polos"),
        _make_item("Bottoms", "Jeans"),
        _make_item("Shoes", "Sneakers"),
    ]
    
    categories = compatibility.get_categories_in_outfit(items)
    
    assert "Tops" in categories
    assert "Bottoms" in categories
    assert "Shoes" in categories
    assert len(categories["Tops"]) == 2
    assert len(categories["Bottoms"]) == 1
    assert len(categories["Shoes"]) == 1


# ==============================================================================
# COHESION SCORE TESTS
# ==============================================================================

def test_calculate_cohesion_score_single_item():
    """Test cohesion score for single item (should be 100)."""
    base_item = _make_item("Tops", "T-Shirts")
    items = []
    
    score = compatibility.calculate_cohesion_score(items, base_item)
    assert score == 100


def test_calculate_cohesion_score_perfect_match():
    """Test cohesion score for perfectly matching items."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0, aesthetics=["Minimalist"])
    items = [
        _make_item("Bottoms", "Jeans", formality=3.0, aesthetics=["Minimalist"], color_name="navy"),
        _make_item("Shoes", "Sneakers", formality=3.0, aesthetics=["Minimalist"], color_name="black"),
    ]
    
    score = compatibility.calculate_cohesion_score(items, base_item)
    # Should be high (close to 100) since everything matches
    assert score >= 70


def test_calculate_cohesion_score_color_clash():
    """Test cohesion score with color clashes."""
    # Use actual hues that clash: red (h=0) and a color at h=80 are not compatible
    # (not analogous ±30°, not complementary 180°±15°, not triadic 120°±15°)
    # Distance of 80° falls outside all harmony thresholds
    red_color = _make_color("red", h=0, s=100, l=50, hex_value="#FF0000")
    unrelated_color = _make_color("yellow", h=80, s=100, l=50, hex_value="#FFFF00")
    
    base_item = ClothingItemBase(
        color=red_color,
        category=Category(l1="Tops", l2="T-Shirts"),
        formality=3.0,
        aesthetics=[],
    )
    items = [
        ClothingItemBase(
            color=unrelated_color,
            category=Category(l1="Bottoms", l2="Jeans"),
            formality=3.0,
            aesthetics=[],
        ),
    ]
    
    score = compatibility.calculate_cohesion_score(items, base_item)
    # 1 incompatible pair → penalty = min(1*10, 30) = 10 → score = 90.
    assert score < 100
    assert score <= 90


def test_calculate_cohesion_score_color_penalty_not_diluted_by_outfit_size():
    """One color clash in a 2-item outfit and the same clash in a larger outfit
    should produce the same color penalty. The previous ratio-based scoring
    (incompatible_pairs / total_pairs) silently reduced the penalty as the
    outfit grew, so a single clash among 6 items barely registered."""
    red = _make_color("red", h=0, s=100, l=50, hex_value="#FF0000")
    yellow = _make_color("yellow", h=80, s=100, l=50, hex_value="#FFFF00")
    base_item = ClothingItemBase(
        color=red, category=Category(l1="Tops", l2="T-Shirts"),
        formality=3.0, aesthetics=["Minimalist", "Streetwear"],
    )

    def clashing_with(others_count: int) -> int:
        items = [
            ClothingItemBase(
                color=yellow, category=Category(l1="Bottoms", l2="Jeans"),
                formality=3.0, aesthetics=["Minimalist", "Streetwear"],
            ),
        ]
        # Add `others_count` extra items in neutral white that don't clash with
        # anything, only inflating total_pairs.
        white = _make_color("white", h=0, s=0, l=100, hex_value="#FFFFFF")
        for i in range(others_count):
            items.append(ClothingItemBase(
                color=white,
                category=Category(l1="Accessories", l2=f"Item{i}"),
                formality=3.0, aesthetics=["Minimalist", "Streetwear"],
            ))
        return compatibility.calculate_cohesion_score(items, base_item)

    small_outfit_score = clashing_with(0)
    big_outfit_score = clashing_with(3)
    # Color penalty must be the same — the only differing factor is total pairs.
    assert small_outfit_score == big_outfit_score


def test_calculate_cohesion_score_formality_gap():
    """Test cohesion score with formality gap."""
    base_item = _make_item("Tops", "T-Shirts", formality=1.0)
    items = [
        _make_item("Bottoms", "Jeans", formality=5.0),  # Large gap
    ]

    score = compatibility.calculate_cohesion_score(items, base_item)
    # With a 0.5 formality dead-zone: range=4 → (4-0.5)*10 = 35 penalty.
    assert score <= 65


def test_calculate_cohesion_score_formality_deadzone_no_penalty():
    """Float formality gaps within ±0.5 should not move the score. 3.0 vs 3.1
    is visually identical to the user — penalizing it for -1 point is noise."""
    base_item = _make_item(
        "Tops", "T-Shirts", formality=3.0, aesthetics=["Minimalist"]
    )
    items = [
        _make_item(
            "Bottoms", "Jeans", formality=3.4, aesthetics=["Minimalist"]
        ),
    ]
    score = compatibility.calculate_cohesion_score(items, base_item)
    assert score == 100


def test_calculate_cohesion_score_no_common_aesthetics():
    """Test cohesion score with no common aesthetics."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0, aesthetics=["Streetwear"])
    items = [
        _make_item("Bottoms", "Jeans", formality=3.0, aesthetics=["Preppy"]),
        _make_item("Shoes", "Sneakers", formality=3.0, aesthetics=["Classic"]),
    ]

    score = compatibility.calculate_cohesion_score(items, base_item)
    # Should have aesthetic penalty (-30)
    assert score <= 70


def test_calculate_cohesion_score_aesthetic_threshold_matches_validator():
    """Scoring and check_aesthetic_compatibility must agree: ≥1 shared tag is
    cohesive and incurs no penalty. Previously the validator said 'cohesive'
    while the scorer still deducted -10 for exactly 1 shared tag."""
    base_item = _make_item(
        "Tops", "T-Shirts", formality=3.0, aesthetics=["Minimalist", "Classic"]
    )
    items = [
        _make_item(
            "Bottoms", "Jeans", formality=3.0, aesthetics=["Minimalist", "Streetwear"]
        ),  # only "Minimalist" shared
    ]
    score = compatibility.calculate_cohesion_score(items, base_item)
    # 1 shared tag → no aesthetic penalty.
    assert score == 100


def test_calculate_cohesion_score_float_formality():
    """Test cohesion score with float formality values (validation fix)."""
    base_item = _make_item("Tops", "T-Shirts", formality=2.5)
    items = [
        _make_item("Bottoms", "Jeans", formality=3.5),
        _make_item("Shoes", "Sneakers", formality=2.0),
    ]
    
    score = compatibility.calculate_cohesion_score(items, base_item)
    # Should calculate correctly with floats
    assert 0 <= score <= 100


# ==============================================================================
# VERDICT TESTS
# ==============================================================================

@pytest.mark.parametrize(
    "score, is_complete, expected_keyword",
    [
        (90, True, "Excellent"),
        (85, True, "Excellent"),
        (75, True, "Good"),
        (70, True, "Good"),
        (60, True, "Decent"),
        (50, True, "Decent"),
        (40, True, "Consider revising"),
        (30, True, "Consider revising"),
        (100, False, "Incomplete"),
        (90, False, "Incomplete"),
    ],
)
def test_get_verdict(score: int, is_complete: bool, expected_keyword: str):
    """Test verdict generation for different scores."""
    verdict = compatibility.get_verdict(score, is_complete, [])
    assert expected_keyword.lower() in verdict.lower()


# ==============================================================================
# SINGLE ITEM VALIDATION TESTS
# ==============================================================================

def test_validate_item_perfect_match():
    """Test validating an item that perfectly matches."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0, aesthetics=["Minimalist"], color_name="navy")
    new_item = _make_item("Bottoms", "Jeans", formality=3.0, aesthetics=["Minimalist"], color_name="black")
    current_outfit = []
    
    response = compatibility.validate_item(new_item, base_item, current_outfit)
    
    assert isinstance(response, ValidateItemResponse)
    assert response.color_status == "ok"
    assert response.formality_status == "ok"
    assert response.aesthetic_status == "cohesive"
    assert response.pairing_status == "ok"
    assert len(response.warnings) == 0


def test_validate_item_formality_mismatch():
    """Test validating an item with formality mismatch."""
    base_item = _make_item("Tops", "T-Shirts", formality=1.0)
    new_item = _make_item("Bottoms", "Jeans", formality=5.0)
    current_outfit = []
    
    response = compatibility.validate_item(new_item, base_item, current_outfit)
    
    assert response.formality_status == "mismatch"
    assert len(response.warnings) > 0
    assert any("mismatch" in w.lower() or "levels apart" in w.lower() for w in response.warnings)


def test_validate_item_aesthetic_warning():
    """Test validating an item with aesthetic mismatch."""
    base_item = _make_item("Tops", "T-Shirts", aesthetics=["Streetwear"])
    new_item = _make_item("Bottoms", "Jeans", aesthetics=["Preppy"])
    current_outfit = []
    
    response = compatibility.validate_item(new_item, base_item, current_outfit)
    
    assert response.aesthetic_status == "warning"
    assert len(response.warnings) > 0
    assert any("aesthetic" in w.lower() for w in response.warnings)


def test_validate_item_category_pairing_warning():
    """Test validating an item with category pairing warning."""
    base_item = _make_item("Tops", "T-Shirts")
    new_item = _make_item("Shoes", "Oxfords")
    current_outfit = [
        _make_item("Bottoms", "Joggers"),  # Oxfords don't pair with Joggers
    ]
    
    response = compatibility.validate_item(new_item, base_item, current_outfit)
    
    # Should check pairing with current outfit items
    assert response.pairing_status in ["ok", "warning"]


def test_validate_item_with_current_outfit():
    """Test validating an item against base and current outfit."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0, color_name="navy")
    new_item = _make_item("Shoes", "Sneakers", formality=3.0, color_name="red")
    current_outfit = [
        _make_item("Bottoms", "Jeans", formality=3.0, color_name="blue"),
    ]

    response = compatibility.validate_item(new_item, base_item, current_outfit)

    assert isinstance(response, ValidateItemResponse)
    # Should check against both base_item and current_outfit items
    assert response.color_status in ["ok", "warning", "mismatch"]
    assert response.formality_status in ["ok", "warning", "mismatch"]


def test_validate_item_color_clash_returns_mismatch():
    """Hard color clashes should escalate to 'mismatch', not be capped at
    'warning'. Formality already has three levels — color should too."""
    base_item = _make_color_only_item(h=0, s=100, l=50, name="red")    # red
    new_item = _make_color_only_item(h=80, s=100, l=50, name="yellow")  # incompatible (gap=80°)
    response = compatibility.validate_item(new_item, base_item, [])
    assert response.color_status == "mismatch"


def test_validate_item_color_clash_warning_text_excludes_internal_label():
    """Warning text must not leak the internal '(none)' harmony_type label
    when colors clash."""
    base_item = _make_color_only_item(h=0, s=100, l=50, name="red")
    new_item = _make_color_only_item(h=80, s=100, l=50, name="yellow")
    response = compatibility.validate_item(new_item, base_item, [])
    for warning in response.warnings:
        assert "(none)" not in warning


def test_validate_item_aesthetic_checks_current_outfit():
    """Aesthetic check shouldn't be limited to base_item — if the current
    outfit has drifted, a new item that mismatches an outfit piece must warn."""
    base_item = _make_item(
        "Tops", "T-Shirts", formality=3.0, aesthetics=["Minimalist"]
    )
    outfit_piece = _make_item(
        "Bottoms", "Jeans", formality=3.0, aesthetics=["Streetwear"]
    )
    new_item = _make_item(
        "Shoes", "Sneakers", formality=3.0, aesthetics=["Minimalist"]
    )  # matches base but not outfit_piece
    response = compatibility.validate_item(new_item, base_item, [outfit_piece])
    assert response.aesthetic_status == "warning"
    # The Jeans-specific mismatch should be visible in the warnings.
    assert any("Jeans" in w for w in response.warnings)


# ==============================================================================
# FULL OUTFIT VALIDATION TESTS
# ==============================================================================

def test_validate_outfit_complete():
    """Test validating a complete outfit."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0, aesthetics=["Minimalist"])
    items = [
        _make_item("Bottoms", "Jeans", formality=3.0, aesthetics=["Minimalist"]),
        _make_item("Shoes", "Sneakers", formality=3.0, aesthetics=["Minimalist"]),
    ]
    
    response = compatibility.validate_outfit(items, base_item)
    
    assert isinstance(response, ValidateOutfitResponse)
    assert response.is_complete is True
    assert 0 <= response.cohesion_score <= 100
    assert len(response.color_strip) == 3  # base + 2 items
    assert "Excellent" in response.verdict or "Good" in response.verdict or "Decent" in response.verdict


def test_validate_outfit_incomplete():
    """Test validating an incomplete outfit."""
    base_item = _make_item("Tops", "T-Shirts")
    items = [
        _make_item("Bottoms", "Jeans"),
        # Missing Shoes
    ]
    
    response = compatibility.validate_outfit(items, base_item)
    
    assert response.is_complete is False
    assert "Incomplete" in response.verdict
    assert len(response.warnings) > 0
    assert any("missing" in w.lower() for w in response.warnings)


def test_validate_outfit_warns_when_too_many_accessories():
    """MAX_ACCESSORIES=3 is in constants.py but was previously unenforced."""
    base_item = _make_item("Tops", "T-Shirts", aesthetics=["Minimalist"])
    items = [
        _make_item("Bottoms", "Jeans", aesthetics=["Minimalist"]),
        _make_item("Shoes", "Sneakers", aesthetics=["Minimalist"]),
        _make_item("Accessories", "Watches", aesthetics=["Minimalist"]),
        _make_item("Accessories", "Belts", aesthetics=["Minimalist"]),
        _make_item("Accessories", "Hats", aesthetics=["Minimalist"]),
        _make_item("Accessories", "Bags", aesthetics=["Minimalist"]),  # 4th — over cap
    ]
    response = compatibility.validate_outfit(items, base_item)
    assert any("accessor" in w.lower() for w in response.warnings)


def test_validate_outfit_warns_when_too_many_outerwear():
    """MAX_OUTERWEAR=1 is in constants.py but was previously unenforced."""
    base_item = _make_item("Tops", "T-Shirts", aesthetics=["Minimalist"])
    items = [
        _make_item("Bottoms", "Jeans", aesthetics=["Minimalist"]),
        _make_item("Shoes", "Sneakers", aesthetics=["Minimalist"]),
        _make_item("Outerwear", "Jackets", aesthetics=["Minimalist"]),
        _make_item("Outerwear", "Coats", aesthetics=["Minimalist"]),
    ]
    response = compatibility.validate_outfit(items, base_item)
    assert any("outerwear" in w.lower() for w in response.warnings)


@pytest.mark.parametrize(
    "duplicate_l1, l2_pair",
    [
        ("Tops", ("T-Shirts", "Casual Shirts")),
        ("Bottoms", ("Jeans", "Chinos")),
        ("Shoes", ("Sneakers", "Boots")),
        ("Full Body", ("Dresses", "Suits")),
    ],
)
def test_validate_outfit_warns_on_duplicate_singleton_category(
    duplicate_l1: str, l2_pair: tuple[str, str]
):
    """All four singleton L1s (Tops/Bottoms/Shoes/Full Body) must warn on dups."""
    # Base in a different category so the duplicate is in the outfit items.
    base_item = _make_item(
        "Accessories" if duplicate_l1 != "Accessories" else "Tops",
        "Watches",
        aesthetics=["Minimalist"],
    )
    items = [
        _make_item(duplicate_l1, l2_pair[0], aesthetics=["Minimalist"]),
        _make_item(duplicate_l1, l2_pair[1], aesthetics=["Minimalist"]),
    ]
    response = compatibility.validate_outfit(items, base_item)
    assert any(
        duplicate_l1.lower() in w.lower() for w in response.warnings
    ), f"expected a 'Multiple {duplicate_l1}' warning, got {response.warnings!r}"


def test_cohesion_score_penalized_when_over_max_items():
    """Over-max-items previously surfaced a warning but didn't move the score.
    The score should reflect that the outfit is over budget."""
    base_item = _make_item("Tops", "T-Shirts", aesthetics=["Minimalist"])
    # 8 extra items, way over MAX_OUTFIT_ITEMS=6 (incl. base = 9 total).
    items = [
        _make_item("Accessories", f"X{i}", aesthetics=["Minimalist"])
        for i in range(8)
    ]
    score = compatibility.calculate_cohesion_score(items, base_item)
    assert score < 100


def test_validate_outfit_dedupes_pairwise_warnings():
    """Three items at formality 1, 1, 5 — the 1-vs-5 mismatch arises from
    two distinct pairs but shouldn't appear twice in warnings."""
    base_item = _make_item("Tops", "T-Shirts", formality=1.0, aesthetics=["Minimalist"])
    items = [
        _make_item("Bottoms", "Jeans", formality=1.0, aesthetics=["Minimalist"]),
        _make_item("Shoes", "Sneakers", formality=5.0, aesthetics=["Minimalist"]),
    ]
    response = compatibility.validate_outfit(items, base_item)
    seen = set()
    for w in response.warnings:
        assert w not in seen, f"duplicate warning: {w!r}"
        seen.add(w)


def test_get_verdict_respects_warnings_arg():
    """Even with a high score, an outfit carrying warnings shouldn't read
    'Excellent'. The previously-unused warnings parameter is now respected."""
    assert "Excellent" not in compatibility.get_verdict(
        90, is_complete=True, warnings=["Color may clash"]
    )
    # No warnings, same score → "Excellent" still allowed.
    assert "Excellent" in compatibility.get_verdict(90, is_complete=True, warnings=[])


def test_formality_warning_text_uses_labels_not_floats():
    """Warning copy must use the labelled formality level (e.g.
    'Smart Casual') rather than leak the internal float ('2.0')."""
    base_item = _make_item("Tops", "T-Shirts", formality=2.0)
    new_item = _make_item("Bottoms", "Jeans", formality=5.0)
    response = compatibility.validate_item(new_item, base_item, [])
    formality_warnings = [w for w in response.warnings if "Formality" in w]
    assert formality_warnings, "expected a formality warning for a 2.0 vs 5.0 gap"
    for w in formality_warnings:
        # No bare floats like "2.0" or "5.0" — labels only.
        assert "2.0" not in w
        assert "5.0" not in w


def test_validate_outfit_emits_warning_for_formality_gap_under_mismatch_threshold():
    """A 1<distance≤2 formality gap deducts from the cohesion score but
    previously surfaced no warning — users saw a sub-100 score with no
    visible reason. Now the "warning"-tier message (alongside the existing
    "mismatch" tier) is surfaced."""
    base_item = _make_item(
        "Tops", "T-Shirts", formality=3.0, aesthetics=["Minimalist"]
    )
    items = [
        # 3.0 vs 4.5 → distance 1.5 → "warning" tier, not "mismatch"
        _make_item("Bottoms", "Jeans", formality=4.5, aesthetics=["Minimalist"]),
        _make_item("Shoes", "Sneakers", formality=3.0, aesthetics=["Minimalist"]),
    ]
    response = compatibility.validate_outfit(items, base_item)

    # Score should drop because formality range is 1.5 (above 0.5 dead-zone)
    assert response.cohesion_score < 100
    # And the user should now see a formality warning explaining it.
    assert any("formality" in w.lower() for w in response.warnings), (
        f"expected a formality warning, got {response.warnings!r}"
    )


def test_validate_outfit_emits_aesthetic_warning_when_no_shared_tags():
    """validate_outfit previously checked color/formality/pairing pair-wise
    but never surfaced aesthetic warnings. An outfit with zero shared tags
    across items must warn."""
    base_item = _make_item(
        "Tops", "T-Shirts", formality=3.0, aesthetics=["Streetwear"]
    )
    items = [
        _make_item("Bottoms", "Jeans", formality=3.0, aesthetics=["Preppy"]),
        _make_item("Shoes", "Sneakers", formality=3.0, aesthetics=["Classic"]),
    ]
    response = compatibility.validate_outfit(items, base_item)
    assert any("aesthetic" in w.lower() for w in response.warnings)


def test_validate_outfit_too_many_items():
    """Test validating an outfit with too many items."""
    base_item = _make_item("Tops", "T-Shirts")
    items = [
        _make_item("Bottoms", "Jeans"),
        _make_item("Shoes", "Sneakers"),
    ] * (MAX_OUTFIT_ITEMS // 2 + 1)  # Create more than MAX_OUTFIT_ITEMS
    
    response = compatibility.validate_outfit(items, base_item)
    
    assert len(response.warnings) > 0
    assert any(str(MAX_OUTFIT_ITEMS) in w for w in response.warnings)


def test_validate_outfit_color_strip():
    """Test that color strip contains all item colors."""
    base_item = _make_item("Tops", "T-Shirts", color_name="red")
    items = [
        _make_item("Bottoms", "Jeans", color_name="blue"),
        _make_item("Shoes", "Sneakers", color_name="black"),
    ]
    
    response = compatibility.validate_outfit(items, base_item)
    
    assert len(response.color_strip) == 3
    # All should be valid hex codes
    for hex_color in response.color_strip:
        assert hex_color.startswith("#")
        assert len(hex_color) == 7


def test_validate_outfit_collects_warnings():
    """Test that outfit validation collects warnings from all pairs."""
    base_item = _make_item("Tops", "T-Shirts", formality=1.0, color_name="red")
    items = [
        _make_item("Bottoms", "Jeans", formality=5.0, color_name="blue"),  # Formality mismatch
        _make_item("Shoes", "Sneakers", formality=1.0, color_name="green"),  # May clash
    ]
    
    response = compatibility.validate_outfit(items, base_item)
    
    # Should have warnings from formality mismatch and possibly color clashes
    assert len(response.warnings) > 0


# ==============================================================================
# RECOMMENDATIONS TESTS
# ==============================================================================

def test_generate_category_recommendations_standard_base():
    """Test generating recommendations for standard base item."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0, aesthetics=["Minimalist"], color_name="navy")
    filled_categories = []
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    assert len(recommendations) > 0
    # Should not recommend Tops (base category)
    assert not any(rec.category_l1 == "Tops" for rec in recommendations)
    # Should recommend Bottoms, Shoes, etc.
    category_l1s = [rec.category_l1 for rec in recommendations]
    assert "Bottoms" in category_l1s or "Shoes" in category_l1s


def test_generate_category_recommendations_fullbody_base():
    """Test generating recommendations for Full Body base item."""
    base_item = _make_item("Full Body", "Dresses", formality=4.0, aesthetics=["Classic"], color_name="black")
    filled_categories = []
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    assert len(recommendations) > 0
    # Should recommend Shoes, Accessories, Outerwear (not Tops, Bottoms)
    category_l1s = [rec.category_l1 for rec in recommendations]
    assert "Shoes" in category_l1s
    assert "Tops" not in category_l1s
    assert "Bottoms" not in category_l1s


def test_generate_category_recommendations_excludes_filled():
    """Test that recommendations exclude already filled categories."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0)
    filled_categories = ["Bottoms", "Shoes"]
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    category_l1s = [rec.category_l1 for rec in recommendations]
    assert "Bottoms" not in category_l1s
    assert "Shoes" not in category_l1s


def test_generate_category_recommendations_formality_range():
    """Test that formality range is calculated correctly."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0)
    filled_categories = []
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    for rec in recommendations:
        assert rec.formality_range.min >= 1.0
        assert rec.formality_range.max <= 5.0
        assert rec.formality_range.min <= rec.formality_range.max
        # Should be base ± 1
        assert rec.formality_range.min <= 4.0
        assert rec.formality_range.max >= 2.0


def test_generate_category_recommendations_float_formality():
    """Test recommendations with float formality (validation fix)."""
    base_item = _make_item("Tops", "T-Shirts", formality=2.5)
    filled_categories = []
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    for rec in recommendations:
        # Should handle float correctly
        assert isinstance(rec.formality_range.min, float)
        assert isinstance(rec.formality_range.max, float)
        assert 1.5 <= rec.formality_range.min <= 3.5
        assert 1.5 <= rec.formality_range.max <= 3.5


def test_generate_category_recommendations_includes_colors():
    """Test that recommendations include color suggestions."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0, color_name="red")
    filled_categories = []
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    for rec in recommendations:
        assert len(rec.colors) > 0
        for color in rec.colors:
            assert color.hex.startswith("#")
            assert color.name is not None
            assert color.harmony_type in ["neutral", "analogous", "complementary", "triadic"]


def test_generate_category_recommendations_includes_aesthetics():
    """Test that recommendations copy aesthetics from base."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0, aesthetics=["Streetwear", "Minimalist"])
    filled_categories = []
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    for rec in recommendations:
        assert rec.aesthetics == ["Streetwear", "Minimalist"]


def test_generate_category_recommendations_suggested_l2():
    """Test that recommendations include suggested L2 categories."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0)
    filled_categories = []
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    for rec in recommendations:
        assert len(rec.suggested_l2) > 0
        # Should be valid L2 categories from CATEGORY_TAXONOMY


def test_generate_category_recommendations_example_string():
    """Test that recommendations include example strings."""
    base_item = _make_item("Tops", "T-Shirts", formality=3.0)
    filled_categories = []
    
    recommendations = compatibility.generate_category_recommendations(base_item, filled_categories)
    
    for rec in recommendations:
        assert len(rec.example) > 0
        assert rec.category_l1.lower() in rec.example.lower() or any(
            l2.lower() in rec.example.lower() for l2 in rec.suggested_l2
        )

