# GET /api/closet
import logging

import httpx
from fastapi import APIRouter, HTTPException, status, Depends

from app.middleware import get_current_user
from app.models.schemas import ClosetResponse, ClothingItemResponse, OutfitSummary, User
from app.services import supabase
from app.services.supabase import get_user_clothing_items, get_user_outfits
from app.utils import CATEGORY_TAXONOMY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/closet", tags=["try-on"])

@router.get("", response_model=ClosetResponse)
async def get_closet(current_user: User = Depends(get_current_user)) -> ClosetResponse:

    try:
        #  Also we aren't using aysnc to it's full potential.
        # I'm not taking 409 unfortunately so idk anything about concurrency lol

        all_items : list[ClothingItemResponse] = await get_user_clothing_items(current_user.id)
        total_items = len(all_items)

        items_by_category: dict[str, list[ClothingItemResponse]] = {}
        for item in all_items:
            items_by_category.setdefault(item.category.l1, []).append(item)



        outfits: list[OutfitSummary] = await get_user_outfits(user_id=current_user.id)
        total_outfits = len(outfits)

        return ClosetResponse(
            items_by_category=items_by_category,
            outfits=outfits,
            total_items=total_items,
            total_outfits=total_outfits)

    except httpx.TimeoutException:
        logger.error(f"Fetch Closet timeout for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Closet service timed out.")
    except ValueError as e:
        logger.warning(f"Validation error for user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Fetch Closet failed for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to get Closet.")

