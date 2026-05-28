"""
Outfit Validation & Compatibility Engine.

This module implements the core business logic for determining if clothing items
work together. It evaluates compatibility across four distinct dimensions and
aggregates them into cohesion scores and verdicts.

**Key Responsibilities:**

1.  **Multi-Dimensional Compatibility Checks:**
    * **Formality:** Numeric distance on the 1-5 scale. distance ≤ 1 = ok;
      ≤ 2 = warning; > 2 = mismatch. Warning copy uses FORMALITY_LEVELS labels
      rather than raw float values.
    * **Aesthetics:** ≥1 shared tag = cohesive (single-item validator and outfit
      scorer share this predicate).
    * **Category Rules:** Shoe-to-Bottom pairings via SHOE_BOTTOM_PAIRINGS;
      unknown shoe types stay silent rather than confidently warning.
    * **Color Harmony:** (Imported) Validates hue/saturation relationships.

2.  **Validation Workflows:**
    * **Item Validation (`validate_item`):** Checks a single candidate item against
      a base item and the current outfit draft.
    * **Outfit Validation (`validate_outfit`):** Audits a complete look for
      composition (missing required categories, per-category caps, duplicate
      singletons) and overall cohesion.

3.  **Scoring System (`calculate_cohesion_score`):**
    Penalty-based, starts at 100. Caps (industry-aligned weights — color is
    the heaviest, formality treated as occasion-fit not dominant axis):
      * Color clashes: up to -40 (scaled by count of incompatible pairs)
      * Formality range: up to -30 (with a 0.5-level dead-zone for float drift)
      * Aesthetics: -30 when zero shared tags, else 0
    (No over-max-items penalty — the UI structurally caps total items at
    MAX_OUTFIT_ITEMS, so the branch was unreachable.)

4.  **Recommendation Logic:**
    * Generates targeted suggestions for missing categories based on the base
      item's color palette and formality level.
"""

from app.models.schemas import (
    ClothingItemBase,
    ValidateItemResponse,
    ValidateOutfitResponse,
    CategoryRecommendation,
    FormalityRange,
)
from app.utils.constants import (
    CATEGORY_TAXONOMY,
    SHOE_BOTTOM_PAIRINGS,
    REQUIRED_CATEGORIES_STANDARD,
    REQUIRED_CATEGORIES_FULLBODY,
    MAX_OUTFIT_ITEMS,
    MAX_ACCESSORIES,
    MAX_OUTERWEAR,
    FORMALITY_LEVELS,
)
from app.services.color_harmony import check_color_compatibility, generate_recommended_colors


# ==============================================================================
# FORMALITY CHECKING
# ==============================================================================

def _formality_label(f: float) -> str:
    """Map a float formality to its labelled level (clamped to 1-5).

    Uses half-up rounding (int(f + 0.5)) rather than Python's built-in
    banker's rounding so 2.5 → 3 (not 2) and 3.5 → 4 (not 4-by-banker's),
    keeping the mapping symmetric and user-predictable.
    """
    return FORMALITY_LEVELS[max(1, min(5, int(f + 0.5)))]


def check_formality_compatibility(formality1: float, formality2: float) -> tuple[str, str | None]:
    """Check formality compatibility between two items.

    Logic:
    - Distance <= 1: ok
    - Distance <= 2: warning
    - Distance >= 3: mismatch

    Warning text uses FORMALITY_LEVELS labels (e.g. "Smart Casual") rather
    than raw float values, so the internal 1-5 scale doesn't leak into UI copy.
    """
    distance = abs(formality1 - formality2)
    label1 = _formality_label(formality1)
    label2 = _formality_label(formality2)

    if distance <= 1.0:
        return ("ok", None)
    if distance <= 2.0:
        return ("warning", f"Formality gap: {label1} vs {label2}")
    return ("mismatch", f"Formality mismatch: {label1} vs {label2}")


# ==============================================================================
# AESTHETIC CHECKING
# ==============================================================================

