"""Supabase service for database operations.

Handles CRUD for:
- Clothing items
- Outfits
- User closet operations
- Image storage

Schema matches: backend/supabase_schema.sql
"""

import time
from typing import Optional

from supabase import create_client, Client

from app.config import settings
from app.models.schemas import (
    ClothingItemCreate,
    ClothingItemResponse,
    OutfitCreate,
    OutfitResponse,
    OutfitSummary,
    ClosetResponse,
    Category,
    Color,
    HSL,
)


def get_supabase_client() -> Client:
    """Get Supabase client with service role key (bypasses RLS)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def get_supabase_client_anon() -> Client:
    """Get Supabase client with anon key (respects RLS)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


# =============================================================================
# CLOTHING ITEMS
# =============================================================================

async def create_clothing_item(
    user_id: str,
    item: ClothingItemCreate,
    image_url: str,
) -> ClothingItemResponse:
    """Create a new clothing item in the database.
    
    Args:
        user_id: The user's UUID
        item: Clothing item data
        image_url: URL of uploaded image in Supabase Storage
        
    Returns:
        Created clothing item with ID
    """
    supabase = get_supabase_client()
    
    # Prepare data matching schema columns
    data = {
        "user_id": user_id,
        "image_url": image_url,
        # Color fields (separate columns)
        "color_hex": item.color.hex,
        "color_hsl": {
            "h": item.color.hsl.h,
            "s": item.color.hsl.s,
            "l": item.color.hsl.l,
        },
        "color_name": item.color.name,
        "is_neutral": item.color.is_neutral,
        # Category
        "category_l1": item.category.l1,
        "category_l2": item.category.l2,
        # Style
        "formality": item.formality,
        "aesthetics": item.aesthetics or [],
        # Optional metadata
        "brand": item.brand,
        "price": item.price,
        "source_url": item.source_url,
        "ownership": item.ownership or "owned",
    }
    
    result = supabase.table("clothing_items").insert(data).execute()
    
    if not result.data:
        raise ValueError("Failed to create clothing item")
    
    return _row_to_clothing_item(result.data[0])


