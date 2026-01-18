"""
Outfits router - CRUD operations for saved outfits.
"""
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.models.schemas import (
    OutfitCreate,
    OutfitResponse,
    OutfitSummary,
    User,
)
from app.services import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


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
)
async def create_outfit(
    outfit: OutfitCreate,
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