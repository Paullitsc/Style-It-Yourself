"""
Outfits router - CRUD operations for saved outfits.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.models.schemas import (
    OutfitCreate,
    OutfitResponse,
    OutfitSummary,
    User,
)
from app.middleware.auth import get_current_user
from app.services import supabase

router = APIRouter(
    prefix="/api/outfits",
    tags=["outfits"]
)


@router.post(
    "",
    response_model=OutfitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a new outfit",
    description="Save a new outfit with associated clothing items"
)
async def create_outfit(
    outfit: OutfitCreate,
    current_user: User = Depends(get_current_user)
) -> OutfitResponse:
    """
    Save a new outfit with associated clothing items
    
    Args:
        outfit: Outfit data including name & items
        current_user: Authenticated user (from dependency)
    
    Returns:
        OutfitResponse with created outfit data
    
    Raises:
        HTTPException: 401 if unauthenticated, 500 for database errors
    """
    try:
        return await supabase.create_outfit(current_user.id, outfit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create outfit: {str(e)}"
        )


@router.get(
    "",
    response_model=List[OutfitSummary],
    status_code=status.HTTP_200_OK,
    summary="Get all outfits",
    description="Retrieve a summary list of all outfits belonging to the authenticated user"
)
async def get_outfits(
    current_user: User = Depends(get_current_user)
) -> List[OutfitSummary]:
    """
    Retrieve all outfits for the authenticated user.
    
    Args:
        current_user: Authenticated user (from dependency)
    
    Returns:
        List of OutfitSummary objects
    
    Raises:
        HTTPException: 401 if unauthenticated, 500 for database errors
    """
    try:
        return await supabase.get_user_outfits(current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve outfits: {str(e)}"
        )


@router.get(
    "/{outfit_id}",
    response_model=OutfitResponse,
    status_code=status.HTTP_200_OK,
    summary="Get outfit by ID",
    description="Retrieve detailed information for a single outfit"
)
async def get_outfit(
    outfit_id: str,
    current_user: User = Depends(get_current_user)
) -> OutfitResponse:
    """
    Retrieve a single outfit by ID.
    
    Args:
        outfit_id: UUID of the outfit
        current_user: Authenticated user (from dependency)
    
    Returns:
        OutfitResponse with outfit data
    
    Raises:
        HTTPException: 
            - 401 if unauthenticated
            - 404 if outfit doesn't exist or belongs to another user
            - 500 for database errors
    """
    try:
        outfit = await supabase.get_outfit(outfit_id, current_user.id)
        if not outfit:
            raise ValueError("Outfit not found")
        return outfit
    except ValueError as e:
        error_message = str(e)
        if "not found" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_message
            )
        else:
            # Permission denied
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve outfit: {str(e)}"
        )


@router.delete(
    "/{outfit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete outfit",
    description="Delete an outfit and all associated clothing items"
)
async def delete_outfit(
    outfit_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete an outfit by ID.
    
    Note: This deletes the outfit and cascade deletes outfit_items.
    Clothing items are preserved as they may be used in other outfits.
    
    Args:
        outfit_id: UUID of the outfit
        current_user: Authenticated user (from dependency)
    
    Raises:
        HTTPException:
            - 401 if unauthenticated
            - 404 if outfit doesn't exist
            - 403 if outfit belongs to another user
            - 500 for database errors
    """
    try:
        deleted = await supabase.delete_outfit(outfit_id, current_user.id)
        if not deleted:
            raise ValueError("Outfit not found")
    except ValueError as e:
        error_message = str(e)
        if "not found" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_message
            )
        else:
            # Permission denied
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete outfit: {str(e)}"
        )
