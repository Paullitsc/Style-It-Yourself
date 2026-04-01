"""
Validation endpoints for outfit and item compatibility checking.
"""
import logging
from fastapi import APIRouter, Body, status
from app.models.schemas import (
    ErrorResponse,
    ValidateItemRequest,
    ValidateItemResponse,
    ValidateOutfitRequest,
    ValidateOutfitResponse,
)
from app.services.compatibility import validate_item, validate_outfit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["validation"])


@router.post(
    "/validate-item",
    response_model=ValidateItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate one item against an outfit",
    description=(
        "Checks whether a candidate item is compatible with a base item and current outfit.\n\n"
        "Validation dimensions include color harmony, formality alignment, aesthetic consistency, "
        "and category pairing rules."
    ),
    responses={
        200: {
            "description": "Compatibility result for the candidate item.",
            "content": {
                "application/json": {
                    "example": {
                        "color_status": "ok",
                        "formality_status": "ok",
                        "aesthetic_status": "cohesive",
                        "pairing_status": "ok",
                        "warnings": [],
                    }
                }
            },
        },
        422: {
            "description": "Schema validation failed for the request body.",
        },
    },
)
async def validate_item_endpoint(
    request: ValidateItemRequest = Body(
        ...,
        openapi_examples={
            "candidate_item_check": {
                "summary": "Add sneakers to a smart-casual outfit",
                "value": {
                    "new_item": {
                        "color": {
                            "hex": "#FFFFFF",
                            "hsl": {"h": 0, "s": 0, "l": 100},
                            "name": "white",
                            "is_neutral": True,
                        },
                        "category": {"l1": "Shoes", "l2": "Sneakers"},
                        "formality": 2.0,
                        "aesthetics": ["Minimalist", "Streetwear"],
                    },
                    "base_item": {
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
                    "current_outfit": [
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
                        }
                    ],
                },
            }
        },
    )
) -> ValidateItemResponse:
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


@router.post(
    "/validate-outfit",
    response_model=ValidateOutfitResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate a complete outfit",
    description=(
        "Performs full outfit-level validation and scoring.\n\n"
        "Returns completeness, cohesion score (0-100), warnings, and a color strip for quick UI display."
    ),
    responses={
        200: {
            "description": "Outfit validation completed successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "is_complete": True,
                        "cohesion_score": 87,
                        "verdict": "Cohesive smart-casual outfit with balanced neutrals.",
                        "warnings": [],
                        "color_strip": ["#0B1C2D", "#2E2E2E", "#FFFFFF"],
                    }
                }
            },
        },
        422: {
            "description": "Schema validation failed for the request body.",
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected validation engine error.",
            "content": {
                "application/json": {"example": {"detail": "Internal Server Error"}}
            },
        },
    },
)
async def validate_outfit_endpoint(
    request: ValidateOutfitRequest = Body(
        ...,
        openapi_examples={
            "full_outfit_check": {
                "summary": "3-piece outfit validation",
                "value": {
                    "base_item": {
                        "color": {
                            "hex": "#0B1C2D",
                            "hsl": {"h": 210, "s": 61, "l": 11},
                            "name": "navy",
                            "is_neutral": True,
                        },
                        "category": {"l1": "Tops", "l2": "Blazer"},
                        "formality": 4.0,
                        "aesthetics": ["Classic", "Minimalist"],
                    },
                    "outfit": [
                        {
                            "color": {
                                "hex": "#3E3E3E",
                                "hsl": {"h": 0, "s": 0, "l": 24},
                                "name": "charcoal",
                                "is_neutral": True,
                            },
                            "category": {"l1": "Bottoms", "l2": "Trousers"},
                            "formality": 4.0,
                            "aesthetics": ["Classic"],
                        },
                        {
                            "color": {
                                "hex": "#8B5E3C",
                                "hsl": {"h": 26, "s": 40, "l": 39},
                                "name": "brown",
                                "is_neutral": True,
                            },
                            "category": {"l1": "Shoes", "l2": "Loafers"},
                            "formality": 4.0,
                            "aesthetics": ["Classic"],
                        },
                    ],
                },
            }
        },
    )
) -> ValidateOutfitResponse:
    """Validate a complete outfit.
    
    This endpoint performs a comprehensive validation of a complete outfit:
    - Checks if all required categories are present
    - Calculates overall cohesion score (0-100)
    - Validates all item pairs for compatibility
    - Generates a human-readable verdict
    - Returns color strip for visualization
    """
    try:
        logger.info(f"Validating outfit with {len(request.outfit)} items + base item")
        result = validate_outfit(
            items=request.outfit,
            base_item=request.base_item,
        )
        logger.info(f"Outfit validation successful: cohesion_score={result.cohesion_score}")
        return result
    except Exception as e:
        logger.error(f"Outfit validation failed: {e}", exc_info=True)
        raise
