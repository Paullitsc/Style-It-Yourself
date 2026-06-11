"""Unit tests for product metadata + color heuristics."""
import io

import pytest
from PIL import Image

from app.services.product_analysis import (
    detect_platform,
    extract_dominant_color,
    guess_aesthetics,
    guess_category,
    guess_formality,
)


def _solid_png(rgb) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), rgb).save(buf, format="PNG")
    return buf.getvalue()


class TestGuessCategory:
    @pytest.mark.parametrize(
        "title,l1,l2",
        [
            ("Slim Fit Dress Shirt", "Tops", "Dress Shirts"),
            ("Vintage Wash Denim Jeans", "Bottoms", "Jeans"),
            ("Leather Chelsea Boots", "Shoes", "Boots"),
            ("Wool Overcoat", "Outerwear", "Coats"),
            ("Floral Maxi Dress", "Full Body", "Dresses"),
            ("Classic Polo Shirt", "Tops", "Polos"),
            ("Running Sneakers", "Shoes", "Sneakers"),
        ],
    )
    def test_keyword_match(self, title, l1, l2):
        cat = guess_category(title)
        assert cat.l1 == l1
        assert cat.l2 == l2

    def test_dress_shirt_not_full_body(self):
        # "dress shirt" must not be captured by the generic "dress" rule.
        assert guess_category("Oxford Dress Shirt").l1 == "Tops"

    def test_default_when_unknown(self):
        cat = guess_category("Mysterious Item 9000")
        assert cat.l1 == "Tops"

    def test_none_title(self):
        assert guess_category(None).l1 == "Tops"


class TestGuessFormality:
    def test_suit_is_formal(self):
        cat = guess_category("Three Piece Suit")
        assert guess_formality(cat, "Three Piece Suit") >= 4.0

    def test_tshirt_is_casual(self):
        cat = guess_category("Cotton T-Shirt")
        assert guess_formality(cat, "Cotton T-Shirt") <= 2.0

    def test_clamped_range(self):
        cat = guess_category("Suit")
        f = guess_formality(cat, "formal tailored evening suit")
        assert 1.0 <= f <= 5.0


class TestGuessAesthetics:
    def test_detects_tags(self):
        tags = guess_aesthetics("Oversized streetwear graphic hoodie", None)
        assert "Streetwear" in tags
        assert len(tags) <= 2

    def test_empty_when_no_hint(self):
        assert guess_aesthetics("Plain item", None) == []


class TestDetectPlatform:
    @pytest.mark.parametrize(
        "url,expected",
        [
            ("https://www.zara.com/us/en/item", "zara"),
            ("https://www.ssense.com/product", "ssense"),
            ("https://shop.myshopify.com/x", "shopify"),
            ("not a url", "unknown"),
        ],
    )
    def test_platform(self, url, expected):
        assert detect_platform(url) == expected


class TestExtractDominantColor:
    def test_red_image(self):
        color = extract_dominant_color(_solid_png((210, 30, 30)))
        assert color is not None
        assert color.name == "red"
        assert color.hex.startswith("#")

    def test_white_image_is_neutral(self):
        color = extract_dominant_color(_solid_png((255, 255, 255)))
        assert color is not None
        assert color.is_neutral is True

    def test_invalid_bytes_returns_none(self):
        assert extract_dominant_color(b"garbage") is None
