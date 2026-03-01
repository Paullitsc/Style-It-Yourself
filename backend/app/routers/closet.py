"""Closet endpoints - User's closet and matching items."""
import logging

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List

from app.middleware import get_current_user
from app.models.schemas import (
    ClosetResponse, 
    ClothingItemResponse, 
    ErrorResponse,
    User, 
    RecommendedColor, 
    FormalityRange,
)
from app.services.supabase import get_closet as get_closet_from_db, get_user_clothing_items
from app.services.matching import filter_and_rank_items

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/closet", tags=["closet"])

AUTH_RESPONSES = {
    401: {
        "model": ErrorResponse,
        "description": "Missing, invalid, or expired Bearer token.",
        "content": {
            "application/json": {"example": {"detail": "Invalid or expired token"}}
        },
    }
}


# ==============================================================================
# Schemas for matching endpoint
# ==============================================================================

class MatchingItemsRequest(BaseModel):
    """Request body for POST /api/closet/matching-items"""
    category_l1: str = Field(..., description="Category to search (e.g., 'Bottoms')")
    recommended_colors: List[RecommendedColor] = Field(..., description="Colors to match against")
    formality_range: FormalityRange = Field(..., description="Acceptable formality range")
    limit: int = Field(default=5, ge=1, le=10, description="Max items to return")


class MatchingItemsResponse(BaseModel):
    """Response body for POST /api/closet/matching-items"""
    items: List[ClothingItemResponse]
    total_in_category: int = Field(..., description="Total items user has in this category")


# ==============================================================================
# Endpoints
# ==============================================================================

@router.get(
    "",
    response_model=ClosetResponse,
    summary="Get full closet",
    description=(
        "Returns the authenticated user's closet grouped by category, including saved outfit summaries."
    ),
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "Closet data fetched successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "items_by_category": {
                            "Tops": [
                                {
                                    "id": "item-top-001",
                                    "user_id": "user-123",
                                    "image_url": "https://cdn.example.com/top.jpg",
                                    "color": {
                                        "hex": "#0B1C2D",
                                        "hsl": {"h": 210, "s": 61, "l": 11},
                                        "name": "navy",
                                        "is_neutral": True,
                                    },
                                    "category": {"l1": "Tops", "l2": "Knitwear"},
                                    "formality": 3.0,
                                    "aesthetics": ["Minimalist"],
                                    "brand": "Uniqlo",
                                    "price": 39.9,
                                    "source_url": None,
                                    "ownership": "owned",
                                    "created_at": "2025-12-01T10:20:30Z",
                                }
                            ]
                        },
                        "outfits": [
                            {
                                "id": "outfit-100",
                                "name": "Monday Office",
                                "item_count": 3,
                                "thumbnail_url": "https://cdn.example.com/outfit-100.jpg",
                                "created_at": "2025-12-02T08:00:00Z",
                            }
                        ],
                        "total_items": 12,
                        "total_outfits": 4,
                    }
                }
            },
        },
        400: {
            "model": ErrorResponse,
            "description": "Validation issue while reading closet data.",
            "content": {"application/json": {"example": {"detail": "bad input"}}},
        },
        503: {
            "model": ErrorResponse,
            "description": "Closet service timed out.",
            "content": {"application/json": {"example": {"detail": "Closet service timed out."}}},
        },
        502: {
            "model": ErrorResponse,
            "description": "Failed to read closet due to upstream error.",
            "content": {"application/json": {"example": {"detail": "Failed to get Closet."}}},
        },
    },
)
async def get_closet(current_user: User = Depends(get_current_user)) -> ClosetResponse:
    """Get user's complete closet (items grouped by category + outfits)."""
    try:
        return await get_closet_from_db(current_user.id)

    except httpx.TimeoutException:
        logger.error(f"Fetch Closet timeout for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Closet service timed out.",
        )
    except ValueError as e:
        logger.warning(f"Validation error for user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Fetch Closet failed for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to get Closet.",
        )


@router.post(
    "/matching-items",
    response_model=MatchingItemsResponse,
    summary="Find matching closet items",
    description=(
        "Filters and ranks items from the authenticated user's closet that match a recommended "
        "target category, color set, and formality range."
    ),
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "Matching closet items returned.",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": "item-bottom-201",
                                "user_id": "user-123",
                                "image_url": "https://cdn.example.com/bottom.jpg",
                                "color": {
                                    "hex": "#2E2E2E",
                                    "hsl": {"h": 0, "s": 0, "l": 18},
                                    "name": "charcoal",
                                    "is_neutral": True,
                                },
                                "category": {"l1": "Bottoms", "l2": "Trousers"},
                                "formality": 3.0,
                                "aesthetics": ["Minimalist"],
                                "brand": "COS",
                                "price": 79.0,
                                "source_url": None,
                                "ownership": "owned",
                                "created_at": "2025-12-01T10:20:30Z",
                            }
                        ],
                        "total_in_category": 5,
                    }
                }
            },
        },
        503: {
            "model": ErrorResponse,
            "description": "Matching operation timed out.",
            "content": {"application/json": {"example": {"detail": "Service timed out."}}},
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected matching failure.",
            "content": {
                "application/json": {"example": {"detail": "Failed to find matching items."}}
            },
        },
    },
)
async def get_matching_items(
    request: MatchingItemsRequest = Body(
        ...,
        openapi_examples={
            "bottoms_from_recommendation": {
                "summary": "Find matching bottoms",
                "value": {
                    "category_l1": "Bottoms",
                    "recommended_colors": [
                        {"hex": "#000000", "name": "black", "harmony_type": "neutral"},
                        {"hex": "#2E2E2E", "name": "charcoal", "harmony_type": "analogous"},
                    ],
                    "formality_range": {"min": 2.0, "max": 4.0},
                    "limit": 5,
                },
            }
        },
    ),
    current_user: User = Depends(get_current_user),
) -> MatchingItemsResponse:
    """
    Find closet items that match outfit recommendations.
    
    Returns items from user's closet that:
    - Match the specified category
    - Have similar colors to recommendations
    - Fall within the formality range
    """
    try:
        # Fetch all user's items
        all_items = await get_user_clothing_items(current_user.id)
        
        # Count items in category
        total_in_category = sum(
            1 for item in all_items 
            if item.category.l1 == request.category_l1
        )
        
        # Filter and rank
        matching_items = filter_and_rank_items(
            items=all_items,
            category_l1=request.category_l1,
            recommended_colors=request.recommended_colors,
            formality_range=request.formality_range,
            limit=request.limit,
        )
        
        return MatchingItemsResponse(
            items=matching_items,
            total_in_category=total_in_category,
        )

    except httpx.TimeoutException:
        logger.error(f"Matching items timeout for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service timed out.",
        )
    except Exception as e:
        logger.error(f"Matching items failed for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find matching items.",
        )