def check_aesthetic_compatibility(aesthetics1: list[str], aesthetics2: list[str]) -> tuple[str, str | None]:
    """Check aesthetic tag compatibility.
    
    Logic:
    - Find intersection of both aesthetic lists
    - If any shared tags: return ("cohesive", None)
    - If both have tags but no overlap: return ("warning", "No shared aesthetic tags")
    - If either list is empty: return ("cohesive", None) - allow flexibility
    
    Returns:
        tuple: (status, warning_message)
    """
    set1 = set(aesthetics1) if aesthetics1 else set()
    set2 = set(aesthetics2) if aesthetics2 else set()
    

    if not set1 or not set2:
        return ("cohesive", None)
    
    intersection = set1 & set2
    if intersection:
        return ("cohesive", None)
    else:
        return ("warning", "No shared aesthetic tags")


# ==============================================================================
# CATEGORY PAIRING
# ==============================================================================

def check_category_pairing(item1: ClothingItemBase, item2: ClothingItemBase) -> tuple[str, str | None]:
    """Check if two items pair well based on category rules.
    
    Logic:
    - Only check shoe-bottom pairings (most important rule)
    - Identify which item is shoes (category.l1 == "Shoes")
    - Identify which item is bottom (category.l1 == "Bottoms" or "Full Body")
    - If both identified, check SHOE_BOTTOM_PAIRINGS:
        - Get allowed bottoms for the shoe type (l2)
        - If bottom's l2 not in allowed list: return ("warning", "X typically don't pair with Y")
    - If not a shoe-bottom pair: return ("ok", None)
    
    Returns:
        tuple: (status, warning_message)
    """

    shoe_item, bottom_item = None, None

    if item1.category.l1 == "Shoes":
        shoe_item = item1
        if item2.category.l1 == "Bottoms" or item2.category.l1 == "Full Body":
            bottom_item = item2

    elif item2.category.l1 == "Shoes":
        shoe_item = item2
        if item1.category.l1 == "Bottoms" or item1.category.l1 == "Full Body":
            bottom_item = item1
    
    if not shoe_item or not bottom_item:
        return ("ok", None)

    shoe_l2 = shoe_item.category.l2
    bottom_l2 = bottom_item.category.l2

    # If we have no rule for this shoe type, stay silent rather than confidently
    # warning. dict.get(..., []) would conflate "no rule" with "empty allow list"
    # and flag every bottom as a mismatch.
    if shoe_l2 not in SHOE_BOTTOM_PAIRINGS:
        return ("ok", None)
    allowed_bottoms = SHOE_BOTTOM_PAIRINGS[shoe_l2]

    # Full Body L2 values ("Dresses", "Suits") live in the same allowed_bottoms
    # list as regular bottoms, so one membership check covers both.
    if bottom_l2 in allowed_bottoms:
        return ("ok", None)
    return ("warning", f"{shoe_l2} typically don't pair with {bottom_l2}")


    



# ==============================================================================
# SINGLE ITEM VALIDATION
# Used by: POST /api/validate-item
# ==============================================================================

