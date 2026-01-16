"""Try-on endpoints for AI-generated outfit visualization."""

import base64
import logging
import uuid
import httpx
from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile

from app.middleware.auth import get_current_user
from app.models.schemas import (
    User,
    TryOnResponse,
    TryOnSingleRequest,
    TryOnOutfitRequest,
)
from app.services.gemini import generate_tryon_single, generate_tryon_outfit
from app.services.supabase import upload_generated_image, get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/try-on", tags=["try-on"])


async def validate_image_url(url: str) -> None:
    """Validate that an image URL is accessible."""
    # Skip validation for data URLs
    if url.startswith("data:"):
        return
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.head(url, timeout=5.0)
            if response.status_code >= 400:
                # Some servers block HEAD, allow if 405 Method Not Allowed
                if response.status_code == 405:
                    return
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image URL not accessible: {url}",
                )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not reach image URL: {url}",
        )


@router.post("/upload-photo", summary="Upload user photo for try-on")
async def upload_user_photo(
    image: UploadFile = File(..., description="User photo for try-on"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Upload a user photo to storage for use in try-on.
    Returns the public URL of the uploaded image.
    """
    try:
        # Validate file type
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image",
            )
        
        # Read image data
        image_data = await image.read()
        
        # Validate file size (max 10MB)
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image must be less than 10MB",
            )
        
        # Generate unique filename
        file_ext = image.filename.split(".")[-1] if image.filename and "." in image.filename else "jpg"
        file_path = f"user-photos/{current_user.id}/{uuid.uuid4()}.{file_ext}"
        
        # Upload to Supabase Storage
        client = await get_supabase_client()
        
        # Upload the file
        await client.storage.from_("user-photos").upload(
            file_path,
            image_data,
            {"content-type": image.content_type or "image/jpeg"}
        )
        
        # Get public URL
        public_url = await client.storage.from_("user-photos").get_public_url(file_path)
        
        logger.info(f"Uploaded user photo for user {current_user.id}: {file_path}")
        
        return {"url": public_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload user photo: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload photo",
        )


@router.post("/single", response_model=TryOnResponse)
async def try_on_single(
    request: TryOnSingleRequest,
    current_user: User = Depends(get_current_user),
) -> TryOnResponse:
    """Generate try-on image with a single clothing item."""
    # 1. Validation (HTTP 400)
    await validate_image_url(request.user_photo_url)
    await validate_image_url(request.item_image_url)
    
    # 2. Service Call
    # Note: Service now suppresses exceptions and returns success=False
    try:
        result = await generate_tryon_single(
            user_image_url=request.user_photo_url,
            item_image_url=request.item_image_url,
            item=request.item,
            high_quality=True,
        )
        
        # Explicit check for service failure (Replacing previous GeminiError catch)
        if not result.success:
            logger.error(f"Gemini error for user {current_user.id}: {result.error}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, 
                detail=result.error or "AI service failed to generate image."
            )

        # 3. Save Image (Retaining your original error catching logic)
        stored_url = await _save_generated_image(current_user.id, result.generated_image_url)
        
        return TryOnResponse(
            success=True,
            generated_image_url=stored_url,
            processing_time=result.processing_time,
        )

    except ValueError as e:
        # Catches validation errors during save/processing
        logger.warning(f"Validation error for user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        # Re-raise HTTPExceptions (like the 502 above)
        raise
    except Exception as e:
        # Catch-all for unexpected storage/processing errors
        logger.error(f"Unexpected error for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to process generated image.")


@router.post("/outfit", response_model=TryOnResponse)
async def try_on_outfit(
    request: TryOnOutfitRequest,
    current_user: User = Depends(get_current_user),
) -> TryOnResponse:
    """Generate try-on image with a complete outfit."""
    # 1. Validation
    await validate_image_url(request.user_photo_url)
    
    # Loop over list of tuples [(url, item), ...]
    for img_url, _ in request.item_images:
        await validate_image_url(img_url)
    
    # 2. Service Call
    try:
        # Pass item_images directly (it's already the list of tuples the service expects)
        result = await generate_tryon_outfit(
            user_image_url=request.user_photo_url,
            item_images=request.item_images,
            high_quality=True,
        )
        
        # Explicit check for service failure
        if not result.success:
            logger.error(f"Gemini error for user {current_user.id}: {result.error}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, 
                detail=result.error or "AI service failed to generate image."
            )

        # 3. Save Image
        stored_url = await _save_generated_image(current_user.id, result.generated_image_url)
        
        return TryOnResponse(
            success=True,
            generated_image_url=stored_url,
            processing_time=result.processing_time,
        )

    except ValueError as e:
        logger.warning(f"Validation error for user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to process generated image.")


async def _save_generated_image(user_id: str, data_url: str) -> str:
    """Extract image from data URL and upload to Supabase Storage."""
    if not data_url or not data_url.startswith("data:"):
        return data_url
    
    try:
        # Parse base64 data URL
        header, b64_data = data_url.split(",", 1)
        image_bytes = base64.b64decode(b64_data)
        
        # Determine extension from header
        ext = "png"
        content_type = "image/png"
        
        if "image/jpeg" in header:
            ext = "jpg"
            content_type = "image/jpeg"
        elif "image/webp" in header:
            ext = "webp"
            content_type = "image/webp"

        # Upload
        return await upload_generated_image(
            user_id=user_id,
            image_data=image_bytes,
            outfit_id=str(uuid.uuid4()),
            # Pass content_type if your upload function supports it, otherwise it defaults
        )
    except Exception as e:
        # This will be caught by the outer try/except in the endpoint
        raise ValueError(f"Invalid image data: {str(e)}")