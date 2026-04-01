"""
Recommendations router - Generate outfit suggestions based on base item properties.
"""
import logging

from fastapi import APIRouter, Body, HTTPException, status

from app.models.schemas import (
    ErrorResponse,
    RecommendationResponse,
    ClothingItemBase,
    RecommendationRequest,
)
from app.services.compatibility import generate_category_recommendations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate outfit recommendations",
    description=(
        "Generate color-coordinated recommendations for unfilled outfit categories.\n\n"
        "The algorithm uses the provided base item's color, formality, aesthetics, and category "
        "to suggest complementary categories, colors, and formality ranges."
    ),
    responses={
        200: {
            "description": "Recommendations generated successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "recommendations": [
                            {
                                "category_l1": "Bottoms",
                                "colors": [
                                    {
                                        "hex": "#000000",
                                        "name": "black",
                                        "harmony_type": "neutral",
                                    },
                                    {
                                        "hex": "#D4A373",
                                        "name": "tan",
                                        "harmony_type": "analogous",
                                    },
                                ],
                                "formality_range": {"min": 2.0, "max": 4.0},
                                "aesthetics": ["Minimalist"],
                                "suggested_l2": ["Jeans", "Trousers"],
                                "example": "Black straight-leg trousers with a navy knit top",
                            }
                        ]
                    }
                }
            },
        },
        400: {
            "model": ErrorResponse,
            "description": "Input payload is valid JSON but failed business validation.",
            "content": {"application/json": {"example": {"detail": "Invalid input"}}},
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected recommendation service error.",
            "content": {
                "application/json": {"example": {"detail": "Failed to generate recommendations."}}
            },
        },
    },
)
async def get_recommendations(
    request: RecommendationRequest = Body(
        ...,
        openapi_examples={
            "minimalist_base_item": {
                "summary": "Navy top, minimalist style",
                "description": "Common request where tops are already filled.",
                "value": {
                    "base_color": {
                        "hex": "#0B1C2D",
                        "hsl": {"h": 210, "s": 61, "l": 11},
                        "name": "navy",
                        "is_neutral": True,
                    },
                    "base_formality": 3.0,
                    "base_aesthetics": ["Minimalist"],
                    "base_category": {"l1": "Tops", "l2": "Knitwear"},
                    "filled_categories": ["Tops"],
                },
            }
        },
    )
) -> RecommendationResponse:
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
