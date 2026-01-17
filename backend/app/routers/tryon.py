"""Try-on endpoints for AI-generated outfit visualization."""

import base64
import logging
import uuid

import httpx
from fastapi import APIRouter, HTTPException, status, Depends

from app.middleware.auth import get_current_user
from app.models.schemas import (
    User,
    TryOnResponse,
    TryOnSingleRequest,
    TryOnOutfitRequest, ClothingItemCreate, ClothingItemBase,
)
from app.services.gemini import generate_tryon_single, generate_tryon_outfit
from app.services.supabase import upload_generated_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/try-on", tags=["try-on"])


async def validate_image_url(url: str) -> None:
    """Validate that an image URL is accessible."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.head(url, timeout=5.0)
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image URL not accessible: {url}",
                )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not reach image URL: {url}",
        )


@router.post("/single", response_model=TryOnResponse)
async def try_on_single(
    request: TryOnSingleRequest,
    current_user: User = Depends(get_current_user),
) -> TryOnResponse:
    """Generate try-on image with a single clothing item."""
    await validate_image_url(request.user_photo_url)
    await validate_image_url(request.item_image_url)
    
    try:
        result = await generate_tryon_single(
            user_image_url=request.user_photo_url,
            item_image_url=request.item_image_url,
            item=ClothingItemCreate.model_validate(ClothingItemBase.model_dump(request.item)),
            high_quality=True,
        )
        
        stored_url = await _save_generated_image(current_user.id, result.generated_image_url)
        
        return TryOnResponse(
            generated_image_url=stored_url,
            processing_time=result.processing_time,
        )
        
    except httpx.TimeoutException:
        logger.error(f"Gemini timeout for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service timed out.")
    except ValueError as e:
        logger.warning(f"Validation error for user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Gemini failed for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to generate image.")


@router.post("/outfit", response_model=TryOnResponse)
async def try_on_outfit(
    request: TryOnOutfitRequest,
    current_user: User = Depends(get_current_user),
) -> TryOnResponse:
    """Generate try-on image with a complete outfit."""
    await validate_image_url(request.user_photo_url)
    for item in request.items:
        await validate_image_url(item.image_url)
    
    try:
        item_images = [(item.image_url,
                        ClothingItemCreate.model_validate(ClothingItemBase.model_dump(item.item))
                        ) for item in request.items]
        
        result = await generate_tryon_outfit(
            user_image_url=request.user_photo_url,
            item_images=item_images,
            high_quality=True,
        )
        
        stored_url = await _save_generated_image(current_user.id, result.generated_image_url)
        
        return TryOnResponse(
            generated_image_url=stored_url,
            processing_time=result.processing_time,
        )
        
    except httpx.TimeoutException:
        logger.error(f"Gemini timeout for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service timed out.")
    except ValueError as e:
        logger.warning(f"Validation error for user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Gemini failed for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to generate image.")


async def _save_generated_image(user_id: str, data_url: str) -> str:
    """Extract image from data URL and upload to Supabase Storage."""
    if not data_url.startswith("data:"):
        return data_url
    
    _, b64_data = data_url.split(",", 1)
    image_bytes = base64.b64decode(b64_data)
    
    return await upload_generated_image(
        user_id=user_id,
        image_data=image_bytes,
        outfit_id=str(uuid.uuid4()),
    )