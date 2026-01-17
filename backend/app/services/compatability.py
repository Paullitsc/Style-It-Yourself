"""
Outfit Validation & Compatibility Engine.

This module implements the core business logic for determining if clothing items
work together. It evaluates compatibility across four distinct dimensions and
aggregates them into cohesion scores and verdicts.



**Key Responsibilities:**

1.  **Multi-Dimensional Compatibility Checks:**
    * **Formality:** Calculates numeric distance between items (1-5 scale).
        * *Rule:* Gap > 1 level triggers a warning; Gap > 2 is a mismatch.
    * **Aesthetics:** Checks for intersection of style tags (e.g., "boho", "streetwear").
    * **Category Rules:** Enforces structural pairings, specifically identifying valid
        Shoe-to-Bottom combinations.
    * **Color Harmony:** (Imported) Validates hue/saturation relationships.

2.  **Validation Workflows:**
    * **Item Validation (`validate_item`):** Checks a single candidate item against
        a base item and the current outfit draft.
    * **Outfit Validation (`validate_outfit`):** Audits a complete look for
        composition (missing required categories) and overall cohesion.

3.  **Scoring System (`calculate_cohesion_score`):**
    * Uses a **penalty-based algorithm** starting at 100 points.
    * Deducts points for color clashes (-30), formality gaps (-40), and lack of
        shared aesthetic tags (-30).

4.  **Recommendation Logic:**
    * Generates targeted suggestions for missing categories based on the base item's
        color palette and formality level.
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
)
from app.services.color_harmony import check_color_compatibility, generate_recommended_colors


# FORMALITY CHECKING

def check_formality_compatibility(formality1: float, formality2: float) -> tuple[str, str | None]:
    """Check formality compatibility between two items.
    
    Logic:
    - Calculate absolute distance between formality levels
    - Distance <= 1: return ("ok", None)
    - Distance <= 2: return ("warning", "Formality gap is 2 levels")
    - Distance >= 3: return ("mismatch", "Formality mismatch: X levels apart")
    
    Returns:
        tuple: (status, warning_message)

    FIXED: method signatures from int to float
    """

    distance = abs(formality1 - formality2)
    
    if distance <= 1.0:
        return ("ok", None)
    elif distance <= 2.0:
        return ("warning", f"Formality gap is 2 levels ({formality1} vs {formality2})")
    else:  # distance >= 3.0
        return ("mismatch", f"Formality mismatch: {distance:.1f} levels apart ({formality1} vs {formality2})")


# AESTHETIC CHECKING

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


# CATEGORY PAIRING

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
    allowed_bottoms = SHOE_BOTTOM_PAIRINGS.get(shoe_l2, [])

    # Handle Full Body items (Dresses, Suits)
    bottom_l2 = bottom_item.category.l2
    if bottom_item.category.l1 == "Full Body":
        # Check if "Dresses" or "Suits" are in allowed list
        if "Dresses" in allowed_bottoms or "Suits" in allowed_bottoms:
            return ("ok", None)
        else:
            return ("warning", f"{shoe_l2} typically don't pair with {bottom_l2}")
    
    # Check regular bottom pairing
    if bottom_l2 in allowed_bottoms:
        return ("ok", None)
    else:
        return ("warning", f"{shoe_l2} typically don't pair with {bottom_l2}")


    



# SINGLE ITEM VALIDATION
# Used by: POST /api/validate-item

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
    color_warnings = []
    color_ok = True
    
    # Check vs base_item
    is_compatible, harmony_type = check_color_compatibility(new_item.color, base_item.color)
    if not is_compatible:
        color_ok = False
        color_warnings.append(f"Color may clash with base item ({harmony_type})")
    
    # Check vs each item in current_outfit
    for item in current_outfit:
        is_compatible, harmony_type = check_color_compatibility(new_item.color, item.color)
        if not is_compatible:
            color_ok = False
            color_warnings.append(f"Color may clash with {item.category.l2} ({harmony_type})")
    
    color_status = "ok" if color_ok else "warning"
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
    
    # 3. Aesthetic compatibility (only vs base_item)
    aesthetic_status, aesthetic_msg = check_aesthetic_compatibility(
        new_item.aesthetics, base_item.aesthetics
    )
    if aesthetic_msg:
        warnings.append(aesthetic_msg)
    
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
    
    return ValidateItemResponse(
        color_status=color_status,
        formality_status=formality_status,
        aesthetic_status=aesthetic_status,
        pairing_status=pairing_status,
        warnings=warnings
    )


# OUTFIT COMPOSITION

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


# COHESION SCORE

def calculate_cohesion_score(items: list[ClothingItemBase], base_item: ClothingItemBase) -> int:
    """Calculate outfit cohesion score (0-100).
    
    Logic:
    - Start with 100 points
    - Combine base_item with items for full outfit
    
    - Color penalty (up to -30 points):
        - Compare all item pairs for color compatibility
        - Count incompatible pairs
        - Penalty = (incompatible_pairs / total_pairs) * 30
    
    - Formality penalty (up to -40 points):
        - Find min and max formality in outfit
        - Penalty = min(range * 10, 40)
    
    - Aesthetic penalty (up to -30 points):
        - Collect all aesthetic tags from all items
        - Find common tags across ALL items
        - No common tags: -30 points
        - Only 1 common tag: -10 points
        - 2+ common tags: no penalty
    
    Returns:
        int: score between 0-100
    """
    # Combine all items
    all_items = [base_item] + items
    total_items = len(all_items)
    
    if total_items < 2:
        return 100  # Single item is always cohesive
    
    score = 100
    
    # Color penalty (up to -30 points)
    incompatible_pairs = 0
    total_pairs = 0
    
    for i in range(len(all_items)):
        for j in range(i + 1, len(all_items)):
            total_pairs += 1
            is_compatible, _ = check_color_compatibility(all_items[i].color, all_items[j].color)
            if not is_compatible:
                incompatible_pairs += 1
    
    if total_pairs > 0:
        color_penalty = (incompatible_pairs / total_pairs) * 30
        score -= color_penalty
    
    # Formality penalty (up to -40 points)
    # VALIDATION FIX: Explicitly handle float formality values
    formality_levels = [float(item.formality) for item in all_items]
    formality_range = max(formality_levels) - min(formality_levels)
    formality_penalty = min(formality_range * 10, 40)
    score -= formality_penalty
    
    # Aesthetic penalty (up to -30 points)
    all_aesthetics = [set(item.aesthetics) for item in all_items if item.aesthetics]
    
    if all_aesthetics:
        # Find common tags across ALL items
        common_tags = set.intersection(*all_aesthetics) if all_aesthetics else set()
        
        if len(common_tags) == 0:
            aesthetic_penalty = 30
        elif len(common_tags) == 1:
            aesthetic_penalty = 10
        else:  # 2+ common tags
            aesthetic_penalty = 0
    else:
        aesthetic_penalty = 0  # No aesthetics = no penalty
    
    score -= aesthetic_penalty
    
    # Ensure score is between 0-100
    return max(0, min(100, int(score)))


def get_verdict(score: int, is_complete: bool, warnings: list[str]) -> str:
    """Generate a human-readable verdict for the outfit.
    
    Logic:
    - If not complete: "Incomplete outfit - missing required items"
    - Score >= 85: "Excellent cohesive look!"
    - Score >= 70: "Good outfit with minor style considerations"
    - Score >= 50: "Decent outfit, but some elements may clash"
    - Score < 50: "Consider revising - multiple style conflicts"
    """
    if not is_complete:
        return "Incomplete outfit - missing required items"
    
    if score >= 85:
        return "Excellent cohesive look!"
    elif score >= 70:
        return "Good outfit with minor style considerations"
    elif score >= 50:
        return "Decent outfit, but some elements may clash"
    else:
        return "Consider revising - multiple style conflicts"


# FULL OUTFIT VALIDATION
# Used by: POST /api/validate-outfit

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
    
    # 3. Check total items
    warnings = []
    if len(full_outfit) > MAX_OUTFIT_ITEMS:
        warnings.append(f"Outfit has {len(full_outfit)} items (max: {MAX_OUTFIT_ITEMS})")
    
    if missing_categories:
        warnings.append(f"Missing required categories: {', '.join(missing_categories)}")
    
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
            
            # Formality check
            status, msg = check_formality_compatibility(item1.formality, item2.formality)
            if status == "mismatch":
                warnings.append(msg)
            
            # Category pairing check
            status, msg = check_category_pairing(item1, item2)
            if status == "warning":
                warnings.append(msg)
    
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


# RECOMMENDATIONS GENERATOR
# Used by: POST /api/recommendations

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
    
    # 2. For each category to recommend
    for category_l1 in categories_to_recommend:
        # Generate colors
        colors = generate_recommended_colors(base_item.color, include_neutrals=True)
        
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