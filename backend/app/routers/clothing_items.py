"""
Clothing Items router - CRUD operations for individual clothing items.
"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.middleware.auth import get_current_user
from app.models.schemas import (
    ClothingItemCreate,
    ClothingItemCreateRequest,
    ClothingItemResponse,
    ErrorResponse,
    User,
)
from app.services import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/clothing-items", tags=["clothing-items"])

AUTH_RESPONSES = {
    401: {
        "model": ErrorResponse,
        "description": "Missing, invalid, or expired Bearer token.",
        "content": {
            "application/json": {"example": {"detail": "Invalid or expired token"}}
        },
    }
}


@router.post(
    "",
    response_model=ClothingItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a clothing item",
    description=(
        "Creates a clothing item for the authenticated user.\n\n"
        "This endpoint accepts `multipart/form-data` with:\n"
        "- `image`: binary image file\n"
        "- `data`: JSON string that matches `ClothingItemCreateRequest`"
    ),
    responses={
        **AUTH_RESPONSES,
        201: {
            "description": "Clothing item created successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "id": "item-123",
                        "user_id": "user-123",
                        "image_url": "https://cdn.example.com/clothing-images/item-123.jpg",
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
                        "source_url": "https://example.com/item/123",
                        "ownership": "owned",
                        "created_at": "2025-12-01T10:20:30Z",
                    }
                }
            },
        },
        400: {
            "model": ErrorResponse,
            "description": "Malformed JSON payload or business validation error.",
            "content": {
                "application/json": {"example": {"detail": "Invalid JSON in 'data' field"}}
            },
        },
        500: {
            "model": ErrorResponse,
            "description": "Failed to upload image or save item.",
            "content": {
                "application/json": {"example": {"detail": "Failed to create clothing item."}}
            },
        },
    },
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "examples": {
                        "basic_item_upload": {
                            "summary": "Upload one clothing item",
                            "value": {
                                "data": (
                                    '{"color":{"hex":"#0B1C2D","hsl":{"h":210,"s":61,"l":11},'
                                    '"name":"navy","is_neutral":true},"category":{"l1":"Tops","l2":"Knitwear"},'
                                    '"formality":3.0,"aesthetics":["Minimalist"],"brand":"Uniqlo",'
                                    '"price":39.9,"source_url":"https://example.com/item/123","ownership":"owned"}'
                                ),
                                "image": "(binary image file)",
                            },
                        }
                    }
                }
            }
        }
    },
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
        
        # Read image file content
        image_content = await image.read()
        
        # Determine content type
        content_type = image.content_type or "image/jpeg"
        
        # Upload image to storage first
        image_url = await supabase.upload_image(
            user_id=current_user.id,
            file_data=image_content,
            file_name=image.filename or "item.jpg",
            bucket="clothing-images",
            content_type=content_type,
        )
        
        # Convert ClothingItemCreateRequest to ClothingItemCreate
        item = ClothingItemCreate(
            color=item_data.color,
            category=item_data.category,
            formality=item_data.formality,
            aesthetics=item_data.aesthetics,
            brand=item_data.brand,
            price=item_data.price,
            source_url=item_data.source_url,
            ownership=item_data.ownership,
        )
        
        # Create item in database with the uploaded image URL
        return await supabase.create_clothing_item(
            user_id=current_user.id,
            item=item,
            image_url=image_url,
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
    description="Returns all clothing items belonging to the authenticated user.",
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "List of clothing items.",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "item-123",
                            "user_id": "user-123",
                            "image_url": "https://cdn.example.com/clothing-images/item-123.jpg",
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
                            "source_url": "https://example.com/item/123",
                            "ownership": "owned",
                            "created_at": "2025-12-01T10:20:30Z",
                        }
                    ]
                }
            },
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected fetch failure.",
            "content": {
                "application/json": {"example": {"detail": "Failed to retrieve clothing items."}}
            },
        },
    },
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
    description="Deletes one clothing item owned by the authenticated user.",
    responses={
        **AUTH_RESPONSES,
        204: {"description": "Item deleted successfully."},
        404: {
            "model": ErrorResponse,
            "description": "Item does not exist or is not owned by user.",
            "content": {"application/json": {"example": {"detail": "Clothing item not found."}}},
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected delete failure.",
            "content": {
                "application/json": {"example": {"detail": "Failed to delete clothing item."}}
            },
        },
    },
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
