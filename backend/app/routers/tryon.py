"""Try-on endpoints for AI-generated outfit visualization."""

import asyncio
import logging
import uuid
from collections import defaultdict, deque
from io import BytesIO
from time import monotonic

import httpx
from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.middleware.auth import get_current_user
from app.models.schemas import (
    ErrorResponse,
    User,
    TryOnResponse,
    TryOnSingleRequest,
    TryOnOutfitRequest,
)
from app.services.gemini import generate_tryon_single, generate_tryon_outfit
from app.services.supabase import (
    upload_image,
    delete_user_photo,
    get_supabase_client,
)


# Upload validation: cap each image side at 4096 px. Larger images get
# rejected by Gemini anyway (and cost more to process), and they're a
# common decompression-bomb-adjacent pattern we'd rather block at the
# boundary.
MAX_IMAGE_DIMENSION = 4096


def _validate_image_bytes(data: bytes) -> None:
    """Confirm bytes are a real image and within size limits.

    Trusts the content_type header on its own aren't enough — a malicious or
    misconfigured client can mark anything as image/jpeg. Pillow's open()
    raises UnidentifiedImageError on non-image content and DecompressionBomb
    family on suspicious dimensions; we additionally enforce an explicit
    per-side cap for actionable error copy.
    """
    try:
        with Image.open(BytesIO(data)) as img:
            img.verify()
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a valid image",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode image",
        )

    # verify() invalidates the image; reopen to read dimensions.
    try:
        with Image.open(BytesIO(data)) as img:
            width, height = img.size
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read image dimensions",
        )

    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Image too large ({width}x{height}px; "
                f"max {MAX_IMAGE_DIMENSION}px per side)"
            ),
        )


# Per-user rate limit on try-on generation. Each Gemini call is paid, so a
# determined user (or a buggy frontend) can run up a real bill in seconds
# without this guard. In-memory only — survives a single worker process but
# not restarts or multi-worker deploys. For a multi-worker setup, move this
# to Redis or a Supabase counter table.
_TRYON_WINDOW_SECONDS = 60
_TRYON_MAX_PER_WINDOW = 10
_tryon_history: dict[str, deque] = defaultdict(deque)
_tryon_history_lock = asyncio.Lock()


async def _check_tryon_rate_limit(user_id: str) -> None:
    """Sliding-window rate limit; raises 429 with Retry-After when exceeded."""
    now = monotonic()
    cutoff = now - _TRYON_WINDOW_SECONDS
    async with _tryon_history_lock:
        history = _tryon_history[user_id]
        while history and history[0] < cutoff:
            history.popleft()
        if len(history) >= _TRYON_MAX_PER_WINDOW:
            retry_after = max(1, int(history[0] + _TRYON_WINDOW_SECONDS - now) + 1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Try-on rate limit hit ({_TRYON_MAX_PER_WINDOW} per "
                    f"{_TRYON_WINDOW_SECONDS}s). Try again in {retry_after}s."
                ),
                headers={"Retry-After": str(retry_after)},
            )
        history.append(now)


