"""Heuristic analysis of a scraped product into closet metadata.

Powers ``POST /api/extension/analyze-product``. Everything here produces
*suggestions* the user confirms before saving — the goal is a sensible
pre-fill, not perfect classification. Reuses the app's existing color naming
(``color_harmony``) so extension-imported colors classify identically to
in-app uploads.
"""

from __future__ import annotations

import io
import logging
from urllib.parse import urlparse

from PIL import Image

from app.models.schemas import Category, Color, HSL
from app.services.color_harmony import get_color_name_from_hsl, is_neutral_color

logger = logging.getLogger(__name__)


# =============================================================================
# COLOR EXTRACTION (from image bytes, server-side)
# =============================================================================

def _rgb_to_hsl(r: int, g: int, b: int) -> HSL:
    """Convert 8-bit RGB to an HSL schema object (h 0-359, s/l 0-100)."""
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(rf, gf, bf), min(rf, gf, bf)
    lightness = (mx + mn) / 2.0

    if mx == mn:
        h = 0.0
        s = 0.0
    else:
        d = mx - mn
        s = d / (2.0 - mx - mn) if lightness > 0.5 else d / (mx + mn)
        if mx == rf:
            h = (gf - bf) / d + (6.0 if gf < bf else 0.0)
        elif mx == gf:
            h = (bf - rf) / d + 2.0
        else:
            h = (rf - gf) / d + 4.0
        h /= 6.0

    return HSL(
        h=int(round(h * 360)) % 360,
        s=max(0, min(100, int(round(s * 100)))),
        l=max(0, min(100, int(round(lightness * 100)))),
    )


def _garment_score(count: int, hsl: HSL) -> float:
    """Rank a palette color as 'likely the garment' rather than backdrop.

    Frequent colors win, saturated colors are boosted, and near-white /
    near-black colors (typical studio backgrounds and deep shadow) are demoted
    — but only demoted, so a genuinely white or black garment still wins when
    there is no saturated competitor.
    """
    weight = 1.0 + (hsl.s / 100.0) * 2.0
    if hsl.l > 90 or hsl.l < 8:
        weight *= 0.4
    return count * weight


