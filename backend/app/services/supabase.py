"""Supabase service for database operations.

Handles CRUD for:
- Clothing items
- Outfits
- User closet operations
- Image storage

Schema matches: backend/supabase_schema.sql

NOTE: Uses async client (acreate_client) for non-blocking operations.
"""

import time
from typing import Optional

from supabase import acreate_client, AsyncClient

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
    Sizing,
)


# =============================================================================
# CLIENT MANAGEMENT
# =============================================================================

_service_client: AsyncClient | None = None
_anon_client: AsyncClient | None = None


async def get_supabase_client() -> AsyncClient:
    """Get async Supabase client with service role key (bypasses RLS)."""
    global _service_client
    if _service_client is None:
        _service_client = await acreate_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY
        )
    return _service_client


async def get_supabase_client_anon() -> AsyncClient:
    """Get async Supabase client with anon key (respects RLS)."""
    global _anon_client
    if _anon_client is None:
        _anon_client = await acreate_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    return _anon_client


async def close_supabase_clients():
    """Close all Supabase clients (call on app shutdown)."""
    global _service_client, _anon_client
    if _service_client:
        await _service_client.aclose()
        _service_client = None
    if _anon_client:
        await _anon_client.aclose()
        _anon_client = None


# =============================================================================
# CLOTHING ITEMS
# =============================================================================

async def create_clothing_item(
    user_id: str,
    item: ClothingItemCreate,
    image_url: str,
) -> ClothingItemResponse:
    """Create a new clothing item in the database."""
    supabase = await get_supabase_client()
    
    data = {
        "user_id": user_id,
        "image_url": image_url,
        "color_hex": item.color.hex,
        "color_hsl": {
            "h": item.color.hsl.h,
            "s": item.color.hsl.s,
            "l": item.color.hsl.l,
        },
        "color_name": item.color.name,
        "is_neutral": item.color.is_neutral,
        "category_l1": item.category.l1,
        "category_l2": item.category.l2,
        "formality": item.formality,
        "aesthetics": item.aesthetics or [],
        "brand": item.brand,
        "sizing": item.sizing.model_dump(exclude_none=True) if item.sizing else None,
        "price": item.price,
        "source_url": item.source_url,
        "ownership": item.ownership or "owned",
    }
    
    result = await supabase.table("clothing_items").insert(data).execute()
    
    if not result.data:
        raise ValueError("Failed to create clothing item")
    
    return _row_to_clothing_item(result.data[0])


