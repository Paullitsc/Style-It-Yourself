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
    "black", "white", "gray", "grey", "navy", "beige", "cream", "tan", "khaki"
]

# str to Color mappings:
NEUTRAL_COLOR_DATA: dict[str, dict] = {
    "black": {"hex": "#000000", "hsl": (0, 0, 0)},
    "white": {"hex": "#FFFFFF", "hsl": (0, 0, 100)},
    "gray":  {"hex": "#808080", "hsl": (0, 0, 50)},
    "grey":  {"hex": "#808080", "hsl": (0, 0, 50)},
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