def extract_dominant_color(image_bytes: bytes) -> Color | None:
    """Extract a single dominant garment color from raw image bytes.

    Returns ``None`` if the image can't be decoded (the caller then leaves the
    color unset for the user to pick).
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            rgb = img.convert("RGB")
            rgb.thumbnail((128, 128))
            # Median-cut down to a small palette, then read palette + counts.
            quant = rgb.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
            palette = quant.getpalette() or []
            counts = quant.getcolors() or []
    except Exception as exc:  # noqa: BLE001 — any decode failure -> no suggestion
        logger.info(f"Color extraction failed: {exc!r}")
        return None

    if not counts:
        return None

    best_rgb: tuple[int, int, int] | None = None
    best_score = -1.0
    for count, index in counts:
        base = index * 3
        if base + 2 >= len(palette):
            continue
        r, g, b = palette[base], palette[base + 1], palette[base + 2]
        hsl = _rgb_to_hsl(r, g, b)
        score = _garment_score(count, hsl)
        if score > best_score:
            best_score = score
            best_rgb = (r, g, b)

    if best_rgb is None:
        return None

    r, g, b = best_rgb
    hsl = _rgb_to_hsl(r, g, b)
    name = get_color_name_from_hsl(hsl)
    return Color(
        hex=f"#{r:02X}{g:02X}{b:02X}",
        hsl=hsl,
        name=name,
        is_neutral=is_neutral_color(name),
    )


# =============================================================================
# CATEGORY / FORMALITY / AESTHETIC HEURISTICS (from text)
# =============================================================================

# Ordered (keyword -> Category) table. Multi-word / specific keywords come
# first so "dress shirt" doesn't match the generic "dress" rule.
_CATEGORY_KEYWORDS: list[tuple[str, str, str]] = [
    # (keyword, l1, l2)
    ("dress shirt", "Tops", "Dress Shirts"),
    ("button-up", "Tops", "Dress Shirts"),
    ("button up", "Tops", "Dress Shirts"),
    ("oxford shirt", "Tops", "Dress Shirts"),
    ("dress pant", "Bottoms", "Dress Pants"),
    ("trouser", "Bottoms", "Dress Pants"),
    ("slacks", "Bottoms", "Dress Pants"),
    ("t-shirt", "Tops", "T-Shirts"),
    ("tee", "Tops", "T-Shirts"),
    ("tank", "Tops", "T-Shirts"),
    ("polo", "Tops", "Polos"),
    ("blouse", "Tops", "Casual Shirts"),
    ("flannel", "Tops", "Casual Shirts"),
    ("cardigan", "Tops", "Sweaters"),
    ("sweater", "Tops", "Sweaters"),
    ("jumper", "Tops", "Sweaters"),
    ("knit", "Tops", "Sweaters"),
    ("turtleneck", "Tops", "Sweaters"),
    ("hoodie", "Tops", "Hoodies"),
    ("sweatshirt", "Tops", "Hoodies"),
    ("blazer", "Tops", "Blazers"),
    ("shirt", "Tops", "Casual Shirts"),
    # Bottoms
    ("jean", "Bottoms", "Jeans"),
    ("denim", "Bottoms", "Jeans"),
    ("chino", "Bottoms", "Chinos"),
    ("jogger", "Bottoms", "Joggers"),
    ("sweatpant", "Bottoms", "Joggers"),
    ("track pant", "Bottoms", "Joggers"),
    ("short", "Bottoms", "Shorts"),
    ("skirt", "Bottoms", "Skirts"),
    ("pant", "Bottoms", "Chinos"),
    # Shoes
    ("sneaker", "Shoes", "Sneakers"),
    ("trainer", "Shoes", "Sneakers"),
    ("loafer", "Shoes", "Loafers"),
    ("oxford", "Shoes", "Oxfords"),
    ("boot", "Shoes", "Boots"),
    ("sandal", "Shoes", "Sandals"),
    ("slide", "Shoes", "Sandals"),
    ("heel", "Shoes", "Heels"),
    ("pump", "Shoes", "Heels"),
    ("stiletto", "Shoes", "Heels"),
    # Outerwear
    ("trench", "Outerwear", "Coats"),
    ("overcoat", "Outerwear", "Coats"),
    ("parka", "Outerwear", "Coats"),
    ("coat", "Outerwear", "Coats"),
    ("bomber", "Outerwear", "Jackets"),
    ("jacket", "Outerwear", "Jackets"),
    ("gilet", "Outerwear", "Vests"),
    ("vest", "Outerwear", "Vests"),
    # Accessories
    ("watch", "Accessories", "Watches"),
    ("belt", "Accessories", "Belts"),
    ("backpack", "Accessories", "Bags"),
    ("tote", "Accessories", "Bags"),
    ("handbag", "Accessories", "Bags"),
    ("bag", "Accessories", "Bags"),
    ("beanie", "Accessories", "Hats"),
    ("cap", "Accessories", "Hats"),
    ("hat", "Accessories", "Hats"),
    ("scarf", "Accessories", "Scarves"),
    ("sunglass", "Accessories", "Sunglasses"),
    ("necklace", "Accessories", "Jewelry"),
    ("bracelet", "Accessories", "Jewelry"),
    ("earring", "Accessories", "Jewelry"),
    ("ring", "Accessories", "Jewelry"),
    # Full Body
    ("jumpsuit", "Full Body", "Dresses"),
    ("romper", "Full Body", "Dresses"),
    ("gown", "Full Body", "Dresses"),
    ("dress", "Full Body", "Dresses"),
    ("tuxedo", "Full Body", "Suits"),
    ("suit", "Full Body", "Suits"),
]

_DEFAULT_CATEGORY = Category(l1="Tops", l2="T-Shirts")

# Base formality per L2 (1 Casual .. 5 Black Tie).
_L2_FORMALITY: dict[str, float] = {
    "T-Shirts": 1.0, "Hoodies": 1.0, "Joggers": 1.0, "Shorts": 1.0,
    "Sneakers": 1.0, "Sandals": 1.0, "Jeans": 1.5,
    "Polos": 2.0, "Casual Shirts": 2.0, "Sweaters": 2.0, "Chinos": 2.0,
    "Boots": 2.5, "Hats": 2.0, "Sunglasses": 2.0,
    "Dress Shirts": 3.0, "Loafers": 3.0, "Skirts": 3.0, "Jackets": 3.0,
    "Coats": 3.0, "Vests": 3.0, "Bags": 3.0, "Watches": 3.0, "Belts": 3.0,
    "Scarves": 3.0, "Jewelry": 3.0,
    "Dress Pants": 4.0, "Blazers": 4.0, "Oxfords": 4.0, "Heels": 4.0,
    "Dresses": 3.5,
    "Suits": 5.0,
}

_FORMAL_KEYWORDS = ("formal", "tuxedo", "evening", "tailored", "occasion", "wedding")
_CASUAL_KEYWORDS = ("casual", "relaxed", "everyday", "gym", "athletic", "sport", "lounge")

# Aesthetic tag keyword hints.
_AESTHETIC_KEYWORDS: list[tuple[str, str]] = [
    ("minimal", "Minimalist"),
    ("clean", "Minimalist"),
    ("street", "Streetwear"),
    ("oversized", "Streetwear"),
    ("graphic", "Streetwear"),
    ("classic", "Classic"),
    ("heritage", "Classic"),
    ("tailored", "Classic"),
    ("preppy", "Preppy"),
    ("boho", "Bohemian"),
    ("bohemian", "Bohemian"),
    ("floral", "Bohemian"),
    ("flowy", "Bohemian"),
    ("athletic", "Athleisure"),
    ("active", "Athleisure"),
    ("performance", "Athleisure"),
    ("track", "Athleisure"),
    ("vintage", "Vintage"),
    ("retro", "Vintage"),
    ("distressed", "Edgy"),
    ("leather", "Edgy"),
    ("punk", "Edgy"),
]

# Known platforms whose registered domain differs from the brand slug.
_PLATFORM_ALIASES = {
    "myshopify": "shopify",
    "hm": "h&m",
}


def guess_category(title: str | None) -> Category:
    """Best-guess category from a product title. Defaults to a casual top."""
    if not title:
        return _DEFAULT_CATEGORY
    text = title.lower()
    for keyword, l1, l2 in _CATEGORY_KEYWORDS:
        if keyword in text:
            return Category(l1=l1, l2=l2)
    return _DEFAULT_CATEGORY


def guess_formality(category: Category, title: str | None) -> float:
    """Estimate formality from category, nudged by keywords in the title."""
    base = _L2_FORMALITY.get(category.l2, 2.5)
    text = (title or "").lower()
    if any(k in text for k in _FORMAL_KEYWORDS):
        base += 1.0
    if any(k in text for k in _CASUAL_KEYWORDS):
        base -= 1.0
    return float(max(1.0, min(5.0, base)))


def guess_aesthetics(title: str | None, brand: str | None) -> list[str]:
    """Suggest up to two aesthetic tags from title/brand keywords."""
    text = f"{title or ''} {brand or ''}".lower()
    tags: list[str] = []
    for keyword, tag in _AESTHETIC_KEYWORDS:
        if keyword in text and tag not in tags:
            tags.append(tag)
        if len(tags) >= 2:
            break
    return tags


def detect_platform(page_url: str | None) -> str:
    """Derive a coarse source platform slug from the page URL host."""
    if not page_url:
        return "unknown"
    host = (urlparse(page_url).hostname or "").lower()
    if not host:
        return "unknown"
    host = host.removeprefix("www.")
    parts = host.split(".")
    slug = parts[-2] if len(parts) >= 2 else host
    return _PLATFORM_ALIASES.get(slug, slug or "unknown")
