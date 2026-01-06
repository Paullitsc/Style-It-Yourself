"""
Outfit service - Business logic and database operations for outfits.
"""
from typing import List
from app.models.schemas import (
    OutfitCreate,
    OutfitResponse,
    ClothingItemResponse,
    ClothingItemCreate,
    Color,
    HSL,
    Category,
)
from app.services import get_supabase


def _map_clothing_item_from_db(row: dict) -> ClothingItemResponse:
    """Convert db row to ClothingItemResponse schema."""
    return ClothingItemResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]) if row["user_id"] else None,
        image_url=row["image_url"],
        color=Color(
            hex=row["color_hex"],
            hsl=HSL(**row["color_hsl"]),
            name=row["color_name"],
            is_neutral=row.get("is_neutral", False)
        ),
        category=Category(
            l1=row["category_l1"],
            l2=row["category_l2"]
        ),
        formality=float(row["formality"]),
        aesthetics=row.get("aesthetics", []),
        brand=row.get("brand"),
        price=float(row["price"]) if row.get("price") else None,
        source_url=row.get("source_url"),
        ownership=row.get("ownership", "owned"),
        created_at=row["created_at"]
    )


def _map_clothing_item_to_db(item: ClothingItemCreate, user_id: str) -> dict:
    """Convert ClothingItemCreate schema to database row format."""
    return {
        "user_id": user_id,
        "image_url": item.image_url,
        "color_hex": item.color.hex,
        "color_hsl": {
            "h": item.color.hsl.h,
            "s": item.color.hsl.s,
            "l": item.color.hsl.l
        },
        "color_name": item.color.name,
        "is_neutral": item.color.is_neutral,
        "category_l1": item.category.l1,
        "category_l2": item.category.l2,
        "formality": int(item.formality),
        "aesthetics": item.aesthetics,
        "brand": item.brand,
        "price": item.price,
        "source_url": item.source_url,
        "ownership": item.ownership or "owned"
    }


async def create_outfit(outfit: OutfitCreate, user_id: str) -> OutfitResponse:
    """
    Create a new outfit with associated clothing items.
    
    Args:
        outfit: Outfit data including name and items
        user_id: ID of the authenticated user
    
    Returns:
        OutfitResponse with created outfit data
    
    Raises:
        Exception: If database operations fail
    """
    supabase = get_supabase()
    
    # Insert outfit record
    outfit_data = {
        "user_id": user_id,
        "name": outfit.name
    }
    
    outfit_result = supabase.table("outfits").insert(outfit_data).execute()
    
    if not outfit_result.data or len(outfit_result.data) == 0:
        raise Exception("Failed to create outfit")
    
    outfit_id = outfit_result.data[0]["id"]
    created_outfit = outfit_result.data[0]
    
    # Insert clothing items and outfit_items join records
    clothing_item_responses = []
    created_clothing_item_ids = []  # Track created items for cleanup on error
    
    try:
        for position, item in enumerate(outfit.items):
            # Insert clothing_item
            item_data = _map_clothing_item_to_db(item, user_id)
            item_result = supabase.table("clothing_items").insert(item_data).execute()
            
            if not item_result.data or len(item_result.data) == 0:
                # Cleanup: delete outfit & any previously created items
                supabase.table("outfits").delete().eq("id", outfit_id).execute()
                for ci_id in created_clothing_item_ids:
                    supabase.table("clothing_items").delete().eq("id", ci_id).execute()
                raise Exception(f"Failed to create clothing item at position {position}")
            
            clothing_item_id = item_result.data[0]["id"]
            clothing_item_row = item_result.data[0]
            created_clothing_item_ids.append(clothing_item_id)
            
            # Insert outfit_items join record
            join_data = {
                "outfit_id": outfit_id,
                "clothing_item_id": clothing_item_id,
                "position": position
            }
            join_result = supabase.table("outfit_items").insert(join_data).execute()
            
            if not join_result.data:
                # Cleanup: delete outfit and all created clothing items
                supabase.table("outfits").delete().eq("id", outfit_id).execute()
                for ci_id in created_clothing_item_ids:
                    supabase.table("clothing_items").delete().eq("id", ci_id).execute()
                raise Exception(f"Failed to link clothing item at position {position} to outfit")
            
            # Map to response format
            clothing_item_responses.append(_map_clothing_item_from_db(clothing_item_row))
    except Exception:
        # Re-raise after cleanup
        raise
    
    return OutfitResponse(
        id=str(outfit_id),
        name=created_outfit["name"],
        items=clothing_item_responses,
        generated_image_url=created_outfit.get("generated_image_url"),
        created_at=created_outfit["created_at"]
    )


