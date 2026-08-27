"""Color harmony calculations and utilities.
uses the HSL (Hue, Saturation, Lightness) color model to mathematically determine if colors look good together and to generate matching color palettes."""

from enum import Enum

from app.models.schemas import HSL, Color, RecommendedColor
from app.utils.constants import NEUTRAL_COLORS, NEUTRAL_COLOR_DATA


class Harmony(str, Enum):
    """Harmony labels returned by check_color_compatibility.

    A str subclass, so existing string comparisons and JSON serialization
    keep working; __str__ is pinned to the raw value for the same reason.
    """

    NEUTRAL = "neutral"
    ANALOGOUS = "analogous"
    COMPLEMENTARY = "complementary"
    TRIADIC = "triadic"
    NONE = "none"

    __str__ = str.__str__


# British/American spelling alias so "grey" still classifies as neutral
# without having to duplicate the entry in NEUTRAL_COLORS / NEUTRAL_COLOR_DATA.
_NEUTRAL_NAME_ALIASES = {"grey": "gray"}


def is_neutral_color(color_name: str) -> bool:
    """Check if a color name is considered neutral."""
    name = color_name.lower()
    name = _NEUTRAL_NAME_ALIASES.get(name, name)
    return name in NEUTRAL_COLORS



def get_hue_distance(h1: int, h2: int) -> int:
    """Calculate the shortest distance between two hues on the color wheel."""
    distance = abs(h1 - h2)
    return min(distance, 360 - distance)

def get_hue_distance_HSL(hsl1: HSL, hsl2: HSL) -> int:
    """Wrapper function for HSL"""
    h1 = hsl1.h
    h2 = hsl2.h
    return get_hue_distance(h1, h2)

def are_colors_analogous(hsl1: HSL, hsl2: HSL, threshold: int = 30) -> bool:
    """Check if two colors are analogous. This is purely based on the hue"""
    hue_distance = get_hue_distance_HSL(hsl1, hsl2)
    return hue_distance <= threshold


def are_colors_complementary(hsl1: HSL, hsl2: HSL, threshold: int = 15) -> bool:
    """Check if two colors are complementary.
    Since humans visually group together similar hues, we introduce some level of tolerance ±15°
    """
    hue_distance = get_hue_distance_HSL(hsl1, hsl2)
    l = 180 - threshold
    r = 180 + threshold

    return l <= hue_distance <= r


def are_colors_triadic(hsl1: HSL, hsl2: HSL, threshold: int = 15) -> bool:
    """Check if two colors form a triadic pair (120° apart). """
    hue_distance = get_hue_distance_HSL(hsl1, hsl2)
    l = 120 - threshold
    r = 120 + threshold
    return l <= hue_distance <= r


def are_three_colors_triadic(
    hsl1: HSL, hsl2: HSL, hsl3: HSL, threshold: int = 15
) -> bool:
    """Check if three colors form a full triad.

    True only when every pairwise arc sits inside 120° ± threshold, i.e. the
    three hues are evenly spread around the wheel.
    """
    return (
        are_colors_triadic(hsl1, hsl2, threshold)
        and are_colors_triadic(hsl2, hsl3, threshold)
        and are_colors_triadic(hsl1, hsl3, threshold)
    )


def check_color_compatibility(color1: Color, color2: Color) -> tuple[bool, Harmony]:
    """Check if two colors are compatible.

    Returns (compatible, harmony); the label is a Harmony member, which is a
    str subclass, so callers comparing against plain strings keep working.
    For full three-color triads see are_three_colors_triadic.
    """

    # neutral colors are compatible with every color.
    if is_neutral_color(color1.name) or is_neutral_color(color2.name):
        return True, Harmony.NEUTRAL
    # analogous colors are compatible since they share a common hue and provide a unified look
    elif are_colors_analogous(color1.hsl, color2.hsl):
        return True, Harmony.ANALOGOUS
    # complementary colors are compatible since they make each other 'pop'. They create a contrast.
    elif are_colors_complementary(color1.hsl, color2.hsl):
        return True, Harmony.COMPLEMENTARY
    elif are_colors_triadic(color1.hsl, color2.hsl):
        return True, Harmony.TRIADIC
    else:
        return False, Harmony.NONE

