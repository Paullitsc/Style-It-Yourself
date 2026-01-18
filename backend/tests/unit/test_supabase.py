"""Unit tests for Supabase CRUD operations."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.supabase import (
    create_clothing_item,
    get_clothing_item,
    get_clothing_items_by_ids,
    get_user_clothing_items,
    update_clothing_item,
    delete_clothing_item,
    create_outfit,
    get_outfit,
    get_user_outfits,
    update_outfit,
    add_items_to_outfit,
    remove_item_from_outfit,
    delete_outfit,
    get_closet,
    upload_image,
    upload_generated_image,
    delete_image,
    get_user_profile,
    update_user_profile,
    _row_to_clothing_item,
)
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


# FIXTURES

@pytest.fixture
def mock_supabase():
    """
    Create a mock Supabase client that handles the chaining correctly.
    
    The structure is:
    1. get_supabase_client() -> AsyncMock (returns client_instance)
    2. client_instance -> MagicMock (synchronous methods like table(), select())
    3. final methods (execute(), upload()) -> AsyncMock (awaitable)
    """
    client_inst = MagicMock()
    
    # Configure common chainable methods to return the mock itself
    # This allows client.table().select().eq().execute() to work
    client_inst.table.return_value = client_inst
    client_inst.select.return_value = client_inst
    client_inst.insert.return_value = client_inst
    client_inst.update.return_value = client_inst
    client_inst.delete.return_value = client_inst
    client_inst.eq.return_value = client_inst
    client_inst.in_.return_value = client_inst
    client_inst.order.return_value = client_inst
    client_inst.range.return_value = client_inst
    client_inst.limit.return_value = client_inst
    
    # Configure execution methods to be async
    client_inst.execute = AsyncMock()
    
    # Configure Storage
    # storage.from_("bucket") -> returns storage_file_api mock
    storage_mock = MagicMock()
    client_inst.storage.from_.return_value = storage_mock
    
    # Storage methods that are async
    storage_mock.upload = AsyncMock()
    storage_mock.remove = AsyncMock()
    
    # Storage methods that are sync (in supabase-py get_public_url is sync)
    storage_mock.get_public_url = MagicMock()

    return client_inst


@pytest.fixture
def sample_user_id():
    return "user-123-abc"


@pytest.fixture
def sample_item_id():
    return "item-456-def"


@pytest.fixture
def sample_outfit_id():
    return "outfit-789-ghi"


@pytest.fixture
def sample_color():
    return Color(
        hex="#1E3A5F",
        hsl=HSL(h=210, s=50, l=25),
        name="navy",
        is_neutral=True,
    )


@pytest.fixture
def sample_category():
    return Category(l1="Tops", l2="T-Shirts")


@pytest.fixture
def sample_clothing_item_create(sample_color, sample_category):
    return ClothingItemCreate(
        color=sample_color,
        category=sample_category,
        formality=2.5,
        aesthetics=["casual", "minimalist"],
        brand="TestBrand",
        price=29.99,
        source_url="https://example.com/item",
        ownership="owned",
    )


@pytest.fixture
def sample_db_row(sample_user_id, sample_item_id):
    """Sample database row as returned by Supabase."""
    return {
        "id": sample_item_id,
        "user_id": sample_user_id,
        "image_url": "https://storage.example.com/image.jpg",
        "color_hex": "#1E3A5F",
        "color_hsl": {"h": 210, "s": 50, "l": 25},
        "color_name": "navy",
        "is_neutral": True,
        "category_l1": "Tops",
        "category_l2": "T-Shirts",
        "formality": 2.5,
        "aesthetics": ["casual", "minimalist"],
        "brand": "TestBrand",
        "price": 29.99,
        "source_url": "https://example.com/item",
        "ownership": "owned",
        "created_at": "2024-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_outfit_row(sample_user_id, sample_outfit_id):
    """Sample outfit database row."""
    return {
        "id": sample_outfit_id,
        "user_id": sample_user_id,
        "name": "Casual Friday",
        "generated_image_url": "https://storage.example.com/outfit.jpg",
        "created_at": "2024-01-01T00:00:00Z",
    }


# HELPER FUNCTION TESTS

class TestRowToClothingItem:
    """Tests for _row_to_clothing_item helper."""
    
    def test_converts_db_row_to_response(self, sample_db_row):
        """Test successful conversion of DB row to ClothingItemResponse."""
        result = _row_to_clothing_item(sample_db_row)
        
        assert isinstance(result, ClothingItemResponse)
        assert result.id == sample_db_row["id"]
        assert result.color.hex == sample_db_row["color_hex"]
    
    def test_handles_missing_optional_fields(self, sample_db_row):
        """Test conversion with missing optional fields."""
        # Set fields to None explicitly to test handling
        sample_db_row["brand"] = None
        sample_db_row["price"] = None
        sample_db_row["aesthetics"] = None
        
        result = _row_to_clothing_item(sample_db_row)
        
        assert result.brand is None
        assert result.price is None
        assert result.aesthetics == []  # Should now return empty list instead of failing
    
    def test_handles_is_neutral_default(self, sample_db_row):
        """Test is_neutral defaults to False when not present."""
        del sample_db_row["is_neutral"]
        result = _row_to_clothing_item(sample_db_row)
        assert result.color.is_neutral is False


# CLOTHING ITEM CRUD TESTS

class TestCreateClothingItem:
    
    @pytest.mark.asyncio
    async def test_create_success(self, mock_supabase, sample_user_id, sample_clothing_item_create, sample_db_row):
        mock_supabase.execute.return_value = MagicMock(data=[sample_db_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            
            result = await create_clothing_item(
                user_id=sample_user_id,
                item=sample_clothing_item_create,
                image_url="https://storage.example.com/image.jpg",
            )
        
        assert result.id == sample_db_row["id"]
        mock_supabase.table.assert_called_with("clothing_items")
    
    @pytest.mark.asyncio
    async def test_create_failure_no_data(self, mock_supabase, sample_user_id, sample_clothing_item_create):
        mock_supabase.execute.return_value = MagicMock(data=[])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            
            with pytest.raises(ValueError, match="Failed to create clothing item"):
                await create_clothing_item(
                    user_id=sample_user_id,
                    item=sample_clothing_item_create,
                    image_url="url",
                )


class TestGetClothingItem:
    
    @pytest.mark.asyncio
    async def test_get_existing_item(self, mock_supabase, sample_user_id, sample_item_id, sample_db_row):
        mock_supabase.execute.return_value = MagicMock(data=[sample_db_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_clothing_item(sample_item_id, sample_user_id)
        
        assert result is not None
        assert result.id == sample_item_id
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_item(self, mock_supabase, sample_user_id, sample_item_id):
        mock_supabase.execute.return_value = MagicMock(data=[])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_clothing_item(sample_item_id, sample_user_id)
        
        assert result is None


class TestGetClothingItemsByIds:
    
    @pytest.mark.asyncio
    async def test_get_multiple_items(self, mock_supabase, sample_user_id, sample_db_row):
        mock_supabase.execute.return_value = MagicMock(data=[sample_db_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_clothing_items_by_ids(["id1"], sample_user_id)
        
        assert len(result) == 1


class TestGetUserClothingItems:
    
    @pytest.mark.asyncio
    async def test_get_all_items(self, mock_supabase, sample_user_id, sample_db_row):
        mock_supabase.execute.return_value = MagicMock(data=[sample_db_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_user_clothing_items(sample_user_id)
        
        assert len(result) == 1
    
    @pytest.mark.asyncio
    async def test_get_items_with_category_filter(self, mock_supabase, sample_user_id, sample_db_row):
        mock_supabase.execute.return_value = MagicMock(data=[sample_db_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            await get_user_clothing_items(sample_user_id, category_l1="Tops")
            
        mock_supabase.eq.assert_any_call("category_l1", "Tops")
    
    @pytest.mark.asyncio
    async def test_get_items_with_ownership_filter(self, mock_supabase, sample_user_id, sample_db_row):
        mock_supabase.execute.return_value = MagicMock(data=[sample_db_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            await get_user_clothing_items(sample_user_id, ownership="owned")
            
        mock_supabase.eq.assert_any_call("ownership", "owned")


class TestUpdateClothingItem:
    
    @pytest.mark.asyncio
    async def test_update_success(self, mock_supabase, sample_user_id, sample_item_id, sample_db_row):
        mock_supabase.execute.return_value = MagicMock(data=[sample_db_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await update_clothing_item(sample_item_id, sample_user_id, {"brand": "New"})
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_update_nonexistent_item(self, mock_supabase, sample_user_id, sample_item_id):
        mock_supabase.execute.return_value = MagicMock(data=[])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await update_clothing_item(sample_item_id, sample_user_id, {})
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_update_with_color_object(self, mock_supabase, sample_user_id, sample_item_id, sample_db_row, sample_color):
        mock_supabase.execute.return_value = MagicMock(data=[sample_db_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            await update_clothing_item(sample_item_id, sample_user_id, {"color": sample_color})
            
        mock_supabase.update.assert_called()


class TestDeleteClothingItem:
    
    @pytest.mark.asyncio
    async def test_delete_success(self, mock_supabase, sample_user_id, sample_item_id, sample_db_row):
        # We need to sequence the execute returns:
        # 1. get_clothing_item -> returns item data
        # 2. delete -> returns item data
        mock_supabase.execute.side_effect = [
            MagicMock(data=[sample_db_row]), # get item
            MagicMock(data=[sample_db_row]), # delete item
        ]
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            # We also need to patch delete_image so it doesn't fail
            with patch("app.services.supabase.delete_image", new_callable=AsyncMock) as mock_del_img:
                mock_del_img.return_value = True
                
                result = await delete_clothing_item(sample_item_id, sample_user_id)
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_item(self, mock_supabase, sample_user_id, sample_item_id):
        #  Provide TWO return values.
        # 1. First for get_clothing_item (returns empty -> None)
        # 2. Second for the actual delete attempt (returns empty)
        mock_supabase.execute.side_effect = [
            MagicMock(data=[]), 
            MagicMock(data=[])
        ]
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await delete_clothing_item(sample_item_id, sample_user_id)
        
        assert result is False


# OUTFIT CRUD TESTS

class TestCreateOutfit:
    
    @pytest.mark.asyncio
    async def test_create_outfit_success(self, mock_supabase, sample_user_id, sample_outfit_row, sample_db_row):
        # 1. insert outfit -> returns data
        # 2. insert outfit_items -> returns (ignored)
        # 3. get_outfit -> returns data
        # 4. get outfit items -> returns items
        mock_supabase.execute.side_effect = [
            MagicMock(data=[sample_outfit_row]),
            MagicMock(data=[]), 
            MagicMock(data=[sample_outfit_row]),
            MagicMock(data=[{"clothing_items": sample_db_row}])
        ]
        
        outfit_create = OutfitCreate(name="Casual", item_ids=[sample_db_row["id"]])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await create_outfit(sample_user_id, outfit_create)
        
        assert result.name == "Casual Friday"


class TestGetOutfit:
    
    @pytest.mark.asyncio
    async def test_get_existing_outfit(self, mock_supabase, sample_user_id, sample_outfit_id, sample_outfit_row, sample_db_row):
        mock_supabase.execute.side_effect = [
            MagicMock(data=[sample_outfit_row]),
            MagicMock(data=[{"clothing_items": sample_db_row}])
        ]
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_outfit(sample_outfit_id, sample_user_id)
            
        assert result is not None
        assert result.id == sample_outfit_id
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_outfit(self, mock_supabase, sample_user_id, sample_outfit_id):
        mock_supabase.execute.return_value = MagicMock(data=[])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_outfit(sample_outfit_id, sample_user_id)
            
        assert result is None


class TestGetUserOutfits:
    
    @pytest.mark.asyncio
    async def test_get_user_outfits_success(self, mock_supabase, sample_user_id, sample_outfit_row):
        mock_supabase.execute.return_value = MagicMock(data=[sample_outfit_row])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_user_outfits(sample_user_id)
            
        assert len(result) == 1


class TestUpdateOutfit:
    
    @pytest.mark.asyncio
    async def test_update_outfit_name(self, mock_supabase, sample_user_id, sample_outfit_id, sample_outfit_row, sample_db_row):
        mock_supabase.execute.side_effect = [
            MagicMock(data=[sample_outfit_row]), # update
            MagicMock(data=[sample_outfit_row]), # get outfit
            MagicMock(data=[{"clothing_items": sample_db_row}]) # get items
        ]
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await update_outfit(sample_outfit_id, sample_user_id, {"name": "New"})
            
        assert result is not None


class TestDeleteOutfit:
    
    @pytest.mark.asyncio
    async def test_delete_outfit_success(self, mock_supabase, sample_user_id, sample_outfit_id, sample_outfit_row):
        mock_supabase.execute.side_effect = [
            MagicMock(data=[sample_outfit_row]), # select (check img)
            MagicMock(data=[sample_outfit_row]), # delete
        ]
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            with patch("app.services.supabase.delete_image", new_callable=AsyncMock) as mock_del_img:
                mock_del_img.return_value = True
                result = await delete_outfit(sample_outfit_id, sample_user_id)
        
        assert result is True



# STORAGE TESTS
class TestUploadImage:
    
    @pytest.mark.asyncio
    async def test_upload_image_success(self, mock_supabase, sample_user_id):
        # Setup storage mocks on the instance
        mock_storage = mock_supabase.storage.from_.return_value
        mock_storage.get_public_url.return_value = "https://url.com/img.jpg"
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            
            result = await upload_image(sample_user_id, b"data", "test.jpg")
            
        assert result == "https://url.com/img.jpg"
        mock_storage.upload.assert_called()
    
    @pytest.mark.asyncio
    async def test_upload_image_sanitizes_filename(self, mock_supabase, sample_user_id):
        mock_storage = mock_supabase.storage.from_.return_value
        mock_storage.get_public_url.return_value = "https://url.com/img.jpg"
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            # Input contains directory traversal attempt
            await upload_image(sample_user_id, b"data", "../../hack.jpg")
            
        # Verify upload was called
        args, _ = mock_storage.upload.call_args
        uploaded_path = args[0]
        
        # Check that the directory traversal slashes were removed
        assert ".." not in uploaded_path.replace("...", "") # Optional: just ensure slashes are gone
        assert "/" not in uploaded_path.split("_", 1)[1] # Ensure no slashes in the filename part
        assert "hack.jpg" in uploaded_path

class TestDeleteImage:
    
    @pytest.mark.asyncio
    async def test_delete_image_success(self, mock_supabase):
        # mock_supabase.storage.from_().remove is already an AsyncMock from fixture
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await delete_image("https://url/bucket/path.jpg", "bucket")
            
        assert result is True
        mock_supabase.storage.from_.return_value.remove.assert_called()


class TestGetUserProfile:
    
    @pytest.mark.asyncio
    async def test_get_existing_profile(self, mock_supabase, sample_user_id):
        mock_supabase.execute.return_value = MagicMock(data=[{"id": sample_user_id, "email": "a@b.com"}])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_user_profile(sample_user_id)
            
        assert result["email"] == "a@b.com"
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_profile(self, mock_supabase, sample_user_id):
        mock_supabase.execute.return_value = MagicMock(data=[])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await get_user_profile(sample_user_id)
            
        assert result is None


class TestUpdateUserProfile:
    
    @pytest.mark.asyncio
    async def test_update_profile_success(self, mock_supabase, sample_user_id):
        mock_supabase.execute.return_value = MagicMock(data=[{"id": sample_user_id, "name": "New"}])
        
        with patch("app.services.supabase.get_supabase_client", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_supabase
            result = await update_user_profile(sample_user_id, {"name": "New"})
            
        assert result["name"] == "New"