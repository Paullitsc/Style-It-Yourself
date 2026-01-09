"""
Recommendations router - Generate outfit suggestions based on base item properties.
"""
import logging

from fastapi import APIRouter, HTTPException, status

from app.models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    ClothingItemBase,
)
from app.services.compatibility import generate_category_recommendations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate outfit recommendations",
    description="Generate color-coordinated outfit suggestions based on a base item",
)
async def get_recommendations(request: RecommendationRequest) -> RecommendationResponse:
    """
    Generate outfit recommendations for empty category slots.

    Args:
        request: Base item properties (color, formality, aesthetics, category)

    Returns:
        RecommendationResponse with recommendations for each category

    Raises:
        HTTPException: 400 for invalid input, 500 for service errors
    """
    try:
        base_item = ClothingItemBase(
            color=request.base_color,
            category=request.base_category,
            formality=request.base_formality,
            aesthetics=request.base_aesthetics,
        )

        recommendations = generate_category_recommendations(
            base_item=base_item,
            filled_categories=request.filled_categories if hasattr(request, 'filled_categories') else [],
        )

        return RecommendationResponse(recommendations=recommendations)

    except ValueError as e:
        logger.warning(f"Validation error in recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to generate recommendations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate recommendations.",
        )