def hsl_to_rgb(hsl: HSL) -> tuple[int, int, int]:
    """
    Convert HSL to hex color code
    """
    # Normalize HSL values
    h : float = float(hsl.h % 360)
    s : float = float(hsl.s) / 100.0
    l : float = float(hsl.l) / 100.0

    c = s * (1.0 - abs(2.0*l - 1.0))
    hp = h / 60.0
    x = c * (1.0 - abs((hp % 2.0) - 1.0))
    m = l - 0.5*c

    rgb_primes = [
        (c, x, 0.0),
        (x, c, 0.0),
        (0.0, c, x),
        (0.0, x, c),
        (x, 0.0, c),
        (c, 0.0, x),
    ]


    r_p, g_p, b_p = rgb_primes[int(hp) % 6]

    r = int((r_p + m) * 255)
    g = int((g_p + m) * 255)
    b = int((b_p + m) * 255)

    return r, g, b


def hsl_to_hex(hsl: HSL) -> str:
    """Convert HSL to hex color code.
    HSL -> RGB -> 0 padded hex
    """
    r, g, b = hsl_to_rgb(hsl)
    return f"#{r:02X}{g:02X}{b:02X}"


def get_color_name_from_hsl(hsl: HSL) -> str:
    """Estimate a fashion color name from HSL values.
    
    Logic:
    - Map hue ranges to color names:
        - 0-15, 345-360: red
        - 15-45: orange
        - 45-65: yellow
        - 65-150: green
        - 150-200: cyan/teal
        - 200-230: blue/navy
        - 230-290: purple/violet
        - 290-345: pink/magenta
    - Handle special cases:
        - Low saturation (<10%) -> gray/black/white based on lightness
        - Very dark (<15% lightness) -> black
        - Very light (>90% lightness) -> white
    """
    h, s, l = hsl.get_hsl()


    # Saturation and lightness relate at the extremes: the closer lightness
    # sits to either pole, the less saturation it takes for a color to read
    # as achromatic. s < 10 is always neutral; the tolerance widens past
    # l = 25 / l = 75.
    neutral_sat_tolerance = 10 + max(0, abs(l - 50) - 25)
    if s < neutral_sat_tolerance:
        if l < 15:
            return "black"
        elif l > 90:
            return "white"
        else:
            return "gray"

    # Extreme light values:
    elif l < 5:
        return "black"
    elif l > 95:
        return "white"

    # Warm earth tones read as neutrals long before their vivid hue names:
    # dark warm hues are brown, very light ones beige or cream, muted
    # mid-lightness ones tan.
    if 15 <= h < 65:
        if l <= 35 and s <= 60:
            return "brown"
        if l >= 85:
            return "beige" if s <= 70 else "cream"
        if s <= 45:
            return "tan"


    # Hue buckets
    if (0 <= h < 15) or (345 <= h <= 360):
        return "red"
    if 15 <= h < 45:
        return "orange"
    if 45 <= h < 65:
        return "yellow"
    if 65 <= h < 150:
        return "green"
    if 150 <= h < 200:
        if l <= 50:
            return "teal"
        else:
            return "cyan"
    if 200 <= h < 230:
        if l <= 20:
            return "navy"
        else:
            return "blue"
    if 230 <= h < 290:
        if l <= 50:
            return "violet"
        else:
            return "purple"
    if 290 <= h < 345:
        if l <= 65:
            return "magenta"
        else:
            return "pink"

    # unreachable
    return "clear"

def hsl_to_color(hsl: HSL) -> Color:
    hex = hsl_to_hex(hsl)
    name = get_color_name_from_hsl(hsl)
    is_neutral = is_neutral_color(name)
    return Color(hex=hex,hsl=hsl,name=name,is_neutral=is_neutral)


def get_analogous_hsl(base_hsl: HSL) -> tuple[HSL, HSL]:
    """Generate analogous colors (±30° from base).
    """
    hsl_list = []
    h,s,l = base_hsl.get_hsl()

    h1 = (h + 30) % 360
    h2 = (h - 30) % 360

    hsl1 = HSL(h=h1,s=s,l=l)
    hsl2 = HSL(h=h2,s=s,l=l)


    return hsl1, hsl2

