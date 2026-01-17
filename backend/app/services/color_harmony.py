"""Color harmony calculations and utilities.
uses the HSL (Hue, Saturation, Lightness) color model to mathematically determine if colors look good together and to generate matching color palettes."""
from pyparsing import Literal

from app.models.schemas import HSL, Color, RecommendedColor
from app.utils.constants import NEUTRAL_COLORS, NEUTRAL_COLOR_DATA


def is_neutral_color(color_name: str) -> bool:
    """Check if a color name is considered neutral."""
    return color_name.lower() in NEUTRAL_COLORS



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


def check_color_compatibility(color1: Color, color2: Color) -> tuple[bool, str]:
    #TODO look into returning ENUM instead of str
    #TODO extend functionality to 3 colors to better support triadics.
    """Check if two colors are compatible.    """

    # neutral colors are compatible with every color.
    if is_neutral_color(color1.name) or is_neutral_color(color2.name):
        return True, "neutral"
    # analogous colors are compatible since they share a common hue and provide a unified look
    elif are_colors_analogous(color1.hsl, color2.hsl):
        return True, "analogous"
    # complementary colors are compatible since they make each other 'pop'. They create a contrast.
    elif are_colors_complementary(color1.hsl, color2.hsl):
        return True, "complementary"
    elif are_colors_triadic(color1.hsl, color2.hsl):
        return True, "triadic"


    else:
        return False, "none"

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


    # Low Saturation:
    if s < 10:
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

    # todo: implement extrema relation between saturation & light.


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

    def hsl_to_rec(rec_hsl: HSL) -> RecommendedColor:
        hex = hsl_to_hex(rec_hsl)
        recColor = hsl_to_color(rec_hsl)
        rec_name = recColor.name
        harmony = check_color_compatibility(base_color, recColor)[1]

        return RecommendedColor(hex=hex, name=rec_name, harmony_type=harmony)



    recommended_colors : list[RecommendedColor] = []
    baseHSL : HSL = base_color.hsl

    # TODO: Look into adding all the neutral colors
    if include_neutrals:
        seen_hex: set[str] = {c.hex.lower() for c in recommended_colors}

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


    # TODO: do something here
    if is_neutral_color(base_color.name):
        pass
    else:
        anal1, anal2 = get_analogous_hsl(baseHSL)
        comp = get_complementary_hsl(baseHSL)

        non_neutral_recs = [hsl_to_rec(anal1), hsl_to_rec(anal2), hsl_to_rec(comp)]
        recommended_colors += non_neutral_recs

    return recommended_colors