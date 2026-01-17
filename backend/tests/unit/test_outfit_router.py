"""
Unit tests for outfit_service.py - Outfit CRUD operations.


ROUGH DRAFT - NEEDS WORK

"""
import pytest
from typing import Optional
from unittest.mock import Mock, patch, MagicMock
from app.models.schemas import (
    OutfitCreate,
    OutfitResponse,
    ClothingItemCreate,
    ClothingItemResponse,
    Color,
    HSL,
    Category,
)
from app.services import outfit_service

def _make_color(name: str, h: int = 0, s: int = 50, l: int = 50, hex_value: str = "#123456") -> Color:
    """Helper to create a Color object."""
    is_neutral = name.lower() in ["black", "white", "gray", "grey", "navy", "beige", "cream", "tan", "khaki"]
    return Color(hex=hex_value, hsl=HSL(h=h, s=s, l=l), name=name, is_neutral=is_neutral)


def _make_clothing_item_create(
    category_l1: str = "Tops",
    category_l2: str = "T-Shirts",
    formality: float = 3.0,
    aesthetics: Optional[list[str]] = None,
    color_name: str = "navy",
    image_url: str = "https://example.com/image.jpg",
) -> ClothingItemCreate:
    """Helper to create a ClothingItemCreate object."""
    return ClothingItemCreate(
        image_url=image_url,
        color=_make_color(color_name),
        category=Category(l1=category_l1, l2=category_l2),
        formality=formality,
        aesthetics=aesthetics or [],
        brand="Test Brand",
        price=50.0,
        ownership="owned",
    )


def _make_outfit_create(name: str = "Test Outfit", num_items: int = 2) -> OutfitCreate:
    """Helper to create an OutfitCreate object."""
    items = [
        _make_clothing_item_create("Tops", "T-Shirts", 3.0, ["Minimalist"], "navy"),
        _make_clothing_item_create("Bottoms", "Jeans", 3.0, ["Minimalist"], "black"),
    ]
    if num_items > 2:
        items.append(_make_clothing_item_create("Shoes", "Sneakers", 3.0, ["Minimalist"], "white"))
    return OutfitCreate(name=name, items=items[:num_items])


def _make_db_clothing_item_row(
    item_id: str = "item-123", 
    user_id: str = "user-123",
    category_l1: str = "Tops",
    category_l2: str = "T-Shirts"
) -> dict:
    """Helper to create a database clothing_item row."""
    return {
        "id": item_id,
        "user_id": user_id,
        "image_url": "https://example.com/image.jpg",
        "color_hex": "#123456",
        "color_hsl": {"h": 0, "s": 50, "l": 50},
        "color_name": "navy",
        "is_neutral": False,
        "category_l1": category_l1,
        "category_l2": category_l2,
        "formality": 3,
        "aesthetics": ["Minimalist"],
        "brand": "Test Brand",
        "price": 50.0,
        "source_url": None,
        "ownership": "owned",
        "created_at": "2024-01-01T00:00:00Z",
    }


def _make_db_outfit_row(outfit_id: str = "outfit-123", user_id: str = "user-123") -> dict:
    """Helper to create a database outfit row."""
    return {
        "id": outfit_id,
        "user_id": user_id,
        "name": "Test Outfit",
        "generated_image_url": None,
        "created_at": "2024-01-01T00:00:00Z",
    }


# Create Outfit Tests

