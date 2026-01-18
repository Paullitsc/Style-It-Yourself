"""Closet endpoints - User's closet and matching items."""
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List

from app.middleware import get_current_user
from app.models.schemas import (
    ClosetResponse, 
    ClothingItemResponse, 
    User, 
    RecommendedColor, 
    FormalityRange,
)
from app.services.supabase import get_closet as get_closet_from_db, get_user_clothing_items
from app.services.matching import filter_and_rank_items

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/closet", tags=["closet"])


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

@router.get("", response_model=ClosetResponse)
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


@router.post("/matching-items", response_model=MatchingItemsResponse)
async def get_matching_items(
    request: MatchingItemsRequest,
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