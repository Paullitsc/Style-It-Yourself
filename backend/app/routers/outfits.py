"""
Outfits router - CRUD operations for saved outfits.
"""
import logging

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.models.schemas import (
    ErrorResponse,
    OutfitCreate,
    OutfitResponse,
    OutfitSummary,
    User,
)
from app.services import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/outfits", tags=["outfits"])

AUTH_RESPONSES = {
    401: {
        "model": ErrorResponse,
        "description": "Missing, invalid, or expired Bearer token.",
        "content": {
            "application/json": {"example": {"detail": "Invalid or expired token"}}
        },
    }
}


class OutfitNotFoundError(Exception):
    """Raised when outfit doesn't exist."""
    pass


class OutfitPermissionError(Exception):
    """Raised when user doesn't have permission."""
    pass


@router.post(
    "",
    response_model=OutfitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a new outfit",
    description=(
        "Creates and saves an outfit for the authenticated user using existing clothing item IDs."
    ),
    responses={
        **AUTH_RESPONSES,
        201: {
            "description": "Outfit saved successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "id": "outfit-123",
                        "user_id": "user-123",
                        "name": "Office Monday",
                        "items": [],
                        "generated_image_url": "https://cdn.example.com/generated/outfit-123.png",
                        "created_at": "2025-12-01T10:20:30Z",
                    }
                }
            },
        },
        400: {
            "model": ErrorResponse,
            "description": "Business validation error.",
            "content": {"application/json": {"example": {"detail": "Invalid item_ids"}}},
        },
        503: {
            "model": ErrorResponse,
            "description": "Service timeout while saving outfit.",
            "content": {
                "application/json": {"example": {"detail": "Service temporarily unavailable."}}
            },
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected save failure.",
            "content": {"application/json": {"example": {"detail": "Failed to create outfit."}}},
        },
    },
)
async def create_outfit(
    outfit: OutfitCreate = Body(
        ...,
        openapi_examples={
            "save_generated_outfit": {
                "summary": "Save generated outfit",
                "value": {
                    "name": "Office Monday",
                    "item_ids": ["item-top-001", "item-bottom-010", "item-shoe-021"],
                    "generated_image_url": "https://cdn.example.com/generated/tmp-abc123.png",
                },
            }
        },
    ),
    current_user: User = Depends(get_current_user),
) -> OutfitResponse:
    """Save a new outfit with associated clothing items."""
    try:
        return await supabase.create_outfit(
            current_user.id, 
            outfit,
            generated_image_url=outfit.generated_image_url
        )

    except httpx.TimeoutException:
        logger.error(f"Timeout creating outfit for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable.",
        )
    except ValueError as e:
        logger.warning(f"Validation error creating outfit: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to create outfit for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create outfit.",
        )


@router.get(
    "",
    response_model=list[OutfitSummary],
    status_code=status.HTTP_200_OK,
    summary="Get all outfits",
    description="Returns all saved outfits for the authenticated user.",
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "Outfit summaries fetched successfully.",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "outfit-123",
                            "name": "Office Monday",
                            "item_count": 3,
                            "thumbnail_url": "https://cdn.example.com/generated/outfit-123.png",
                            "created_at": "2025-12-01T10:20:30Z",
                        }
                    ]
                }
            },
        },
        503: {
            "model": ErrorResponse,
            "description": "Service timeout while fetching outfits.",
            "content": {
                "application/json": {"example": {"detail": "Service temporarily unavailable."}}
            },
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected fetch failure.",
            "content": {"application/json": {"example": {"detail": "Failed to retrieve outfits."}}},
        },
    },
)
async def get_outfits(
    current_user: User = Depends(get_current_user),
) -> list[OutfitSummary]:
    """Retrieve all outfits for the authenticated user."""
    try:
        return await supabase.get_user_outfits(current_user.id)

    except httpx.TimeoutException:
        logger.error(f"Timeout getting outfits for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable.",
        )
    except Exception as e:
        logger.error(f"Failed to get outfits for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve outfits.",
        )


@router.get(
    "/{outfit_id}",
    response_model=OutfitResponse,
    status_code=status.HTTP_200_OK,
    summary="Get outfit by ID",
    description="Retrieves one saved outfit by ID for the authenticated user.",
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "Outfit retrieved successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "id": "outfit-123",
                        "user_id": "user-123",
                        "name": "Office Monday",
                        "items": [],
                        "generated_image_url": "https://cdn.example.com/generated/outfit-123.png",
                        "created_at": "2025-12-01T10:20:30Z",
                    }
                }
            },
        },
        403: {
            "model": ErrorResponse,
            "description": "User does not own this outfit.",
            "content": {
                "application/json": {
                    "example": {"detail": "You don't have permission to access this outfit."}
                }
            },
        },
        404: {
            "model": ErrorResponse,
            "description": "Outfit not found.",
            "content": {"application/json": {"example": {"detail": "Outfit not found."}}},
        },
        503: {
            "model": ErrorResponse,
            "description": "Service timeout while fetching outfit.",
            "content": {
                "application/json": {"example": {"detail": "Service temporarily unavailable."}}
            },
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected fetch failure.",
            "content": {"application/json": {"example": {"detail": "Failed to retrieve outfit."}}},
        },
    },
)
async def get_outfit(
    outfit_id: str,
    current_user: User = Depends(get_current_user),
) -> OutfitResponse:
    """Retrieve a single outfit by ID."""
    try:
        outfit = await supabase.get_outfit(outfit_id, current_user.id)
        if not outfit:
            raise OutfitNotFoundError()
        return outfit

    except OutfitNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found.",
        )
    except OutfitPermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this outfit.",
        )
    except httpx.TimeoutException:
        logger.error(f"Timeout getting outfit {outfit_id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable.",
        )
    except Exception as e:
        logger.error(f"Failed to get outfit {outfit_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve outfit.",
        )


@router.delete(
    "/{outfit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete outfit",
    description="Deletes one saved outfit owned by the authenticated user.",
    responses={
        **AUTH_RESPONSES,
        204: {"description": "Outfit deleted successfully."},
        403: {
            "model": ErrorResponse,
            "description": "User does not own this outfit.",
            "content": {
                "application/json": {
                    "example": {"detail": "You don't have permission to delete this outfit."}
                }
            },
        },
        404: {
            "model": ErrorResponse,
            "description": "Outfit not found.",
            "content": {"application/json": {"example": {"detail": "Outfit not found."}}},
        },
        503: {
            "model": ErrorResponse,
            "description": "Service timeout while deleting outfit.",
            "content": {
                "application/json": {"example": {"detail": "Service temporarily unavailable."}}
            },
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected delete failure.",
            "content": {"application/json": {"example": {"detail": "Failed to delete outfit."}}},
        },
    },
)
async def delete_outfit(
    outfit_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an outfit by ID."""
    try:
        deleted = await supabase.delete_outfit(outfit_id, current_user.id)
        if not deleted:
            raise OutfitNotFoundError()

    except OutfitNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found.",
        )
    except OutfitPermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this outfit.",
        )
    except httpx.TimeoutException:
        logger.error(f"Timeout deleting outfit {outfit_id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable.",
        )
    except Exception as e:
        logger.error(f"Failed to delete outfit {outfit_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete outfit.",
        )