@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_create_outfit_success(mock_get_supabase):
    """Test successful outfit creation."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    # Mock outfit insert
    outfit_id = "outfit-123"
    outfit_row = _make_db_outfit_row(outfit_id)
    
    # Mock clothing item inserts
    item_id_1 = "item-1"
    item_id_2 = "item-2"
    item_row_1 = _make_db_clothing_item_row(item_id_1)
    item_row_2 = _make_db_clothing_item_row(item_id_2, category_l1="Bottoms", category_l2="Jeans")
    
    # Use table name to determine which mock to return
    def mock_table_call(table_name):
        mock_table = Mock()
        if table_name == "outfits":
            # Return outfit insert mock
            mock_table.insert.return_value.execute.return_value.data = [outfit_row]
        elif table_name == "clothing_items":
            # Track which clothing item we're on
            call_count = len([c for c in mock_supabase.table.call_args_list if c[0][0] == "clothing_items"])
            if call_count == 0:
                mock_table.insert.return_value.execute.return_value.data = [item_row_1]
            else:
                mock_table.insert.return_value.execute.return_value.data = [item_row_2]
        elif table_name == "outfit_items":
            # Return outfit_items insert mock
            mock_table.insert.return_value.execute.return_value.data = [
                {"outfit_id": outfit_id, "clothing_item_id": item_id_1}
            ]
        return mock_table
    
    mock_supabase.table.side_effect = mock_table_call
    
    outfit = _make_outfit_create("Test Outfit", num_items=2)
    user_id = "user-123"
    
    result = await outfit_service.create_outfit(outfit, user_id)
    
    assert isinstance(result, OutfitResponse)
    assert result.id == outfit_id
    assert result.name == "Test Outfit"
    assert len(result.items) == 2


@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_create_outfit_fails_on_outfit_insert(mock_get_supabase):
    """Test outfit creation fails when outfit insert fails."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    # Mock outfit insert failure
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = []
    
    outfit = _make_outfit_create()
    user_id = "user-123"
    
    with pytest.raises(Exception, match="Failed to create outfit"):
        await outfit_service.create_outfit(outfit, user_id)


@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_create_outfit_cleanup_on_item_failure(mock_get_supabase):
    """Test that outfit is cleaned up when item creation fails."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    outfit_id = "outfit-123"
    outfit_row = _make_db_outfit_row(outfit_id)
    
    # Mock successful outfit insert
    mock_outfit_insert = Mock()
    mock_outfit_insert.execute.return_value.data = [outfit_row]
    
    # Mock first item insert success, second fails
    mock_item_1_insert = Mock()
    item_row_1 = _make_db_clothing_item_row("item-1")
    mock_item_1_insert.execute.return_value.data = [item_row_1]
    
    mock_item_2_insert = Mock()
    mock_item_2_insert.execute.return_value.data = []  # Failure
    
    mock_supabase.table.return_value.insert.side_effect = [
        mock_outfit_insert,
        mock_item_1_insert,
        mock_item_2_insert,
    ]
    
    # Mock delete calls for cleanup
    mock_delete = Mock()
    mock_delete.eq.return_value.execute.return_value = Mock()
    mock_supabase.table.return_value.delete.return_value = mock_delete
    
    outfit = _make_outfit_create(num_items=2)
    user_id = "user-123"
    
    with pytest.raises(Exception, match="Failed to (create clothing item|link clothing item)"):
        await outfit_service.create_outfit(outfit, user_id)
    
    # Verify cleanup was called
    assert mock_supabase.table.return_value.delete.call_count >= 1


# ==============================================================================
# GET OUTFITS TESTS
# ==============================================================================

@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_get_outfits_success(mock_get_supabase):
    """Test successful retrieval of all outfits."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    outfit_id = "outfit-123"
    outfit_row = _make_db_outfit_row(outfit_id)
    
    item_id = "item-123"
    item_row = _make_db_clothing_item_row(item_id)
    
    # Mock outfits query
    mock_outfits_result = Mock()
    mock_outfits_result.data = [outfit_row]
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_outfits_result
    
    # Mock outfit_items query
    mock_items_result = Mock()
    mock_items_result.data = [
        {
            "position": 0,
            "clothing_items": item_row
        }
    ]
    
    # Setup side effect for different table calls
    def mock_table_call(table_name):
        mock_table = Mock()
        if table_name == "outfits":
            mock_table.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_outfits_result
        elif table_name == "outfit_items":
            mock_table.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_items_result
        return mock_table
    
    mock_supabase.table.side_effect = mock_table_call
    
    user_id = "user-123"
    result = await outfit_service.get_outfits(user_id)
    
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0].id == outfit_id
    assert len(result[0].items) == 1


