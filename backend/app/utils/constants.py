"""Constants for SIY application - categories, formality, aesthetics, and compatibility rules."""

#=====================|
# Algorithm Constants |
#=====================|

# Category Taxonomy (L1 -> L2)
CATEGORY_TAXONOMY: dict[str, list[str]] = {
    "Tops": ["T-Shirts", "Polos", "Casual Shirts", "Dress Shirts", "Sweaters", "Hoodies", "Blazers"],
    "Bottoms": ["Jeans", "Chinos", "Dress Pants", "Shorts", "Joggers", "Skirts"],
    "Shoes": ["Sneakers", "Loafers", "Oxfords", "Boots", "Sandals", "Heels"],
    "Accessories": ["Watches", "Belts", "Bags", "Hats", "Scarves", "Jewelry", "Sunglasses"],
    "Outerwear": ["Jackets", "Coats", "Vests"],
    "Full Body": ["Dresses", "Suits"],
}

# Formality levels (1-5)
FORMALITY_LEVELS: dict[int, str] = {
    1: "Casual",
    2: "Smart Casual",
    3: "Business Casual",
    4: "Formal",
    5: "Black Tie",
}

# Aesthetic tag
AESTHETIC_TAGS: list[str] = [
    "Minimalist",
    "Streetwear",
    "Classic",
    "Preppy",
    "Bohemian",
    "Athleisure",
    "Vintage",
    "Edgy",
]

# Color constants

# Neutral colors that always work together
# todo: some of these neutral colors don't have canonical HSL values
NEUTRAL_COLORS: list[str] = [
    "black", "white", "gray", "navy", "beige", "cream", "tan", "khaki"
]

# str to Color mappings:
NEUTRAL_COLOR_DATA: dict[str, dict] = {
    "black": {"hex": "#000000", "hsl": (0, 0, 0)},
    "white": {"hex": "#FFFFFF", "hsl": (0, 0, 100)},
    "gray":  {"hex": "#808080", "hsl": (0, 0, 50)},
    "navy":  {"hex": "#0B1C2D", "hsl": (210, 61, 11)},
    "beige": {"hex": "#F5F5DC", "hsl": (60, 56, 91)},
    "cream": {"hex": "#FFFDD0", "hsl": (57, 100, 91)},
    "tan":   {"hex": "#D2B48C", "hsl": (34, 44, 69)},
    "khaki": {"hex": "#C3B091", "hsl": (37, 29, 67)},
}



# Shoe-Bottom pairing rules
SHOE_BOTTOM_PAIRINGS: dict[str, list[str]] = {
    "Oxfords": ["Dress Pants", "Chinos", "Suits"],
    "Loafers": ["Dress Pants", "Chinos", "Suits", "Jeans"],
    "Sneakers": ["Jeans", "Joggers", "Shorts", "Chinos"],
    "Boots": ["Jeans", "Chinos", "Dress Pants"],
    "Sandals": ["Shorts", "Jeans", "Skirts", "Dresses"],
    "Heels": ["Dresses", "Dress Pants", "Skirts", "Suits"],
}