async def _cleanup_user_photo(user_id: str, user_photo_url: str) -> None:
    """Best-effort delete of a user-photo URL that we own.

    Guard ensures we only delete URLs scoped to this user's path in the
    user-photos bucket — an external URL the caller passed in shouldn't be
    touched. Any deletion failure is logged but doesn't disrupt the response.
    """
    if not user_photo_url or "/user-photos/" not in user_photo_url:
        return
    # Path inside user-photos bucket starts with {user_id}/, so confirm before
    # deleting to avoid cross-user removal even with a forged URL.
    if f"/user-photos/{user_id}/" not in user_photo_url:
        return
    try:
        await delete_user_photo(user_photo_url)
    except Exception as e:
        logger.warning(f"Failed to delete user photo after try-on: {e}")

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
    """Validate that a URL points at a reachable image.

    Checks:
    - 2xx status (was previously "anything <400 plus 405")
    - Content-Type starts with image/ when present

    A 405 from the server is treated as "HEAD not supported" and lets the
    request through; the GET inside fetch_image_as_pil will surface the
    real failure if the URL is broken. Data URLs are exempt entirely.
    """
    if url.startswith("data:"):
        return

    try:
        async with httpx.AsyncClient() as client:
            response = await client.head(url, timeout=5.0)
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not reach image URL: {url}",
        )

    if response.status_code == 405:
        # Server blocks HEAD; rely on the downstream GET.
        return

    if not 200 <= response.status_code < 300:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image URL returned status {response.status_code}",
        )

    content_type = response.headers.get("content-type", "").lower()
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"URL is not an image (Content-Type: {content_type})",
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

        # Content-Type alone is client-supplied; verify the bytes are
        # actually an image of a reasonable size.
        _validate_image_bytes(image_data)

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
    "/upload-item-image",
    summary="Upload an item image for try-on",
    description=(
        "Uploads a clothing item image (typically a cropped blob from the build "
        "flow before the item is saved to the closet) to the clothing-images "
        "bucket. Returns a public URL the try-on endpoints can fetch."
    ),
    responses={
        **AUTH_RESPONSES,
        200: {
            "description": "Item image uploaded successfully.",
            "content": {
                "application/json": {
                    "example": {"url": "https://cdn.example.com/clothing-images/user-123/item.jpg"}
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
            "content": {"application/json": {"example": {"detail": "Failed to upload image"}}},
        },
    },
)
async def upload_item_image(
    image: UploadFile = File(..., description="Clothing item image for try-on"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Upload a clothing item image to the clothing-images bucket.

    Previously this path was hitting /upload-photo which writes to the
    user-photos bucket, mixing item blobs into a bucket meant for full-body
    photos. This endpoint puts item blobs where they belong.
    """
    try:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image",
            )

        image_data = await image.read()
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image must be less than 10MB",
            )

        # Content-Type alone is client-supplied; verify the bytes.
        _validate_image_bytes(image_data)

        file_name = image.filename or f"item-{uuid.uuid4()}.jpg"
        public_url = await upload_image(
            user_id=current_user.id,
            file_data=image_data,
            file_name=file_name,
            bucket="clothing-images",
            content_type=image.content_type or "image/jpeg",
        )

        logger.info(f"Uploaded item image for user {current_user.id}")
        return {"url": public_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload item image: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image",
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
    # 0. Rate limit BEFORE doing any expensive work (Gemini, downloads).
    await _check_tryon_rate_limit(current_user.id)

    # 1. Validation (HTTP 400)
    await validate_image_url(request.user_photo_url)
    await validate_image_url(request.item_image_url)

    # 2. Service Call — user photo is cleaned up in finally regardless of outcome
    # so storage doesn't grow unboundedly per try-on attempt.
    try:
        result = await generate_tryon_single(
            user_image_url=request.user_photo_url,
            item_image_url=request.item_image_url,
            item=request.item,
            high_quality=True,
        )

        if not result.success:
            logger.error(f"Gemini error for user {current_user.id}: {result.error}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=result.error or "AI service failed to generate image."
            )

        # No storage upload here — return the data URL directly. The image
        # only gets uploaded to Supabase when the user commits by saving an
        # outfit (see create_outfit), so try-ons the user never saves don't
        # leave orphan files in storage.
        return TryOnResponse(
            success=True,
            generated_image_url=result.generated_image_url,
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
    finally:
        await _cleanup_user_photo(current_user.id, request.user_photo_url)


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
    # 0. Rate limit BEFORE doing any expensive work.
    await _check_tryon_rate_limit(current_user.id)

    # 1. Validation
    await validate_image_url(request.user_photo_url)

    # Loop over list of tuples [(url, item), ...]
    for img_url, _ in request.item_images:
        await validate_image_url(img_url)

    # 2. Service Call — user photo cleaned up in finally regardless of outcome.
    try:
        result = await generate_tryon_outfit(
            user_image_url=request.user_photo_url,
            item_images=request.item_images,
            high_quality=True,
        )

        if not result.success:
            logger.error(f"Gemini error for user {current_user.id}: {result.error}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=result.error or "AI service failed to generate image."
            )

        # No storage upload here — return the data URL directly (see /single
        # endpoint for rationale).
        return TryOnResponse(
            success=True,
            generated_image_url=result.generated_image_url,
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
    finally:
        await _cleanup_user_photo(current_user.id, request.user_photo_url)
