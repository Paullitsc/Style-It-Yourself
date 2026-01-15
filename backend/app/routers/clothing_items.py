"""
Clothing Items router - CRUD operations for individual clothing items.
"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.middleware.auth import get_current_user
from app.models.schemas import (
    ClothingItemCreateRequest,
    ClothingItemResponse,
    User,
)
from app.services import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/clothing-items", tags=["clothing-items"])


@router.post(
    "",
    response_model=ClothingItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a clothing item",
)
async def create_clothing_item(
    image: Annotated[UploadFile, File(description="Clothing item image")],
    data: Annotated[str, Form(description="JSON string of item metadata")],
    current_user: User = Depends(get_current_user),
) -> ClothingItemResponse:
    """
    Create a new clothing item with image upload.
    
    - Upload image to Supabase Storage
    - Save item metadata to clothing_items table
    """
    import json
    
    try:
        # Parse the JSON metadata
        item_data = ClothingItemCreateRequest(**json.loads(data))
        
        # Upload image and create item
        return await supabase.create_clothing_item(
            user_id=current_user.id,
            item_data=item_data,
            image_file=image,
        )
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON in 'data' field",
        )
    except ValueError as e:
        logger.warning(f"Validation error creating item: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to create clothing item: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create clothing item.",
        )


@router.get(
    "",
    response_model=list[ClothingItemResponse],
    summary="Get all clothing items",
)
async def get_clothing_items(
    current_user: User = Depends(get_current_user),
) -> list[ClothingItemResponse]:
    """Get all clothing items for the authenticated user."""
    try:
        return await supabase.get_user_clothing_items(current_user.id)
    except Exception as e:
        logger.error(f"Failed to get clothing items: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve clothing items.",
        )


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a clothing item",
)
async def delete_clothing_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a clothing item by ID."""
    try:
        deleted = await supabase.delete_clothing_item(item_id, current_user.id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Clothing item not found.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete clothing item: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete clothing item.",
        )