def validate_item(
    new_item: ClothingItemBase,
    base_item: ClothingItemBase,
    current_outfit: list[ClothingItemBase],
) -> ValidateItemResponse:
    """Validate a new item against the base item and current outfit.
    
    Logic:
    1. Check color compatibility:
        - Compare new_item vs base_item using check_color_compatibility
        - Also compare vs each item in current_outfit
        - Collect any warnings
    
    2. Check formality compatibility:
        - Compare new_item vs base_item using check_formality_compatibility
        - Also compare vs each item in current_outfit
        - Track worst status (ok < warning < mismatch)
    
    3. Check aesthetic compatibility:
        - Compare new_item vs base_item using check_aesthetic_compatibility
    
    4. Check category pairing:
        - Compare new_item vs base_item using check_category_pairing
        - Also compare vs each item in current_outfit
    
    5. Return ValidateItemResponse with all statuses and collected warnings
    """
    # VALIDATION NOTE: check_color_compatibility and ValidateItemResponse
    # are already imported at module level, so no redundant imports needed
    warnings = []
    
    # 1. Color compatibility checks
    # Any incompatible pair escalates color_status to "mismatch" (parity with
    # formality_status). The internal harmony_type label is intentionally not
    # interpolated into the warning text — it would surface as "(none)".
    color_warnings = []
    color_ok = True

    # Check vs base_item
    is_compatible, _ = check_color_compatibility(new_item.color, base_item.color)
    if not is_compatible:
        color_ok = False
        color_warnings.append("Color may clash with base item")

    # Check vs each item in current_outfit
    for item in current_outfit:
        is_compatible, _ = check_color_compatibility(new_item.color, item.color)
        if not is_compatible:
            color_ok = False
            color_warnings.append(f"Color may clash with {item.category.l2}")

    color_status = "ok" if color_ok else "mismatch"
    warnings.extend(color_warnings)
    
    # 2. Formality compatibility checks
    # VALIDATION FIX: Now handles float formality values correctly
    formality_status = "ok"
    formality_warnings = []
    
    # Check vs base_item
    status, msg = check_formality_compatibility(new_item.formality, base_item.formality)
    if status == "mismatch":
        formality_status = "mismatch"
        formality_warnings.append(msg)
    elif status == "warning" and formality_status == "ok":
        formality_status = "warning"
        formality_warnings.append(msg)
    
    # Check vs each item in current_outfit
    for item in current_outfit:
        status, msg = check_formality_compatibility(new_item.formality, item.formality)
        if status == "mismatch":
            formality_status = "mismatch"
            formality_warnings.append(msg)
        elif status == "warning" and formality_status == "ok":
            formality_status = "warning"
            formality_warnings.append(msg)
    
    warnings.extend(formality_warnings)
    
    # 3. Aesthetic compatibility — check vs base_item AND each current_outfit
    # item so a drifted outfit isn't masked by a matching base.
    aesthetic_status = "cohesive"
    aesthetic_warnings = []

    status, _ = check_aesthetic_compatibility(new_item.aesthetics, base_item.aesthetics)
    if status == "warning":
        aesthetic_status = "warning"
        aesthetic_warnings.append("No shared aesthetic tags with base item")

    for item in current_outfit:
        status, _ = check_aesthetic_compatibility(new_item.aesthetics, item.aesthetics)
        if status == "warning":
            aesthetic_status = "warning"
            aesthetic_warnings.append(
                f"No shared aesthetic tags with {item.category.l2}"
            )

    warnings.extend(aesthetic_warnings)
    
    # 4. Category pairing checks
    pairing_status = "ok"
    pairing_warnings = []
    
    # Check vs base_item
    status, msg = check_category_pairing(new_item, base_item)
    if status == "warning":
        pairing_status = "warning"
        pairing_warnings.append(msg)
    
    # Check vs each item in current_outfit
    for item in current_outfit:
        status, msg = check_category_pairing(new_item, item)
        if status == "warning":
            pairing_status = "warning"
            pairing_warnings.append(msg)
    
    warnings.extend(pairing_warnings)

    # Two outfit pieces sharing the same l2 (e.g. multiple "Watches" under
    # MAX_ACCESSORIES=3) would produce identical warning strings. Dedup before
    # returning so the user sees each issue once.
    warnings = list(dict.fromkeys(warnings))

    return ValidateItemResponse(
        color_status=color_status,
        formality_status=formality_status,
        aesthetic_status=aesthetic_status,
        pairing_status=pairing_status,
        warnings=warnings
    )


# ==============================================================================
# OUTFIT COMPOSITION
# ==============================================================================

def check_outfit_composition(items: list[ClothingItemBase]) -> tuple[bool, list[str]]:
    """Check if outfit has required composition.
    
    Logic:
    - Extract all L1 categories from items
    - Check if "Full Body" is present:
        - If yes: only need "Shoes" -> check REQUIRED_CATEGORIES_FULLBODY
        - If no: need "Tops", "Bottoms", "Shoes" -> check REQUIRED_CATEGORIES_STANDARD
    - Build list of missing required categories
    
    Returns:
        tuple: (is_complete, list_of_missing_categories)
    """
    # Extract L1 categories
    l1_categories = {item.category.l1 for item in items}
    
    # Check if Full Body is present
    if "Full Body" in l1_categories:
        required = set(REQUIRED_CATEGORIES_FULLBODY)
    else:
        required = set(REQUIRED_CATEGORIES_STANDARD)
    
    missing = required - l1_categories
    is_complete = len(missing) == 0
    
    return (is_complete, list(missing))


