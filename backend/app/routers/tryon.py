# POST /api/try-on
from fastapi import APIRouter,HTTPException, status, Depends

from app.middleware.auth import get_current_user
from app.models.schemas import TryOnResponse, TryOnSingleRequest, ClothingItemCreate, ClothingItemBase, \
    TryOnOutfitRequest
from app.services import supabase
from app.services.gemini import generate_tryon_single, generate_tryon_outfit

router = APIRouter(
    prefix="/api/try-on",
    tags=["try-on"],
)

@router.post(
    "/item",
    response_model=TryOnResponse,
    status_code=status.HTTP_200_OK,
    summary="Try on an item",
    description="Call the gemini API to add a piece of clothing to an image."
)

# TODO: Proper URL validation
async def validate_image_url(url: str) -> None:
    pass

async def try_on_item(
        request: TryOnSingleRequest,
        current_user = Depends(get_current_user)
    ) -> TryOnResponse:
    """
    Args:
        request: user_photo_url, item_image_url, clothingItemBase, high_quality
        current_user:

    Returns:
        TryOnResponse:
    """
    user_photo_url : str = request.user_photo_url
    item_image_url : str = request.item_image_url
    item : ClothingItemCreate = ClothingItemCreate.model_validate(request.item.model_dump())
    high_quality : bool = request.high_quality

    await validate_image_url(user_photo_url)

    result = await generate_tryon_single(
        user_image_url=user_photo_url,
        item_image_url=item_image_url,
        item=item,
        high_quality=high_quality
        )

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.error
        )

@router.post(
    path="/outfit",
    response_model=TryOnResponse,
    summary="Try on an outfit",
    description="Call the gemini API to add multiple piece of clothing to an image."
)
async def try_on_outfit(
        request: TryOnOutfitRequest,
        current_user = Depends(get_current_user)
) -> TryOnResponse:

    user_photo_url: str = request.user_photo_url
    item_images: list[tuple[str, ClothingItemCreate]] = [
        (s, ClothingItemCreate.model_validate(item.model_dump()))
        for (s, item) in request.item_images
    ]
    high_quality: bool = request.high_quality

    result = await generate_tryon_outfit(user_image_url=user_photo_url,
                                         item_images=item_images,
                                         high_quality=high_quality
                                         )
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.error
        )

    return result