async def get_clothing_item(item_id: str, user_id: str) -> Optional[ClothingItemResponse]:
    """Get a single clothing item by ID.
    
    Args:
        item_id: The item's UUID
        user_id: The user's UUID (for ownership verification)
        
    Returns:
        Clothing item or None if not found
    """
    supabase = get_supabase_client()
    
    result = (
        supabase.table("clothing_items")
        .select("*")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    return _row_to_clothing_item(result.data[0])


async def get_clothing_items_by_ids(
    item_ids: list[str],
    user_id: str,
) -> list[ClothingItemResponse]:
    """Get multiple clothing items by IDs.
    
    Args:
        item_ids: List of item UUIDs
        user_id: The user's UUID
        
    Returns:
        List of clothing items (may be fewer than requested if some not found)
    """
    if not item_ids:
        return []
    
    supabase = get_supabase_client()
    
    result = (
        supabase.table("clothing_items")
        .select("*")
        .in_("id", item_ids)
        .eq("user_id", user_id)
        .execute()
    )
    
    return [_row_to_clothing_item(row) for row in result.data]


async def get_user_clothing_items(
    user_id: str,
    category_l1: Optional[str] = None,
    ownership: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[ClothingItemResponse]:
    """Get all clothing items for a user.
    
    Args:
        user_id: The user's UUID
        category_l1: Optional filter by L1 category
        ownership: Optional filter by ownership ('owned' or 'wishlist')
        limit: Max items to return
        offset: Pagination offset
        
    Returns:
        List of clothing items
    """
    supabase = get_supabase_client()
    
    query = (
        supabase.table("clothing_items")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    
    if category_l1:
        query = query.eq("category_l1", category_l1)
    
    if ownership:
        query = query.eq("ownership", ownership)
    
    result = query.execute()
    
    return [_row_to_clothing_item(row) for row in result.data]


async def update_clothing_item(
    item_id: str,
    user_id: str,
    updates: dict,
) -> Optional[ClothingItemResponse]:
    """Update a clothing item.
    
    Args:
        item_id: The item's UUID
        user_id: The user's UUID
        updates: Fields to update
        
    Returns:
        Updated clothing item or None if not found
    """
    supabase = get_supabase_client()
    
    # Handle nested Color object
    if "color" in updates:
        color = updates.pop("color")
        if hasattr(color, "model_dump"):
            color = color.model_dump()
        updates["color_hex"] = color["hex"]
        updates["color_hsl"] = color["hsl"]
        updates["color_name"] = color["name"]
        updates["is_neutral"] = color.get("is_neutral", False)
    
    # Handle nested Category object
    if "category" in updates:
        category = updates.pop("category")
        if hasattr(category, "model_dump"):
            category = category.model_dump()
        updates["category_l1"] = category["l1"]
        updates["category_l2"] = category["l2"]
    
    result = (
        supabase.table("clothing_items")
        .update(updates)
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    return _row_to_clothing_item(result.data[0])


async def delete_clothing_item(item_id: str, user_id: str) -> bool:
    """Delete a clothing item.
    
    Args:
        item_id: The item's UUID
        user_id: The user's UUID
        
    Returns:
        True if deleted, False if not found
    """
    supabase = get_supabase_client()
    
    # Get item first to retrieve image_url for cleanup
    item = await get_clothing_item(item_id, user_id)
    
    result = (
        supabase.table("clothing_items")
        .delete()
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if result.data and item and item.image_url:
        # Clean up image from storage
        await delete_image(item.image_url, "clothing-images")
    
    return len(result.data) > 0


# =============================================================================
# OUTFITS
# =============================================================================

async def create_outfit(
    user_id: str,
    outfit: OutfitCreate,
    generated_image_url: Optional[str] = None,
) -> OutfitResponse:
    """Create a new outfit with its items.
    
    Args:
        user_id: The user's UUID
        outfit: Outfit data including item IDs
        generated_image_url: Optional AI-generated try-on image URL
        
    Returns:
        Created outfit with items
    """
    supabase = get_supabase_client()
    
    # Create outfit record
    outfit_data = {
        "user_id": user_id,
        "name": outfit.name,
        "generated_image_url": generated_image_url,
    }
    
    result = supabase.table("outfits").insert(outfit_data).execute()
    
    if not result.data:
        raise ValueError("Failed to create outfit")
    
    outfit_id = result.data[0]["id"]
    
    # Link clothing items to outfit with position
    if outfit.item_ids:
        outfit_items = [
            {
                "outfit_id": outfit_id,
                "clothing_item_id": item_id,
                "position": position,
            }
            for position, item_id in enumerate(outfit.item_ids)
        ]
        supabase.table("outfit_items").insert(outfit_items).execute()
    
    # Fetch complete outfit with items
    return await get_outfit(outfit_id, user_id)


async def get_outfit(outfit_id: str, user_id: str) -> Optional[OutfitResponse]:
    """Get a single outfit with all its items.
    
    Args:
        outfit_id: The outfit's UUID
        user_id: The user's UUID
        
    Returns:
        Outfit with items or None if not found
    """
    supabase = get_supabase_client()
    
    # Get outfit
    result = (
        supabase.table("outfits")
        .select("*")
        .eq("id", outfit_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    outfit_row = result.data[0]
    
    # Get outfit items with clothing details, ordered by position
    items_result = (
        supabase.table("outfit_items")
        .select("clothing_item_id, position, clothing_items(*)")
        .eq("outfit_id", outfit_id)
        .order("position")
        .execute()
    )
    
    items = [
        _row_to_clothing_item(row["clothing_items"])
        for row in items_result.data
        if row.get("clothing_items")
    ]
    
    return OutfitResponse(
        id=outfit_row["id"],
        user_id=outfit_row["user_id"],
        name=outfit_row["name"],
        items=items,
        generated_image_url=outfit_row.get("generated_image_url"),
        created_at=outfit_row["created_at"],
    )


async def get_user_outfits(
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> list[OutfitSummary]:
    """Get all outfits for a user (summary only).
    
    Args:
        user_id: The user's UUID
        limit: Max outfits to return
        offset: Pagination offset
        
    Returns:
        List of outfit summaries
    """
    supabase = get_supabase_client()
    
    result = (
        supabase.table("outfits")
        .select("id, name, generated_image_url, created_at, outfit_items(clothing_items(image_url))")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    
    summaries = []
    for row in result.data:
        # Get first item's image as thumbnail (or generated image)
        thumbnail = row.get("generated_image_url")
        if not thumbnail and row.get("outfit_items"):
            for oi in row["outfit_items"]:
                if oi.get("clothing_items", {}).get("image_url"):
                    thumbnail = oi["clothing_items"]["image_url"]
                    break
        
        item_count = len(row.get("outfit_items", []))
        
        summaries.append(OutfitSummary(
            id=row["id"],
            name=row["name"],
            item_count=item_count,
            thumbnail_url=thumbnail,
            created_at=row["created_at"],
        ))
    
    return summaries


async def update_outfit(
    outfit_id: str,
    user_id: str,
    updates: dict,
) -> Optional[OutfitResponse]:
    """Update an outfit.
    
    Args:
        outfit_id: The outfit's UUID
        user_id: The user's UUID
        updates: Fields to update (name, generated_image_url)
        
    Returns:
        Updated outfit or None if not found
    """
    supabase = get_supabase_client()
    
    # Only allow certain fields to be updated
    allowed_fields = {"name", "generated_image_url"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not filtered_updates:
        return await get_outfit(outfit_id, user_id)
    
    result = (
        supabase.table("outfits")
        .update(filtered_updates)
        .eq("id", outfit_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    return await get_outfit(outfit_id, user_id)


async def add_items_to_outfit(
    outfit_id: str,
    user_id: str,
    item_ids: list[str],
) -> Optional[OutfitResponse]:
    """Add clothing items to an existing outfit.
    
    Args:
        outfit_id: The outfit's UUID
        user_id: The user's UUID
        item_ids: List of clothing item IDs to add
        
    Returns:
        Updated outfit or None if not found
    """
    supabase = get_supabase_client()
    
    # Verify outfit ownership
    outfit = await get_outfit(outfit_id, user_id)
    if not outfit:
        return None
    
    # Get current max position
    existing = (
        supabase.table("outfit_items")
        .select("position")
        .eq("outfit_id", outfit_id)
        .order("position", desc=True)
        .limit(1)
        .execute()
    )
    
    start_position = (existing.data[0]["position"] + 1) if existing.data else 0
    
    # Add new items
    outfit_items = [
        {
            "outfit_id": outfit_id,
            "clothing_item_id": item_id,
            "position": start_position + i,
        }
        for i, item_id in enumerate(item_ids)
    ]
    
    supabase.table("outfit_items").insert(outfit_items).execute()
    
    return await get_outfit(outfit_id, user_id)


async def remove_item_from_outfit(
    outfit_id: str,
    user_id: str,
    item_id: str,
) -> Optional[OutfitResponse]:
    """Remove a clothing item from an outfit.
    
    Args:
        outfit_id: The outfit's UUID
        user_id: The user's UUID
        item_id: The clothing item ID to remove
        
    Returns:
        Updated outfit or None if not found
    """
    supabase = get_supabase_client()
    
    # Verify outfit ownership
    outfit = await get_outfit(outfit_id, user_id)
    if not outfit:
        return None
    
    supabase.table("outfit_items").delete().eq("outfit_id", outfit_id).eq("clothing_item_id", item_id).execute()
    
    return await get_outfit(outfit_id, user_id)


async def delete_outfit(outfit_id: str, user_id: str) -> bool:
    """Delete an outfit.
    
    Args:
        outfit_id: The outfit's UUID
        user_id: The user's UUID
        
    Returns:
        True if deleted, False if not found
    """
    supabase = get_supabase_client()
    
    # Get outfit first to retrieve generated_image_url for cleanup
    outfit_result = (
        supabase.table("outfits")
        .select("generated_image_url")
        .eq("id", outfit_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    result = (
        supabase.table("outfits")
        .delete()
        .eq("id", outfit_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    # Clean up generated image if exists
    if result.data and outfit_result.data:
        image_url = outfit_result.data[0].get("generated_image_url")
        if image_url:
            await delete_image(image_url, "generated-images")
    
    return len(result.data) > 0


# =============================================================================
# CLOSET (Aggregate View)
# =============================================================================

async def get_closet(user_id: str) -> ClosetResponse:
    """Get user's complete closet (items grouped by category + outfits).
    
    Args:
        user_id: The user's UUID
        
    Returns:
        Complete closet data
    """
    # Get all owned items
    items = await get_user_clothing_items(user_id, ownership="owned", limit=500)
    
    # Group by L1 category
    items_by_category: dict[str, list[ClothingItemResponse]] = {}
    for item in items:
        l1 = item.category.l1
        if l1 not in items_by_category:
            items_by_category[l1] = []
        items_by_category[l1].append(item)
    
    # Get outfit summaries
    outfits = await get_user_outfits(user_id, limit=100)
    
    return ClosetResponse(
        items_by_category=items_by_category,
        outfits=outfits,
        total_items=len(items),
        total_outfits=len(outfits),
    )


# =============================================================================
# STORAGE (Image Uploads)
# =============================================================================

async def upload_image(
    user_id: str,
    file_data: bytes,
    file_name: str,
    bucket: str = "clothing-images",
    content_type: str = "image/jpeg",
) -> str:
    """Upload an image to Supabase Storage.
    
    Args:
        user_id: The user's UUID (for folder organization)
        file_data: Image file bytes
        file_name: Original file name
        bucket: Storage bucket name
        content_type: MIME type
        
    Returns:
        Public URL of uploaded image
    """
    supabase = get_supabase_client()
    
    # Generate unique path: user_id/timestamp_filename
    timestamp = int(time.time() * 1000)
    # Sanitize filename
    safe_filename = "".join(c for c in file_name if c.isalnum() or c in "._-").strip()
    if not safe_filename:
        safe_filename = "image.jpg"
    path = f"{user_id}/{timestamp}_{safe_filename}"
    
    # Upload to bucket
    supabase.storage.from_(bucket).upload(
        path,
        file_data,
        {"content-type": content_type}
    )
    
    # Get public URL
    public_url = supabase.storage.from_(bucket).get_public_url(path)
    
    return public_url


async def upload_generated_image(
    user_id: str,
    image_data: bytes,
    outfit_id: str,
) -> str:
    """Upload a generated try-on image.
    
    Args:
        user_id: The user's UUID
        image_data: Generated image bytes
        outfit_id: Associated outfit ID
        
    Returns:
        Public URL of uploaded image
    """
    file_name = f"tryon_{outfit_id}.png"
    return await upload_image(
        user_id,
        image_data,
        file_name,
        bucket="generated-images",
        content_type="image/png",
    )


async def delete_image(image_url: str, bucket: str = "clothing-images") -> bool:
    """Delete an image from Supabase Storage.
    
    Args:
        image_url: Full public URL of the image
        bucket: Storage bucket name
        
    Returns:
        True if deleted
    """
    supabase = get_supabase_client()
    
    # Extract path from URL
    # URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    try:
        path = image_url.split(f"/{bucket}/")[1]
        supabase.storage.from_(bucket).remove([path])
        return True
    except Exception:
        return False


# =============================================================================
# USER PROFILE
# =============================================================================

async def get_user_profile(user_id: str) -> Optional[dict]:
    """Get user profile data.
    
    Args:
        user_id: The user's UUID
        
    Returns:
        Profile dict or None
    """
    supabase = get_supabase_client()
    
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    return result.data[0]


async def update_user_profile(user_id: str, updates: dict) -> Optional[dict]:
    """Update user profile.
    
    Args:
        user_id: The user's UUID
        updates: Fields to update (name, avatar_url)
        
    Returns:
        Updated profile or None
    """
    supabase = get_supabase_client()
    
    # Only allow certain fields
    allowed_fields = {"name", "avatar_url"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not filtered_updates:
        return await get_user_profile(user_id)
    
    result = (
        supabase.table("profiles")
        .update(filtered_updates)
        .eq("id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    return result.data[0]


# =============================================================================
# HELPERS
# =============================================================================

def _row_to_clothing_item(row: dict) -> ClothingItemResponse:
    """Convert database row to ClothingItemResponse."""
    hsl_data = row["color_hsl"]
    
    return ClothingItemResponse(
        id=row["id"],
        user_id=row["user_id"],
        image_url=row["image_url"],
        color=Color(
            hex=row["color_hex"],
            hsl=HSL(
                h=hsl_data["h"],
                s=hsl_data["s"],
                l=hsl_data["l"],
            ),
            name=row["color_name"],
            is_neutral=row.get("is_neutral", False),
        ),
        category=Category(
            l1=row["category_l1"],
            l2=row["category_l2"],
        ),
        formality=row["formality"],
        aesthetics=row.get("aesthetics", []),
        brand=row.get("brand"),
        price=float(row["price"]) if row.get("price") else None,
        source_url=row.get("source_url"),
        ownership=row.get("ownership", "owned"),
        created_at=row["created_at"],
    )