def get_categories_in_outfit(items: list[ClothingItemBase]) -> dict[str, list[ClothingItemBase]]:
    """Group outfit items by L1 category.
    
    Logic:
    - Create dict with L1 categories as keys
    - Group items into their respective categories
    - Useful for checking duplicates and composition
    
    Returns:
        dict: {category_l1: [items in that category]}
    """
    categories = {}
    for item in items:
        l1 = item.category.l1
        if l1 not in categories:
            categories[l1] = []
        categories[l1].append(item)
    return categories


# ==============================================================================
# COHESION SCORE
# ==============================================================================

def calculate_cohesion_score(items: list[ClothingItemBase], base_item: ClothingItemBase) -> int:
    """Cohesion score (0-100). Penalty-based; single item ⇒ 100.

    - Color: 10 per incompatible pair, capped at 40.
    - Formality: max(0, range - 0.5) * 10, capped at 30.
    - Aesthetics: 30 if 2+ tagged items share no tags, else 0.

    No item-count penalty — UI caps total at MAX_OUTFIT_ITEMS. The
    "too many items" warning in validate_outfit still downgrades the
    verdict via get_verdict's no-warnings gate.
    """
    # Combine all items
    all_items = [base_item] + items
    total_items = len(all_items)
    
    if total_items < 2:
        return 100  # Single item is always cohesive
    
    score = 100
    
    # Count incompatible pairs once; the cap and weighting are in the comment
    # block below where the penalty is computed.
    incompatible_pairs = 0
    for i in range(len(all_items)):
        for j in range(i + 1, len(all_items)):
            is_compatible, _ = check_color_compatibility(all_items[i].color, all_items[j].color)
            if not is_compatible:
                incompatible_pairs += 1

    # Color penalty (up to -40 points). Industry sources consistently rank
    # color discipline (3-color rule, 60-30-10, harmony) as the single most
    # observable cohesion signal in an outfit — heavier than formality range.
    color_penalty = min(incompatible_pairs * 10, 40)
    score -= color_penalty

    # Formality penalty (up to -30 points). Treated as occasion-fit (the
    # industry framing) rather than the dominant axis; a 0.5-level dead-zone
    # absorbs small float drift, everything above scales linearly.
    formality_levels = [float(item.formality) for item in all_items]
    formality_range = max(formality_levels) - min(formality_levels)
    formality_penalty = min(max(0.0, formality_range - 0.5) * 10, 30)
    score -= formality_penalty

    # Aesthetic penalty (up to -30 points). Threshold matches
    # check_aesthetic_compatibility: ≥1 shared tag is cohesive (no penalty);
    # 0 shared tags is penalized.
    all_aesthetics = [set(item.aesthetics) for item in all_items if item.aesthetics]
    if len(all_aesthetics) >= 2:
        common_tags = set.intersection(*all_aesthetics)
        aesthetic_penalty = 0 if common_tags else 30
    else:
        aesthetic_penalty = 0  # Single or zero items with tags — nothing to disagree about.

    score -= aesthetic_penalty

    # NB: there used to be an over-max-items penalty here, but the UI caps
    # each L1 category at one slot (5 outfit slots + 1 base = MAX_OUTFIT_ITEMS),
    # so it was structurally unreachable. The "Outfit has N items" warning in
    # validate_outfit stays as defense-in-depth for direct API calls but no
    # longer moves the score.

    # Ensure score is between 0-100
    return max(0, min(100, int(score)))


def get_verdict(score: int, is_complete: bool, warnings: list[str]) -> str:
    """Generate a human-readable verdict for the outfit.

    Verdict tiers are gated by both the cohesion score AND the presence of
    warnings. An "Excellent" verdict implies a clean look — outfits carrying
    any warning are capped at "Good" regardless of score.
    """
    if not is_complete:
        return "Incomplete outfit - missing required items"

    if score >= 85 and not warnings:
        return "Excellent cohesive look!"
    if score >= 70:
        return "Good outfit with minor style considerations"
    if score >= 50:
        return "Decent outfit, but some elements may clash"
    return "Consider revising - multiple style conflicts"


# ==============================================================================
# FULL OUTFIT VALIDATION
# Used by: POST /api/validate-outfit
# ==============================================================================