@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_get_outfits_empty(mock_get_supabase):
    """Test retrieval when user has no outfits."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    mock_outfits_result = Mock()
    mock_outfits_result.data = []
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_outfits_result
    
    user_id = "user-123"
    result = await outfit_service.get_outfits(user_id)
    
    assert result == []


# ==============================================================================
# GET SINGLE OUTFIT TESTS
# ==============================================================================

@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_get_outfit_success(mock_get_supabase):
    """Test successful retrieval of single outfit."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    outfit_id = "outfit-123"
    outfit_row = _make_db_outfit_row(outfit_id)
    item_row = _make_db_clothing_item_row()
    
    # Mock outfit query
    mock_outfit_result = Mock()
    mock_outfit_result.data = [outfit_row]
    
    # Mock outfit_items query
    mock_items_result = Mock()
    mock_items_result.data = [
        {
            "position": 0,
            "clothing_items": item_row
        }
    ]
    
    def mock_table_call(table_name):
        mock_table = Mock()
        if table_name == "outfits":
            # Chain: table().select().eq().eq().execute()
            mock_eq_chain = Mock()
            mock_eq_chain.eq.return_value.execute.return_value = mock_outfit_result
            mock_table.select.return_value.eq.return_value = mock_eq_chain
        elif table_name == "outfit_items":
            mock_table.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_items_result
        return mock_table
    
    mock_supabase.table.side_effect = mock_table_call
    
    user_id = "user-123"
    result = await outfit_service.get_outfit(outfit_id, user_id)
    
    assert isinstance(result, OutfitResponse)
    assert result.id == outfit_id
    assert len(result.items) == 1


@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_get_outfit_not_found(mock_get_supabase):
    """Test retrieval of non-existent outfit."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    mock_outfit_result = Mock()
    mock_outfit_result.data = []
    
    # Chain: table().select().eq().eq().execute()
    mock_eq_chain = Mock()
    mock_eq_chain.eq.return_value.execute.return_value = mock_outfit_result
    mock_supabase.table.return_value.select.return_value.eq.return_value = mock_eq_chain
    
    with pytest.raises(ValueError, match="Outfit not found"):
        await outfit_service.get_outfit("nonexistent-id", "user-123")


# ==============================================================================
# DELETE OUTFIT TESTS
# ==============================================================================

@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_delete_outfit_success(mock_get_supabase):
    """Test successful outfit deletion."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    outfit_id = "outfit-123"
    user_id = "user-123"
    outfit_row = _make_db_outfit_row(outfit_id, user_id)
    
    # Mock ownership check
    mock_check_result = Mock()
    mock_check_result.data = [outfit_row]
    
    # Mock delete
    mock_delete_result = Mock()
    mock_delete_result.execute.return_value = Mock()
    
    def mock_table_call(table_name):
        mock_table = Mock()
        if table_name == "outfits":
            # For select (ownership check)
            mock_select = Mock()
            mock_select.eq.return_value.execute.return_value = mock_check_result
            # For delete
            mock_table.delete.return_value.eq.return_value.eq.return_value.execute.return_value = Mock()
            mock_table.select.return_value = mock_select
        return mock_table
    
    mock_supabase.table.side_effect = mock_table_call
    
    await outfit_service.delete_outfit(outfit_id, user_id)
    
    # Verify delete was called
    assert mock_supabase.table.call_count >= 2


@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_delete_outfit_not_found(mock_get_supabase):
    """Test deletion of non-existent outfit."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    mock_result = Mock()
    mock_result.data = []
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result
    
    with pytest.raises(ValueError, match="Outfit not found"):
        await outfit_service.delete_outfit("nonexistent-id", "user-123")


@pytest.mark.asyncio
@patch("app.services.outfit_service.get_supabase")
async def test_delete_outfit_wrong_owner(mock_get_supabase):
    """Test deletion fails when outfit belongs to another user."""
    mock_supabase = Mock()
    mock_get_supabase.return_value = mock_supabase
    
    outfit_id = "outfit-123"
    outfit_row = _make_db_outfit_row(outfit_id, user_id="other-user")
    
    mock_result = Mock()
    mock_result.data = [outfit_row]
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result
    
    with pytest.raises(ValueError, match="permission"):
        await outfit_service.delete_outfit(outfit_id, "user-123")