async def get_clothing_item(item_id: str, user_id: str) -> Optional[ClothingItemResponse]:
    """Get a single clothing item by ID."""
    supabase = await get_supabase_client()
    
    result = await (
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
    """Get multiple clothing items by IDs."""
    if not item_ids:
        return []
    
    supabase = await get_supabase_client()
    
    result = await (
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
    """Get all clothing items for a user."""
    supabase = await get_supabase_client()
    
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
    
    result = await query.execute()
    
    return [_row_to_clothing_item(row) for row in result.data]


async def update_clothing_item(
    item_id: str,
    user_id: str,
    updates: dict,
) -> Optional[ClothingItemResponse]:
    """Update a clothing item."""
    supabase = await get_supabase_client()
    
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

    # Handle nested Sizing object
    if "sizing" in updates:
        sizing = updates["sizing"]
        if hasattr(sizing, "model_dump"):
            sizing = sizing.model_dump(exclude_none=True)
        updates["sizing"] = sizing
    
    result = await (
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
    """Delete a clothing item."""
    supabase = await get_supabase_client()
    
    # Get item first to retrieve image_url for cleanup
    item = await get_clothing_item(item_id, user_id)
    
    result = await (
        supabase.table("clothing_items")
        .delete()
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if result.data and item and item.image_url:
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
    """Create a new outfit with its items."""
    supabase = await get_supabase_client()
    
    final_image_url = generated_image_url or outfit.generated_image_url

    outfit_data = {
        "user_id": user_id,
        "name": outfit.name,
        "generated_image_url": final_image_url,
    }
    
    result = await supabase.table("outfits").insert(outfit_data).execute()
    
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
        await supabase.table("outfit_items").insert(outfit_items).execute()
    
    return await get_outfit(outfit_id, user_id)


async def get_outfit(outfit_id: str, user_id: str) -> Optional[OutfitResponse]:
    """Get a single outfit with all its items."""
    supabase = await get_supabase_client()
    
    result = await (
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
    items_result = await (
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
    """Get all outfits for a user (summary only)."""
    supabase = await get_supabase_client()
    
    result = await (
        supabase.table("outfits")
        .select("id, name, generated_image_url, created_at, outfit_items(clothing_items(image_url))")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    
    summaries = []
    for row in result.data:
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
    """Update an outfit."""
    supabase = await get_supabase_client()
    
    allowed_fields = {"name", "generated_image_url"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not filtered_updates:
        return await get_outfit(outfit_id, user_id)
    
    result = await (
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
    """Add clothing items to an existing outfit."""
    supabase = await get_supabase_client()
    
    outfit = await get_outfit(outfit_id, user_id)
    if not outfit:
        return None
    
    existing = await (
        supabase.table("outfit_items")
        .select("position")
        .eq("outfit_id", outfit_id)
        .order("position", desc=True)
        .limit(1)
        .execute()
    )
    
    start_position = (existing.data[0]["position"] + 1) if existing.data else 0
    
    outfit_items = [
        {
            "outfit_id": outfit_id,
            "clothing_item_id": item_id,
            "position": start_position + i,
        }
        for i, item_id in enumerate(item_ids)
    ]
    
    await supabase.table("outfit_items").insert(outfit_items).execute()
    
    return await get_outfit(outfit_id, user_id)


async def remove_item_from_outfit(
    outfit_id: str,
    user_id: str,
    item_id: str,
) -> Optional[OutfitResponse]:
    """Remove a clothing item from an outfit."""
    supabase = await get_supabase_client()
    
    outfit = await get_outfit(outfit_id, user_id)
    if not outfit:
        return None
    
    await (
        supabase.table("outfit_items")
        .delete()
        .eq("outfit_id", outfit_id)
        .eq("clothing_item_id", item_id)
        .execute()
    )
    
    return await get_outfit(outfit_id, user_id)


async def delete_outfit(outfit_id: str, user_id: str) -> bool:
    """Delete an outfit."""
    supabase = await get_supabase_client()
    
    outfit_result = await (
        supabase.table("outfits")
        .select("generated_image_url")
        .eq("id", outfit_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    result = await (
        supabase.table("outfits")
        .delete()
        .eq("id", outfit_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if result.data and outfit_result.data:
        image_url = outfit_result.data[0].get("generated_image_url")
        if image_url:
            await delete_image(image_url, "generated-images")
    
    return len(result.data) > 0


# =============================================================================
# CLOSET (Aggregate View)
# =============================================================================

async def get_closet(user_id: str) -> ClosetResponse:
    """Get user's complete closet (items grouped by category + outfits)."""
    items = await get_user_clothing_items(user_id, limit=500)
    
    items_by_category: dict[str, list[ClothingItemResponse]] = {}
    for item in items:
        l1 = item.category.l1
        if l1 not in items_by_category:
            items_by_category[l1] = []
        items_by_category[l1].append(item)
    
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
    """Upload an image to Supabase Storage."""
    supabase = await get_supabase_client()
    
    timestamp = int(time.time() * 1000)
    safe_filename = "".join(c for c in file_name if c.isalnum() or c in "._-").strip()
    if not safe_filename:
        safe_filename = "image.jpg"
    path = f"{user_id}/{timestamp}_{safe_filename}"
    
    await supabase.storage.from_(bucket).upload(
        path,
        file_data,
        {"content-type": content_type}
    )
    
    # get_public_url is async for this client
    public_url = await supabase.storage.from_(bucket).get_public_url(path)
    
    return public_url


async def upload_user_photo(
    user_id: str,
    file_data: bytes,
    file_name: str,
) -> str:
    """Upload user's full-body photo for try-on."""
    return await upload_image(
        user_id,
        file_data,
        file_name,
        bucket="user-photos",
        content_type="image/jpeg",
    )


async def upload_generated_image(
    user_id: str,
    image_data: bytes,
    outfit_id: str,
) -> str:
    """Upload a generated try-on image."""
    file_name = f"tryon_{outfit_id}.png"
    return await upload_image(
        user_id,
        image_data,
        file_name,
        bucket="generated-images",
        content_type="image/png",
    )


async def delete_image(image_url: str, bucket: str = "clothing-images") -> bool:
    """Delete an image from Supabase Storage."""
    supabase = await get_supabase_client()
    
    try:
        path = image_url.split(f"/{bucket}/")[1]
        await supabase.storage.from_(bucket).remove([path])
        return True
    except Exception:
        return False


async def delete_user_photo(image_url: str) -> bool:
    """Delete a user photo."""
    return await delete_image(image_url, "user-photos")


# =============================================================================
# USER PROFILE
# =============================================================================

async def get_user_profile(user_id: str) -> Optional[dict]:
    """Get user profile data."""
    supabase = await get_supabase_client()
    
    result = await (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    return result.data[0]


async def update_user_profile(user_id: str, updates: dict) -> Optional[dict]:
    """Update user profile."""
    supabase = await get_supabase_client()
    
    allowed_fields = {"name", "avatar_url"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not filtered_updates:
        return await get_user_profile(user_id)
    
    result = await (
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
    sizing_data = row.get("sizing")
    sizing = Sizing(**sizing_data) if isinstance(sizing_data, dict) else None
    
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
        aesthetics=row.get("aesthetics") or [],
        brand=row.get("brand"),
        sizing=sizing,
        price=float(row["price"]) if row.get("price") else None,
        source_url=row.get("source_url"),
        ownership=row.get("ownership", "owned"),
        created_at=row["created_at"],
    )