def validate_outfit(
    items: list[ClothingItemBase],
    base_item: ClothingItemBase,
) -> ValidateOutfitResponse:
    """Validate a complete outfit.
    
    Logic:
    1. Combine base_item + items into full outfit
    2. Check composition using check_outfit_composition
    3. Check total items <= MAX_OUTFIT_ITEMS
    4. Calculate cohesion_score using calculate_cohesion_score
    5. Validate each item pair and collect warnings
    6. Build color_strip (list of hex codes from all items)
    7. Generate verdict using get_verdict
    8. Return ValidateOutfitResponse
    """
    # 1. Combine base_item + items
    full_outfit = [base_item] + items
    
    # 2. Check composition
    is_complete, missing_categories = check_outfit_composition(full_outfit)
    
    # 3. Check total items and per-category caps
    warnings = []
    if len(full_outfit) > MAX_OUTFIT_ITEMS:
        # No score impact (UI caps total); still downgrades the verdict
        # via get_verdict's no-warnings gate.
        warnings.append(f"Outfit has {len(full_outfit)} items (max: {MAX_OUTFIT_ITEMS})")

    if missing_categories:
        warnings.append(f"Missing required categories: {', '.join(missing_categories)}")

    # Per-category caps and singleton-category checks. MAX_ACCESSORIES and
    # MAX_OUTERWEAR were unused constants before this; the singleton categories
    # (Tops/Bottoms/Shoes/Full Body) shouldn't appear more than once.
    items_by_l1 = get_categories_in_outfit(full_outfit)
    if len(items_by_l1.get("Accessories", [])) > MAX_ACCESSORIES:
        warnings.append(
            f"Too many accessories ({len(items_by_l1['Accessories'])} — max: {MAX_ACCESSORIES})"
        )
    if len(items_by_l1.get("Outerwear", [])) > MAX_OUTERWEAR:
        warnings.append(
            f"Too many outerwear pieces ({len(items_by_l1['Outerwear'])} — max: {MAX_OUTERWEAR})"
        )
    for l1 in ("Tops", "Bottoms", "Shoes", "Full Body"):
        count = len(items_by_l1.get(l1, []))
        if count > 1:
            warnings.append(f"Multiple {l1} in outfit ({count})")
    
    # 4. Calculate cohesion score
    cohesion_score = calculate_cohesion_score(items, base_item)
    
    # 5. Validate each item pair and collect warnings
    for i in range(len(full_outfit)):
        for j in range(i + 1, len(full_outfit)):
            item1, item2 = full_outfit[i], full_outfit[j]
            
            # Color check
            is_compatible, harmony_type = check_color_compatibility(item1.color, item2.color)
            if not is_compatible:
                warnings.append(f"{item1.category.l2} and {item2.category.l2} colors may clash")
            
            # Formality check — surface both "warning" and "mismatch" tiers.
            # The cohesion score deducts for any range above the 0.5 dead-zone,
            # so a "warning"-tier pair (1 < distance ≤ 2) silently reduced the
            # score with no visible reason. dedup at the end will collapse
            # identical strings.
            status, msg = check_formality_compatibility(item1.formality, item2.formality)
            if status in ("warning", "mismatch"):
                warnings.append(msg)
            
            # Category pairing check
            status, msg = check_category_pairing(item1, item2)
            if status == "warning":
                warnings.append(msg)

    # Outfit-level aesthetic check (not pair-wise to avoid duplicate noise).
    # Guard `>= 2`: a single tagged item can't disagree with itself, so there's
    # nothing meaningful to warn about until two tagged items exist.
    aesthetic_sets = [set(item.aesthetics) for item in full_outfit if item.aesthetics]
    if len(aesthetic_sets) >= 2 and not set.intersection(*aesthetic_sets):
        warnings.append("No shared aesthetic tags across the outfit")

    # Dedupe — pair-wise checks can produce the same warning string from
    # multiple distinct pairs (e.g. three items at formality 1,1,5 surfaces
    # the same Casual-vs-Black-Tie mismatch twice). dict.fromkeys preserves
    # first-seen order on Python 3.7+.
    warnings = list(dict.fromkeys(warnings))

    # 6. Build color strip
    color_strip = [item.color.hex for item in full_outfit]

    # 7. Generate verdict
    verdict = get_verdict(cohesion_score, is_complete, warnings)
    
    return ValidateOutfitResponse(
        is_complete=is_complete,
        cohesion_score=cohesion_score,
        verdict=verdict,
        warnings=warnings,
        color_strip=color_strip
    )


