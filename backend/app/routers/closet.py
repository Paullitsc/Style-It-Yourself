"""GET /api/closet - User's complete closet."""
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware import get_current_user
from app.models.schemas import ClosetResponse, User
from app.services.supabase import get_closet as get_closet_from_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/closet", tags=["closet"])


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