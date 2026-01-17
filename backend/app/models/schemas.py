"""Pydantic schemas for request/response DTOs."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# SHARED / BASE SCHEMAS
# Used across multiple endpoints

class HSL(BaseModel):
    """HSL color representation."""
    h: int = Field(..., ge=0, lt=360, description="Hue (0-360)") #ex pigment of the color (red, blue, etc). Look this up on color wheel, for example, red is 0, green is 120, blue is 240
    s: int = Field(..., ge=0, le=100, description="Saturation (0-100)")
    l: int = Field(..., ge=0, le=100, description="Lightness (0-100)")


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
    formality: float = Field(..., ge=1.0, le=5.0, description="Formality level 1-5")
    aesthetics: list[str] = Field(default_factory=list, description="Aesthetic tags")


class ClothingItemCreate(ClothingItemBase):
    """Clothing item with full metadata - used when saving outfits."""
    image_url: str
    brand: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    source_url: Optional[str] = None
    ownership: Optional[str] = Field(default="owned", pattern=r"^(owned|wishlist)$")


class ClothingItemResponse(ClothingItemCreate):
    """Clothing item response with database fields."""
    id: str
    user_id: Optional[str] = None
    created_at: datetime


# POST /api/recommendations
# Get outfit recommendations based on a base item

class RecommendationRequest(BaseModel):
    """Request body for POST /api/recommendations"""
    base_color: Color
    base_formality: int = Field(..., ge=1, le=5)
    base_aesthetics: list[str] = Field(default_factory=list)
    base_category: Category


class RecommendedColor(BaseModel):
    """A recommended color option."""
    hex: str
    name: str
    harmony_type: str = Field(..., description="Type of harmony: analogous, complementary, neutral")


class FormalityRange(BaseModel):
    """Min/max formality range."""
    min: int = Field(..., ge=1, le=5)
    max: int = Field(..., ge=1, le=5)


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


# POST /api/validate-item
# Validate a new item against existing outfit

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


# POST /api/validate-outfit
# Validate a complete outfit

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


# POST /api/outfits (Auth required)
# Save a new outfit

class OutfitCreate(BaseModel):
    """Request body for POST /api/outfits"""
    name: str = Field(..., min_length=1, max_length=100)
    items: list[ClothingItemCreate]


class OutfitResponse(BaseModel):
    """Response body for POST /api/outfits and GET /api/outfits/{id}"""
    id: str
    name: str
    items: list[ClothingItemResponse]
    generated_image_url: Optional[str] = None
    created_at: datetime


# GET /api/closet (Auth required)
# Get user's complete closet

class OutfitSummary(BaseModel):
    """Brief outfit summary - used in closet listing."""
    id: str
    name: str
    thumbnail_urls: list[str] = Field(default_factory=list, description="First 4 item thumbnails")
    created_at: datetime


class ClosetResponse(BaseModel):
    """Response body for GET /api/closet"""
    outfits: list[OutfitSummary]
    items: list[ClothingItemResponse]
    generated_images: list[dict] = Field(default_factory=list)


# POST /api/try-on (Auth required)
# Generate AI try-on image

class TryOnSingleRequest(BaseModel):
    """Request body for POST /api/try-on (single item)"""
    user_photo_url: str
    item: ClothingItemCreate


class TryOnOutfitRequest(BaseModel):
    """Request body for POST /api/try-on (full outfit)"""
    user_photo_url: str
    outfit: OutfitCreate


class TryOnResponse(BaseModel):
    """Response body for POST /api/try-on"""
    success: bool
    generated_image_url: Optional[str] = None
    error: Optional[str] = None


# AUTH / USER
# Used by auth middleware

class User(BaseModel):
    """Authenticated user - populated by auth middleware."""
    id: str
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None


# ERROR RESPONSES
# Standard error format

class ErrorResponse(BaseModel):
    """Standard error response for all endpoints."""
    detail: str
    code: Optional[str] = None