import pytest

from app.models.schemas import HSL, Color
from app.services import color_harmony
from app.utils.constants import NEUTRAL_COLORS


def _make_color(name: str, h: int, s: int = 50, l: int = 50, hex_value: str = "#123456") -> Color:
    return Color(hex=hex_value, hsl=HSL(h=h, s=s, l=l), name=name, is_neutral=False)


@pytest.mark.parametrize(
    "name",
    ["Black", "WHITE", "gray", "Grey", "navy", "beige", "cream", "tan", "khaki"],
)
def test_is_neutral_color_case_insensitive(name: str):
    assert color_harmony.is_neutral_color(name) is True


def test_is_neutral_color_non_neutral():
    assert color_harmony.is_neutral_color("red") is False
    assert color_harmony.is_neutral_color("chartreuse") is False


def test_neutral_color_list_is_consistent():
    for name in NEUTRAL_COLORS:
        assert color_harmony.is_neutral_color(name) is True


def test_get_hue_distance_wraps():
    assert color_harmony.get_hue_distance(10, 350) == 20
    assert color_harmony.get_hue_distance(0, 180) == 180
    assert color_harmony.get_hue_distance(0, 359) == 1


def test_get_hue_distance_symmetry_and_zero():
    assert color_harmony.get_hue_distance(120, 120) == 0
    assert color_harmony.get_hue_distance(30, 200) == color_harmony.get_hue_distance(200, 30)
    assert color_harmony.get_hue_distance(0, 360) == 0


def test_get_hue_distance_hsl_wrapper():
    hsl1 = HSL(h=10, s=0, l=0)
    hsl2 = HSL(h=350, s=0, l=0)
    assert color_harmony.get_hue_distance_HSL(hsl1, hsl2) == 20


def test_are_colors_analogous_thresholds():
    hsl1 = HSL(h=10, s=50, l=50)
    hsl2 = HSL(h=35, s=50, l=50)
    hsl3 = HSL(h=50, s=50, l=50)
    assert color_harmony.are_colors_analogous(hsl1, hsl2) is True
    assert color_harmony.are_colors_analogous(hsl1, hsl3) is False
    assert color_harmony.are_colors_analogous(hsl1, hsl3, threshold=40) is True


def test_are_colors_analogous_wraps():
    hsl1 = HSL(h=350, s=50, l=50)
    hsl2 = HSL(h=10, s=50, l=50)
    assert color_harmony.are_colors_analogous(hsl1, hsl2) is True


def test_are_colors_complementary_thresholds():
    hsl1 = HSL(h=0, s=50, l=50)
    assert color_harmony.are_colors_complementary(hsl1, HSL(h=180, s=50, l=50)) is True
    assert color_harmony.are_colors_complementary(hsl1, HSL(h=195, s=50, l=50)) is True
    assert color_harmony.are_colors_complementary(hsl1, HSL(h=160, s=50, l=50)) is False


def test_are_colors_complementary_wraps():
    hsl1 = HSL(h=350, s=50, l=50)
    hsl2 = HSL(h=170, s=50, l=50)
    assert color_harmony.are_colors_complementary(hsl1, hsl2) is True


def test_are_colors_triadic_thresholds():
    hsl1 = HSL(h=0, s=50, l=50)
    assert color_harmony.are_colors_triadic(hsl1, HSL(h=120, s=50, l=50)) is True
    assert color_harmony.are_colors_triadic(hsl1, HSL(h=135, s=50, l=50)) is True
    assert color_harmony.are_colors_triadic(hsl1, HSL(h=150, s=50, l=50)) is False


def test_are_colors_triadic_wraps():
    hsl1 = HSL(h=350, s=50, l=50)
    hsl2 = HSL(h=110, s=50, l=50)
    assert color_harmony.are_colors_triadic(hsl1, hsl2) is True


