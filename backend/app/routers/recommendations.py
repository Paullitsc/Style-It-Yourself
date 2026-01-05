"""
Recommendations router - Generate outfit suggestions based on base item properties.
"""
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    ClothingItemBase,
)
from app.services.compatibility import generate_category_recommendations

router = APIRouter(
    prefix="/api",
    tags=["recommendations"]
)


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate outfit recommendations",
    description="Generate color-coordinated outfit suggestions based on a base item"
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
        # Create temporary ClothingItemBase from request
        base_item = ClothingItemBase(
            color=request.base_color,
            category=request.base_category,
            formality=request.base_formality,
            aesthetics=request.base_aesthetics
        )
        
        # Generate recommendations (no filled categories initially)
        recommendations = generate_category_recommendations(
            base_item=base_item,
            filled_categories=[]
        )
        
        return RecommendationResponse(recommendations=recommendations)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )
