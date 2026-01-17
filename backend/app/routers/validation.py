"""
Validation endpoints for outfit and item compatibility checking.
"""
from fastapi import APIRouter
from app.models.schemas import (
    ValidateItemRequest,
    ValidateItemResponse,
    ValidateOutfitRequest,
    ValidateOutfitResponse,
)
from app.services.compatibility import validate_item, validate_outfit

router = APIRouter(prefix="/api", tags=["validation"])


@router.post("/validate-item", response_model=ValidateItemResponse)
async def validate_item_endpoint(request: ValidateItemRequest) -> ValidateItemResponse:
    """Validate a new item against base item and current outfit.
    
    This endpoint checks if a new clothing item is compatible with:
    - The base item (starting piece)
    - All items currently in the outfit
    
    Returns compatibility status for:
    - Color harmony
    - Formality level
    - Aesthetic tags
    - Category pairings (e.g., shoe-bottom rules)
    """
    return validate_item(
        new_item=request.new_item,
        base_item=request.base_item,
        current_outfit=request.current_outfit,
    )


@router.post("/validate-outfit", response_model=ValidateOutfitResponse)
async def validate_outfit_endpoint(request: ValidateOutfitRequest) -> ValidateOutfitResponse:
    """Validate a complete outfit.
    
    This endpoint performs a comprehensive validation of a complete outfit:
    - Checks if all required categories are present
    - Calculates overall cohesion score (0-100)
    - Validates all item pairs for compatibility
    - Generates a human-readable verdict
    - Returns color strip for visualization
    """
    return validate_outfit(
        items=request.outfit,
        base_item=request.base_item,
    )