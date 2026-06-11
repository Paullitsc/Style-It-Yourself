"""Extension router — capture-and-control endpoints for the Chrome extension.

The extension captures product context from the current web page and delegates
all styling/storage logic to the backend. These endpoints reuse the same
services as the web app (color naming, recommendations, matching, validation,
Supabase storage) so an extension-imported item is indistinguishable from an
in-app upload.

Endpoints:
- ``POST /api/extension/analyze-product`` — suggest metadata for a scraped product.
- ``POST /api/extension/import-item``     — fetch remote image, store it, create item.
- ``POST /api/extension/match-product``   — find closet pieces that pair with a product.
"""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.models.schemas import (
    AnalyzeProductRequest,
    AnalyzeProductResponse,
    ClothingItemCreate,
    ClothingItemResponse,
    ErrorResponse,
    ImportItemRequest,
    MatchProductRequest,
    MatchProductResponse,
    User,
)
from app.services import supabase
from app.services.extension_match import build_match
from app.services.product_analysis import (
    detect_platform,
    extract_dominant_color,
    guess_aesthetics,
    guess_category,
    guess_formality,
)
from app.services.remote_image import RemoteImageError, fetch_remote_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/extension", tags=["extension"])

AUTH_RESPONSES = {
    401: {
        "model": ErrorResponse,
        "description": "Missing, invalid, or expired Bearer token.",
        "content": {
            "application/json": {"example": {"detail": "Invalid or expired token"}}
        },
    }
}

_CONTENT_TYPE_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}


def _stored_filename(title: str | None, content_type: str) -> str:
    """Build a storage filename from the product title + image type."""
    ext = _CONTENT_TYPE_EXT.get(content_type, "jpg")
    base = "".join(
        c for c in (title or "item") if c.isalnum() or c in " -_"
    ).strip().replace(" ", "-")[:40]
    return f"{base or 'item'}.{ext}"


# =============================================================================
# POST /api/extension/analyze-product
# =============================================================================

@router.post(
    "/analyze-product",
    response_model=AnalyzeProductResponse,
    summary="Analyze a scraped product into suggested metadata",
    description=(
        "Returns suggested color, category, formality, and aesthetics for a "
        "product page. The image is fetched and analyzed server-side so the "
        "extension stays lightweight. All fields are suggestions the user "
        "confirms before saving."
    ),
    responses={
        **AUTH_RESPONSES,
        200: {"description": "Suggestions generated."},
    },
)
async def analyze_product(
    request: AnalyzeProductRequest,
    current_user: User = Depends(get_current_user),
) -> AnalyzeProductResponse:
    """Suggest closet metadata for a scraped product."""
    color = None
    if request.image_url:
        # Color analysis is best-effort: a fetch/decode failure should NOT block
        # the rest of the suggestions — the user can still pick a color manually.
        try:
            image_bytes, _ = await fetch_remote_image(request.image_url)
            color = extract_dominant_color(image_bytes)
        except RemoteImageError as exc:
            logger.info(f"analyze-product: image unusable ({exc})")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"analyze-product: color analysis error: {exc!r}")

    category = guess_category(request.title)
    formality = guess_formality(category, request.title)
    aesthetics = guess_aesthetics(request.title, request.brand)

    return AnalyzeProductResponse(
        color=color,
        category=category,
        formality=formality,
        aesthetics=aesthetics,
        brand=request.brand,
        price=request.price,
        title=request.title,
        image_url=request.image_url,
        source_url=request.page_url,
        source_platform=detect_platform(request.page_url),
    )


# =============================================================================
# POST /api/extension/import-item
# =============================================================================

@router.post(
    "/import-item",
    response_model=ClothingItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Import a product into the closet from a remote image URL",
    description=(
        "Fetches the remote product image (with SSRF protection), uploads it to "
        "Supabase storage, and creates a normal clothing item owned by the user."
    ),
    responses={
        **AUTH_RESPONSES,
        201: {"description": "Item imported successfully."},
        400: {
            "model": ErrorResponse,
            "description": "Remote image was unsafe, unreachable, or not an image.",
            "content": {
                "application/json": {
                    "example": {"detail": "Refusing to fetch from non-public address."}
                }
            },
        },
        500: {
            "model": ErrorResponse,
            "description": "Failed to store image or create item.",
            "content": {
                "application/json": {"example": {"detail": "Failed to import item."}}
            },
        },
    },
)
async def import_item(
    request: ImportItemRequest,
    current_user: User = Depends(get_current_user),
) -> ClothingItemResponse:
    """Fetch a remote image and create a closet item from product metadata."""
    # 1. Fetch + validate the remote image (raises RemoteImageError -> 400).
    try:
        image_bytes, content_type = await fetch_remote_image(request.image_url)
    except RemoteImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # 2. Store it in Supabase and 3. create the item.
    try:
        image_url = await supabase.upload_image(
            user_id=current_user.id,
            file_data=image_bytes,
            file_name=_stored_filename(request.title, content_type),
            bucket="clothing-images",
            content_type=content_type,
        )

        item = ClothingItemCreate(
            color=request.color,
            category=request.category,
            formality=request.formality,
            aesthetics=request.aesthetics,
            brand=request.brand,
            sizing=request.sizing,
            price=request.price,
            source_url=request.source_url,
            ownership=request.ownership,
        )

        return await supabase.create_clothing_item(
            user_id=current_user.id,
            item=item,
            image_url=image_url,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Failed to import item: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import item.",
        )


# =============================================================================
# POST /api/extension/match-product
# =============================================================================

@router.post(
    "/match-product",
    response_model=MatchProductResponse,
    summary="Find closet pieces that pair with a product",
    description=(
        "Treats the current product as a candidate and returns the best closet "
        "matches grouped by category, compatibility warnings, suggested "
        "pairings, and a cohesion-style summary."
    ),
    responses={
        **AUTH_RESPONSES,
        200: {"description": "Match result computed."},
        503: {
            "model": ErrorResponse,
            "description": "Closet service timed out.",
            "content": {
                "application/json": {"example": {"detail": "Service temporarily unavailable."}}
            },
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected matching failure.",
            "content": {
                "application/json": {"example": {"detail": "Failed to match product."}}
            },
        },
    },
)
async def match_product(
    request: MatchProductRequest,
    current_user: User = Depends(get_current_user),
) -> MatchProductResponse:
    """Find closet items that work with the candidate product."""
    try:
        closet_items = await supabase.get_user_clothing_items(
            current_user.id, limit=500
        )
    except httpx.TimeoutException:
        logger.error(f"match-product timeout for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable.",
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(f"match-product failed for user {current_user.id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to match product.",
        )

    return build_match(request.candidate, closet_items, limit=request.limit)