# Event contexts (golden-paths.md path 2 — "Style for an event").
#
# Each event pins a formality band (min, max on the 1-5 scale) and a curated
# palette of pre-labeled anchor colors. `avoid` colors are hard-flagged rather
# than just scored low (e.g. white/cream at a wedding upstages the couple).
#
# Deliberately NOT modeling a saturation cap here: raw HSL saturation is a
# poor proxy for perceived vividness at low lightness (navy is s=61 in
# NEUTRAL_COLOR_DATA but reads as muted) — the curated palette anchors already
# encode "low-key" vs. "bold" per event without that false positive.
EVENT_CONTEXTS: dict[str, dict] = {
    "job-interview": {
        "label": "Job Interview",
        "formality": (3.0, 4.0),  # Business Casual -> Formal
        "palette": [
            {"hex": "#0B1C2D", "name": "navy"},
            {"hex": "#808080", "name": "gray"},
            {"hex": "#FFFFFF", "name": "white"},
            {"hex": "#000000", "name": "black"},
        ],
        "avoid": [],
        "notes": "Clean lines, neutral palette, minimal accessories.",
    },
    "wedding-guest": {
        "label": "Wedding Guest",
        "formality": (3.0, 5.0),  # Business Casual -> Black Tie
        "palette": [
            {"hex": "#0B1C2D", "name": "navy"},
            {"hex": "#6E2142", "name": "burgundy"},
            {"hex": "#9CAF88", "name": "sage"},
            {"hex": "#7A99AC", "name": "dusty blue"},
        ],
        "avoid": [
            {"hex": "#FFFFFF", "name": "white"},
            {"hex": "#FFFDD0", "name": "cream"},
        ],
        "notes": "Dress up; leave white and cream to the couple.",
    },
    "first-date": {
        "label": "First Date",
        "formality": (2.0, 3.0),  # Smart Casual -> Business Casual
        "palette": [
            {"hex": "#000000", "name": "black"},
            {"hex": "#6E2142", "name": "burgundy"},
            {"hex": "#1F2A44", "name": "indigo"},
            {"hex": "#808080", "name": "gray"},
        ],
        "avoid": [],
        "notes": "Put-together but relaxed — one statement color is plenty.",
    },
    "night-out": {
        "label": "Night Out",
        "formality": (2.0, 4.0),  # Smart Casual -> Formal
        "palette": [
            {"hex": "#000000", "name": "black"},
            {"hex": "#4B1D8C", "name": "deep purple"},
            {"hex": "#7A1F3D", "name": "wine"},
            {"hex": "#C0C0C0", "name": "silver"},
        ],
        "avoid": [],
        "notes": "Bolder colors and richer fabrics read well after dark.",
    },
    "casual-weekend": {
        "label": "Casual Weekend",
        "formality": (1.0, 2.0),  # Casual -> Smart Casual
        "palette": [
            {"hex": "#3B5998", "name": "denim blue"},
            {"hex": "#FFFFFF", "name": "white"},
            {"hex": "#C3B091", "name": "khaki"},
            {"hex": "#808080", "name": "gray"},
        ],
        "avoid": [],
        "notes": "Comfortable, easy layers.",
    },
}

# Outfit composition rules
REQUIRED_CATEGORIES_STANDARD: list[str] = ["Tops", "Bottoms", "Shoes"]
REQUIRED_CATEGORIES_FULLBODY: list[str] = ["Full Body", "Shoes"]

# Limits
MAX_OUTFIT_ITEMS: int = 6
MAX_ACCESSORIES: int = 3
MAX_OUTERWEAR: int = 1


# Sizing
STANDARD_SIZES: list[str] = ["XS", "S", "M", "L", "XL", "XXL"]

STANDARD_SIZE_ORDER: dict[str, int] = {
    "XS": 1,
    "S": 2,
    "M": 3,
    "L": 4,
    "XL": 5,
    "XXL": 6,
}

SIZE_INPUT_MODES: list[str] = [
    "standard",
    "numeric",
    "measurements",
    "brand_specific",
    "hybrid",
]

NUMERIC_SIZE_TYPES: list[str] = ["dress", "pants_waist", "pants_waist_inseam"]
NUMERIC_SIZE_SYSTEMS: list[str] = ["US", "UK", "EU"]

MEASUREMENT_UNITS: list[str] = ["cm", "in"]
MEASUREMENT_FIELDS_CM: list[str] = ["chest_cm", "waist_cm", "hips_cm", "inseam_cm"]

INCH_TO_CM: float = 2.54
CM_TO_INCH: float = 1 / INCH_TO_CM

MEASUREMENT_RANGE_CM: dict[str, tuple[float, float]] = {
    "chest_cm": (70.0, 155.0),
    "waist_cm": (50.0, 150.0),
    "hips_cm": (75.0, 155.0),
    "inseam_cm": (55.0, 100.0),
}

BRAND_SIZE_LABEL_MAX_LENGTH: int = 20