def test_check_color_compatibility_paths():
    neutral = Color(hex="#000000", hsl=HSL(h=0, s=0, l=0), name="Black", is_neutral=True)
    non_neutral = _make_color(name="red", h=0, s=100, l=50, hex_value="#FF0000")
    assert color_harmony.check_color_compatibility(neutral, non_neutral) == (True, "neutral")
    assert color_harmony.check_color_compatibility(neutral, neutral) == (True, "neutral")

    analogous1 = _make_color(name="red", h=10, hex_value="#AA0000")
    analogous2 = _make_color(name="orange", h=35, hex_value="#CC5500")
    assert color_harmony.check_color_compatibility(analogous1, analogous2) == (True, "analogous")

    complementary1 = _make_color(name="red", h=0, hex_value="#FF0000")
    complementary2 = _make_color(name="green", h=180, hex_value="#00FF00")
    assert color_harmony.check_color_compatibility(complementary1, complementary2) == (True, "complementary")

    triadic1 = _make_color(name="red", h=0, hex_value="#FF0000")
    triadic2 = _make_color(name="green", h=120, hex_value="#00FF00")
    assert color_harmony.check_color_compatibility(triadic1, triadic2) == (True, "triadic")

    unrelated1 = _make_color(name="red", h=0, hex_value="#FF0000")
    unrelated2 = _make_color(name="yellow", h=80, hex_value="#FFFF00")
    assert color_harmony.check_color_compatibility(unrelated1, unrelated2) == (False, "none")


@pytest.mark.parametrize(
    "hsl, expected_rgb, expected_hex",
    [
        (HSL(h=0, s=100, l=50), (255, 0, 0), "#FF0000"),
        (HSL(h=120, s=100, l=50), (0, 255, 0), "#00FF00"),
        (HSL(h=240, s=100, l=50), (0, 0, 255), "#0000FF"),
        (HSL(h=60, s=100, l=50), (255, 255, 0), "#FFFF00"),
        (HSL(h=180, s=100, l=50), (0, 255, 255), "#00FFFF"),
        (HSL(h=300, s=100, l=50), (255, 0, 255), "#FF00FF"),
        (HSL(h=0, s=0, l=50), (127, 127, 127), "#7F7F7F"),
        (HSL(h=0, s=100, l=25), (127, 0, 0), "#7F0000"),
        (HSL(h=0, s=0, l=0), (0, 0, 0), "#000000"),
        (HSL(h=0, s=0, l=100), (255, 255, 255), "#FFFFFF"),
        (HSL(h=360, s=100, l=50), (255, 0, 0), "#FF0000"),
    ],
)
def test_hsl_to_rgb_and_hex(hsl: HSL, expected_rgb: tuple[int, int, int], expected_hex: str):
    assert color_harmony.hsl_to_rgb(hsl) == expected_rgb
    assert color_harmony.hsl_to_hex(hsl) == expected_hex


@pytest.mark.parametrize(
    "hsl, expected",
    [
        (HSL(h=200, s=5, l=10), "black"),
        (HSL(h=200, s=5, l=95), "white"),
        (HSL(h=200, s=5, l=50), "gray"),
        (HSL(h=200, s=9, l=15), "gray"),
        (HSL(h=30, s=10, l=50), "orange"),
        (HSL(h=200, s=50, l=4), "black"),
        (HSL(h=200, s=50, l=96), "white"),
        (HSL(h=100, s=50, l=5), "green"),
    ],
)
def test_get_color_name_from_hsl_special_cases(hsl: HSL, expected: str):
    assert color_harmony.get_color_name_from_hsl(hsl) == expected


@pytest.mark.parametrize(
    "h, l, expected",
    [
        (0, 50, "red"),
        (14, 50, "red"),
        (345, 50, "red"),
        (359, 50, "red"),
        (360, 50, "red"),
        (15, 50, "orange"),
        (44, 50, "orange"),
        (45, 50, "yellow"),
        (64, 50, "yellow"),
        (65, 50, "green"),
        (149, 50, "green"),
        (150, 50, "teal"),
        (199, 60, "cyan"),
        (200, 20, "navy"),
        (229, 50, "blue"),
        (230, 50, "violet"),
        (289, 60, "purple"),
        (290, 65, "magenta"),
        (344, 66, "pink"),
    ],
)
def test_get_color_name_from_hsl_hue_buckets(h: int, l: int, expected: str):
    hsl = HSL(h=h, s=50, l=l)
    assert color_harmony.get_color_name_from_hsl(hsl) == expected


