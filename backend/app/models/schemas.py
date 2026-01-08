"""Pydantic schemas for request/response DTOs."""

from pydantic import BaseModel, Field
from typing import Optional, Tuple
from datetime import datetime


# ==============================================================================
# SHARED / BASE SCHEMAS
# Used across multiple endpoints
# ==============================================================================

class HSL(BaseModel):
    """HSL color representation."""
    h: int = Field(..., ge=0, lt=360, description="Hue (0-359)")
    s: int = Field(..., ge=0, le=100, description="Saturation (0-100)")
    l: int = Field(..., ge=0, le=100, description="Lightness (0-100)")

    def get_hsl(self) -> Tuple[int, int, int]:
        return self.h, self.s, self.l


class Color(BaseModel):
    """Complete color representation."""
    hex: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex color code")
    hsl: HSL
    name: str = Field(..., description="Fashion color name (e.g., navy, beige)")
    is_neutral: bool = Field(default=False, description="Whether this is a neutral color")


class Category(BaseModel):
    """Clothing category with L1 and L2."""
    l1: str = Field(..., description="Level 1 category (e.g., Tops, Bottoms)")
    l2: str = Field(..., description="Level 2 category (e.g., T-Shirts, Jeans)")


class ClothingItemBase(BaseModel):
    """Base clothing item fields - used in validation endpoints."""
    color: Color
    category: Category
    formality: float = Field(..., ge=1.0, le=5.0, description="Formality level 1.0-5.0")
    aesthetics: list[str] = Field(default_factory=list, description="Aesthetic tags")


class ClothingItemCreate(ClothingItemBase):
    """Clothing item with full metadata - used when saving to closet."""
    image_url: Optional[str] = None  # Optional - set after upload
    brand: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    source_url: Optional[str] = None
    ownership: str = Field(default="owned", pattern=r"^(owned|wishlist)$")


class ClothingItemResponse(ClothingItemBase):
    """Clothing item response with database fields."""
    id: str
    user_id: str
    image_url: str
    brand: Optional[str] = None
    price: Optional[float] = None
    source_url: Optional[str] = None
    ownership: str = "owned"
    created_at: datetime


# ==============================================================================
# POST /api/recommendations
# Get outfit recommendations based on a base item
# ==============================================================================

class RecommendationRequest(BaseModel):
    """Request body for POST /api/recommendations"""
    base_color: Color
    base_formality: float = Field(..., ge=1.0, le=5.0)
    base_aesthetics: list[str] = Field(default_factory=list)
    base_category: Category


class RecommendedColor(BaseModel):
    """A recommended color option."""
    hex: str
    name: str
    harmony_type: str = Field(..., description="Type of harmony: analogous, complementary, triadic, neutral")


class FormalityRange(BaseModel):
    """Min/max formality range."""
    min: float = Field(..., ge=1.0, le=5.0)
    max: float = Field(..., ge=1.0, le=5.0)


class CategoryRecommendation(BaseModel):
    """Recommendation for a single category slot."""
    category_l1: str
    colors: list[RecommendedColor]
    formality_range: FormalityRange
    aesthetics: list[str]
    suggested_l2: list[str]
    example: str = Field(..., description="Example description")


class RecommendationResponse(BaseModel):
    """Response body for POST /api/recommendations"""
    recommendations: list[CategoryRecommendation]


# ==============================================================================
# POST /api/validate-item
# Validate a new item against existing outfit
# ==============================================================================

class ValidateItemRequest(BaseModel):
    """Request body for POST /api/validate-item"""
    new_item: ClothingItemBase
    base_item: ClothingItemBase
    current_outfit: list[ClothingItemBase] = Field(default_factory=list)


class ValidateItemResponse(BaseModel):
    """Response body for POST /api/validate-item"""
    color_status: str = Field(..., pattern=r"^(ok|warning)$")
    formality_status: str = Field(..., pattern=r"^(ok|warning|mismatch)$")
    aesthetic_status: str = Field(..., pattern=r"^(cohesive|warning)$")
    pairing_status: str = Field(..., pattern=r"^(ok|warning)$")
    warnings: list[str] = Field(default_factory=list)


# ==============================================================================
# POST /api/validate-outfit
# Validate a complete outfit
# ==============================================================================

class ValidateOutfitRequest(BaseModel):
    """Request body for POST /api/validate-outfit"""
    outfit: list[ClothingItemBase]
    base_item: ClothingItemBase


class ValidateOutfitResponse(BaseModel):
    """Response body for POST /api/validate-outfit"""
    is_complete: bool
    cohesion_score: int = Field(..., ge=0, le=100)
    verdict: str
    warnings: list[str] = Field(default_factory=list)
    color_strip: list[str] = Field(default_factory=list, description="List of hex colors in outfit")


# ==============================================================================
# POST /api/outfits (Auth required)
# Save a new outfit
# ==============================================================================

class OutfitCreate(BaseModel):
    """Request body for POST /api/outfits"""
    name: str = Field(..., min_length=1, max_length=100)
    item_ids: list[str] = Field(..., min_length=1, description="List of clothing item IDs")


class OutfitResponse(BaseModel):
    """Response body for POST /api/outfits and GET /api/outfits/{id}"""
    id: str
    user_id: str
    name: str
    items: list[ClothingItemResponse]
    generated_image_url: Optional[str] = None
    created_at: datetime


# ==============================================================================
# GET /api/closet (Auth required)
# Get user's complete closet
# ==============================================================================

class OutfitSummary(BaseModel):
    """Brief outfit summary - used in closet listing."""
    id: str
    name: str
    item_count: int
    thumbnail_url: Optional[str] = None  # First item's image or generated image
    created_at: datetime


class ClosetResponse(BaseModel):
    """Response body for GET /api/closet"""
    items_by_category: dict[str, list[ClothingItemResponse]]
    outfits: list[OutfitSummary]
    total_items: int
    total_outfits: int


# ==============================================================================
# POST /api/try-on (Auth required)
# Generate AI try-on image
# ==============================================================================

class TryOnItemWithImage(BaseModel):
    """A clothing item with its image URL for try-on."""
    image_url: str
    item: ClothingItemBase


class TryOnSingleRequest(BaseModel):
    """Request body for POST /api/try-on/single"""
    user_photo_url: str
    item_image_url: str
    item: ClothingItemBase


class TryOnOutfitRequest(BaseModel):
    """Request body for POST /api/try-on/outfit"""
    user_photo_url: str
    items: list[TryOnItemWithImage]


class TryOnResponse(BaseModel):
    """Response body for POST /api/try-on"""
    generated_image_url: str
    processing_time: float = Field(..., description="Time in seconds")


# ==============================================================================
# POST /api/clothing-items (Auth required)
# Add item to closet
# ==============================================================================

class ClothingItemCreateRequest(BaseModel):
    """Request body for POST /api/clothing-items (multipart form)"""
    color: Color
    category: Category
    formality: float = Field(..., ge=1.0, le=5.0)
    aesthetics: list[str] = Field(default_factory=list)
    brand: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    source_url: Optional[str] = None
    ownership: str = Field(default="owned", pattern=r"^(owned|wishlist)$")
    # Note: image file is uploaded separately via multipart form


# ==============================================================================
# AUTH / USER
# Used by auth middleware
# ==============================================================================

class User(BaseModel):
    """Authenticated user - populated by auth middleware."""
    id: str
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None


# ==============================================================================
# ERROR RESPONSES
# Standard error format
# ==============================================================================

class ErrorResponse(BaseModel):
    """Standard error response for all endpoints."""
    detail: str
    code: Optional[str] = None