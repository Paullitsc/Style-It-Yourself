"""Constants for SIY application - categories, formality, aesthetics, and compatibility rules."""

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

# Aesthetic tags
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

# Neutral colors that always work together
NEUTRAL_COLORS: list[str] = [
    "black", "white", "gray", "grey", "navy", "beige", "cream", "tan", "khaki"
]

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