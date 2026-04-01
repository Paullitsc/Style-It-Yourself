"""Try-on endpoints for AI-generated outfit visualization."""

import base64
import logging
import uuid
import httpx
from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile, status

from app.middleware.auth import get_current_user
from app.models.schemas import (
    ErrorResponse,
    User,
    TryOnResponse,
    TryOnSingleRequest,
    TryOnOutfitRequest,
)
from app.services.gemini import generate_tryon_single, generate_tryon_outfit
from app.services.supabase import upload_generated_image, get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/try-on", tags=["try-on"])

AUTH_RESPONSES = {
    401: {
        "model": ErrorResponse,
        "description": "Missing, invalid, or expired Bearer token.",
        "content": {
            "application/json": {"example": {"detail": "Invalid or expired token"}}
        },
    }
}


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


@router.post(
    "/upload-photo",
    summary="Upload user photo for try-on",
    description=(
        "Uploads a user photo to storage and returns a public URL to reuse with try-on generation."
    ),
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "Photo uploaded successfully.",
            "content": {
                "application/json": {
                    "example": {"url": "https://cdn.example.com/user-photos/user-123/photo.jpg"}
                }
            },
        },
        400: {
            "model": ErrorResponse,
            "description": "Invalid file type or file size exceeds limit.",
            "content": {"application/json": {"example": {"detail": "File must be an image"}}},
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected upload failure.",
            "content": {"application/json": {"example": {"detail": "Failed to upload photo"}}},
        },
    },
)
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


@router.post(
    "/single",
    response_model=TryOnResponse,
    summary="Generate single-item try-on",
    description=(
        "Generates an AI try-on image for one clothing item on the user's uploaded photo."
    ),
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "Try-on generated successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "error": None,
                        "generated_image_url": "https://cdn.example.com/generated/outfits/abc123.png",
                        "processing_time": 5.42,
                    }
                }
            },
        },
        400: {
            "model": ErrorResponse,
            "description": "Input image URLs or payload data are invalid.",
            "content": {
                "application/json": {
                    "example": {"detail": "Could not reach image URL: https://example.com/item.jpg"}
                }
            },
        },
        502: {
            "model": ErrorResponse,
            "description": "AI provider or generated image processing failed.",
            "content": {
                "application/json": {
                    "example": {"detail": "AI service failed to generate image."}
                }
            },
        },
    },
)
async def try_on_single(
    request: TryOnSingleRequest = Body(
        ...,
        openapi_examples={
            "single_item_tryon": {
                "summary": "Try on one jacket",
                "value": {
                    "user_photo_url": "https://cdn.example.com/user-photos/user-123/selfie.jpg",
                    "item_image_url": "https://cdn.example.com/clothing-items/jacket-22.jpg",
                    "item": {
                        "color": {
                            "hex": "#0B1C2D",
                            "hsl": {"h": 210, "s": 61, "l": 11},
                            "name": "navy",
                            "is_neutral": True,
                        },
                        "category": {"l1": "Outerwear", "l2": "Blazer"},
                        "formality": 4.0,
                        "aesthetics": ["Classic", "Minimalist"],
                    },
                },
            }
        },
    ),
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


@router.post(
    "/outfit",
    response_model=TryOnResponse,
    summary="Generate full-outfit try-on",
    description="Generates an AI try-on image for a complete multi-item outfit.",
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "Outfit try-on generated successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "error": None,
                        "generated_image_url": "https://cdn.example.com/generated/outfits/full-456.png",
                        "processing_time": 8.73,
                    }
                }
            },
        },
        400: {
            "model": ErrorResponse,
            "description": "Input image URLs or payload data are invalid.",
            "content": {
                "application/json": {
                    "example": {"detail": "Could not reach image URL: https://example.com/shoes.jpg"}
                }
            },
        },
        502: {
            "model": ErrorResponse,
            "description": "AI provider or generated image processing failed.",
            "content": {
                "application/json": {
                    "example": {"detail": "AI service failed to generate image."}
                }
            },
        },
    },
)
async def try_on_outfit(
    request: TryOnOutfitRequest = Body(
        ...,
        openapi_examples={
            "full_outfit_tryon": {
                "summary": "Try on top, bottom, and shoes",
                "value": {
                    "user_photo_url": "https://cdn.example.com/user-photos/user-123/selfie.jpg",
                    "item_images": [
                        [
                            "https://cdn.example.com/items/top-1.jpg",
                            {
                                "color": {
                                    "hex": "#0B1C2D",
                                    "hsl": {"h": 210, "s": 61, "l": 11},
                                    "name": "navy",
                                    "is_neutral": True,
                                },
                                "category": {"l1": "Tops", "l2": "Knitwear"},
                                "formality": 3.0,
                                "aesthetics": ["Minimalist"],
                            },
                        ],
                        [
                            "https://cdn.example.com/items/bottom-1.jpg",
                            {
                                "color": {
                                    "hex": "#2E2E2E",
                                    "hsl": {"h": 0, "s": 0, "l": 18},
                                    "name": "charcoal",
                                    "is_neutral": True,
                                },
                                "category": {"l1": "Bottoms", "l2": "Trousers"},
                                "formality": 3.0,
                                "aesthetics": ["Minimalist"],
                            },
                        ],
                    ],
                },
            }
        },
    ),
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