# ==============================================================================
# RECOMMENDATIONS GENERATOR
# Used by: POST /api/recommendations
# ==============================================================================

def generate_category_recommendations(
    base_item: ClothingItemBase,
    filled_categories: list[str],
) -> list[CategoryRecommendation]:
    """Generate recommendations for empty outfit categories.
    
    Logic:
    1. Determine which categories to recommend:
        - If base is "Full Body": recommend ["Shoes", "Accessories", "Outerwear"]
        - Otherwise: recommend all except base's L1 category
        - Exclude already filled_categories
    
    2. For each category to recommend:
        - Generate colors using generate_recommended_colors(base_item.color)
        - Calculate formality_range: base ± 1, clamped to 1-5
        - Copy aesthetics from base_item
        - Get suggested_l2 from CATEGORY_TAXONOMY[category]
        - Filter suggested_l2 by formality if needed:
            - Formal (4-5): prefer Dress Pants, Oxfords, Loafers, Heels
            - Casual (1-2): prefer Jeans, Sneakers, Sandals
        - Generate example string
    
    3. Return list of CategoryRecommendation
    """
    recommendations = []
    
    # 1. Determine which categories to recommend
    base_l1 = base_item.category.l1
    
    if base_l1 == "Full Body":
        categories_to_recommend = ["Shoes", "Accessories", "Outerwear"]
    else:
        # Recommend all except base's category
        all_categories = list(CATEGORY_TAXONOMY.keys())
        categories_to_recommend = [cat for cat in all_categories if cat != base_l1]
    
    # Exclude already filled categories
    categories_to_recommend = [cat for cat in categories_to_recommend if cat not in filled_categories]

    # Colors don't depend on the slot category — compute once and reuse.
    colors = generate_recommended_colors(base_item.color, include_neutrals=True)

    # 2. For each category to recommend
    for category_l1 in categories_to_recommend:
        
        # Calculate formality range: base ± 1, clamped to 1-5
        # VALIDATION FIX: Explicitly handle float formality
        base_formality = float(base_item.formality)
        formality_min = max(1.0, base_formality - 1.0)
        formality_max = min(5.0, base_formality + 1.0)
        formality_range = FormalityRange(min=formality_min, max=formality_max)
        
        # Copy aesthetics from base
        aesthetics = base_item.aesthetics.copy()
        
        # Get suggested_l2 from CATEGORY_TAXONOMY
        suggested_l2 = CATEGORY_TAXONOMY.get(category_l1, []).copy()
        
        # Filter suggested_l2 by formality if needed
        if base_formality >= 4:  # Formal (4-5)
            formal_preferences = ["Dress Pants", "Oxfords", "Loafers", "Heels"]
            # Prioritize formal items
            suggested_l2 = [item for item in suggested_l2 if item in formal_preferences] + \
                          [item for item in suggested_l2 if item not in formal_preferences]
        elif base_formality <= 2:  # Casual (1-2)
            casual_preferences = ["Jeans", "Sneakers", "Sandals", "T-Shirts", "Shorts"]
            # Prioritize casual items
            suggested_l2 = [item for item in suggested_l2 if item in casual_preferences] + \
                          [item for item in suggested_l2 if item not in casual_preferences]
        
        # VALIDATION IMPROVEMENT: Generate example string with better fallbacks
        if suggested_l2 and colors:
            example = f"{suggested_l2[0]} in {colors[0].name}"
        elif suggested_l2:
            example = f"{suggested_l2[0]} in matching colors"
        elif colors:
            example = f"{category_l1} in {colors[0].name}"
        else:
            example = f"{category_l1} in matching colors"
        
        recommendations.append(CategoryRecommendation(
            category_l1=category_l1,
            colors=colors,
            formality_range=formality_range,
            aesthetics=aesthetics,
            suggested_l2=suggested_l2,
            example=example
        ))
    
    return recommendations