async def get_outfits(user_id: str) -> List[OutfitResponse]:
    """
    Retrieve all outfits for a user.
    
    Args:
        user_id: ID of the authenticated user
    
    Returns:
        List of OutfitResponse objects
    
    Raises:
        Exception: If database operations fail
    """
    supabase = get_supabase()
    
    # Get all outfits for the user
    outfits_result = supabase.table("outfits").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    
    if not outfits_result.data:
        return []
    
    # For each outfit, get its items
    outfit_responses = []
    for outfit_row in outfits_result.data:
        outfit_id = outfit_row["id"]
        
        # Get outfit_items and join with clothing_items
        items_result = supabase.table("outfit_items").select(
            "position, clothing_items(*)"
        ).eq("outfit_id", outfit_id).order("position").execute()
        
        clothing_items = []
        if items_result.data:
            for item_join in items_result.data:
                if item_join.get("clothing_items"):
                    clothing_item_row = item_join["clothing_items"]
                    clothing_items.append(_map_clothing_item_from_db(clothing_item_row))
        
        outfit_responses.append(OutfitResponse(
            id=str(outfit_id),
            name=outfit_row["name"],
            items=clothing_items,
            generated_image_url=outfit_row.get("generated_image_url"),
            created_at=outfit_row["created_at"]
        ))
    
    return outfit_responses


async def get_outfit(outfit_id: str, user_id: str) -> OutfitResponse:
    """
    Retrieve a single outfit by ID.
    
    Args:
        outfit_id: UUID of the outfit
        user_id: ID of the authenticated user
    
    Returns:
        OutfitResponse with outfit data
    
    Raises:
        ValueError: If outfit doesn't exist or belongs to another user
        Exception: If database operations fail
    """
    supabase = get_supabase()
    
    # Get outfit with ownership check
    outfit_result = supabase.table("outfits").select("*").eq("id", outfit_id).eq("user_id", user_id).execute()
    
    if not outfit_result.data or len(outfit_result.data) == 0:
        raise ValueError("Outfit not found")
    
    outfit_row = outfit_result.data[0]
    
    # Get outfit_items and join with clothing_items
    items_result = supabase.table("outfit_items").select(
        "position, clothing_items(*)"
    ).eq("outfit_id", outfit_id).order("position").execute()
    
    clothing_items = []
    if items_result.data:
        for item_join in items_result.data:
            if item_join.get("clothing_items"):
                clothing_item_row = item_join["clothing_items"]
                clothing_items.append(_map_clothing_item_from_db(clothing_item_row))
    
    return OutfitResponse(
        id=str(outfit_id),
        name=outfit_row["name"],
        items=clothing_items,
        generated_image_url=outfit_row.get("generated_image_url"),
        created_at=outfit_row["created_at"]
    )


async def delete_outfit(outfit_id: str, user_id: str) -> None:
    """
    Delete an outfit by ID.
    
    Note: This deletes the outfit and cascade deletes outfit_items.
    Clothing items are preserved as they may be used in other outfits.
    
    Args:
        outfit_id: UUID of the outfit
        user_id: ID of the authenticated user
    
    Raises:
        ValueError: If outfit doesn't exist or belongs to another user
        Exception: If database operations fail
    """
    supabase = get_supabase()
    
    # First verify ownership
    outfit_result = supabase.table("outfits").select("id, user_id").eq("id", outfit_id).execute()
    
    if not outfit_result.data or len(outfit_result.data) == 0:
        raise ValueError("Outfit not found")
    
    outfit_user_id = outfit_result.data[0]["user_id"]
    if outfit_user_id != user_id:
        raise ValueError("You do not have permission to delete this outfit")
    
    # Delete outfit (cascade deletes outfit_items automatically)
    supabase.table("outfits").delete().eq("id", outfit_id).eq("user_id", user_id).execute()