def test_get_analogous_hsl_wraps_and_preserves_sl():
    base = HSL(h=10, s=40, l=60)
    result = color_harmony.get_analogous_hsl(base)
    assert len(result) == 2
    assert {result[0].h, result[1].h} == {40, 340}
    for hsl in result:
        assert (hsl.s, hsl.l) == (40, 60)


def test_get_analogous_hsl_wraps_low_end():
    base = HSL(h=350, s=70, l=40)
    result = color_harmony.get_analogous_hsl(base)
    assert {result[0].h, result[1].h} == {20, 320}
    for hsl in result:
        assert (hsl.s, hsl.l) == (70, 40)


def test_get_complementary_hsl_wraps_hue():
    base = HSL(h=350, s=40, l=60)
    result = color_harmony.get_complementary_hsl(base)
    assert result.h == 170
    assert (result.s, result.l) == (40, 60)


@pytest.mark.parametrize(
    "base_h, expected_h",
    [
        (0, 180),
        (180, 0),
        (200, 20),
        (360, 180),
    ],
)
def test_get_complementary_hsl_expected_hues(base_h: int, expected_h: int):
    base = HSL(h=base_h, s=55, l=45)
    result = color_harmony.get_complementary_hsl(base)
    assert result.h == expected_h
    assert (result.s, result.l) == (55, 45)


def test_generate_recommended_colors_includes_neutrals_and_harmonies():
    base = Color(hex="#FF0000", hsl=HSL(h=0, s=100, l=50), name="red", is_neutral=False)
    recommendations = color_harmony.generate_recommended_colors(base, include_neutrals=True)
    neutrals = [rec for rec in recommendations if rec.harmony_type == "neutral"]
    analogs = [rec for rec in recommendations if rec.harmony_type == "analogous"]
    complementary = [rec for rec in recommendations if rec.harmony_type == "complementary"]

    assert {"white", "black", "gray", "navy", "beige"}.issubset({rec.name for rec in neutrals})
    assert len(analogs) == 2
    assert len(complementary) == 1
    assert {rec.harmony_type for rec in recommendations} <= {"neutral", "analogous", "complementary"}

    analog_expected = {
        ("orange", "#FF7F00"),
        ("magenta", "#FF007F"),
    }
    assert {(rec.name, rec.hex) for rec in analogs} == analog_expected
    assert (complementary[0].name, complementary[0].hex) == ("teal", "#00FFFF")


def test_generate_recommended_colors_without_neutrals():
    base = Color(hex="#FF0000", hsl=HSL(h=0, s=100, l=50), name="red", is_neutral=False)
    recommendations = color_harmony.generate_recommended_colors(base, include_neutrals=False)
    assert [rec for rec in recommendations if rec.harmony_type == "neutral"] == []
    assert len([rec for rec in recommendations if rec.harmony_type == "analogous"]) == 2
    assert len([rec for rec in recommendations if rec.harmony_type == "complementary"]) == 1


def test_generate_recommended_colors_for_neutral_base():
    base = Color(hex="#FFFFFF", hsl=HSL(h=0, s=0, l=100), name="white", is_neutral=True)
    recommendations = color_harmony.generate_recommended_colors(base, include_neutrals=True)
    assert [rec for rec in recommendations if rec.harmony_type != "neutral"] == []
    assert {"white", "black", "gray", "navy", "beige"}.issubset({rec.name for rec in recommendations})


def test_generate_recommended_colors_for_neutral_base_without_neutrals():
    base = Color(hex="#FFFFFF", hsl=HSL(h=0, s=0, l=100), name="white", is_neutral=True)
    recommendations = color_harmony.generate_recommended_colors(base, include_neutrals=False)
    assert recommendations == []