def get_triadic_hsl(base_hsl: HSL) -> tuple[HSL, HSL]:
    """Generate triadic colors (±120° from base)."""
    h, s, l = base_hsl.get_hsl()
    h1 = (h + 120) % 360
    h2 = (h - 120) % 360
    return HSL(h=h1, s=s, l=l), HSL(h=h2, s=s, l=l)


def get_complementary_hsl(base_hsl: HSL) -> HSL:
    """Get the complementary color (180° opposite)."""
    h,s,l = base_hsl.get_hsl()
    hp = (h + 180) % 360

    complementary_hsl = HSL(h=hp,s=s,l=l)
    return complementary_hsl



def generate_recommended_colors(base_color: Color, include_neutrals: bool = True) -> list[RecommendedColor]:
    """Generate a list of recommended colors based on a base color.
    
    Used by: POST /api/recommendations
    
    Logic:
    1. If include_neutrals, add standard neutrals (white, black, gray, navy, beige)
    2. If base_color is NOT neutral:
        - Generate 2 analogous colors using get_analogous_hsl
        - Generate 1 complementary color using get_complementary_hsl
        - Convert each to hex and get color name
    3. Return list of RecommendedColor objects
    """

    def hsl_to_rec(rec_hsl: HSL, harmony: str) -> RecommendedColor:
        # Label by generation intent, not by re-deriving from check_color_compatibility.
        # The latter short-circuits to "neutral" whenever either input has a neutral
        # name (e.g. navy base), masking the actual analogous/complementary relationship.
        hex = hsl_to_hex(rec_hsl)
        rec_name = get_color_name_from_hsl(rec_hsl)
        return RecommendedColor(hex=hex, name=rec_name, harmony_type=harmony)



    recommended_colors : list[RecommendedColor] = []
    baseHSL : HSL = base_color.hsl

    # Harmonies first: they're the differentiator and should lead the list.
    # Neutrals are appended after as the safe fallback set. Skip harmony
    # generation only for truly achromatic bases (gray/black/white); chromatic
    # "fashion neutrals" like navy/beige/tan/khaki have meaningful hue.
    if baseHSL.s >= 10:
        anal1, anal2 = get_analogous_hsl(baseHSL)
        comp = get_complementary_hsl(baseHSL)
        tri1, tri2 = get_triadic_hsl(baseHSL)

        # When the base is at the lightness extremes (very dark or very light),
        # generated harmonies that share that lightness look muddy or washed
        # out. Pull them toward the mid range so the harmony relationship
        # actually reads visually.
        def _balance_lightness(hsl: HSL) -> HSL:
            balanced_l = max(25, min(75, hsl.l))
            if balanced_l == hsl.l:
                return hsl
            return HSL(h=hsl.h, s=hsl.s, l=balanced_l)

        recommended_colors += [
            hsl_to_rec(_balance_lightness(anal1), "analogous"),
            hsl_to_rec(_balance_lightness(anal2), "analogous"),
            hsl_to_rec(_balance_lightness(comp), "complementary"),
            hsl_to_rec(_balance_lightness(tri1), "triadic"),
            hsl_to_rec(_balance_lightness(tri2), "triadic"),
        ]

    if include_neutrals:
        # Seed with already-generated harmonies AND the base color itself so we
        # never recommend the same color the user uploaded (e.g. navy base
        # would otherwise suggest navy from the neutral set).
        seen_hex: set[str] = {c.hex.lower() for c in recommended_colors}
        seen_hex.add(base_color.hex.lower())

        for name in NEUTRAL_COLORS:
            data = NEUTRAL_COLOR_DATA.get(name)
            if not data:
                raise(ValueError("Hardcoded Neutral color '{}' not found.".format(name)))
            hx = data["hex"].lower()
            if hx in seen_hex:
                continue
            recommended_colors.append(
                RecommendedColor(hex=hx, name=name, harmony_type="neutral")
            )
            seen_hex.add(hx)

    return recommended_colors