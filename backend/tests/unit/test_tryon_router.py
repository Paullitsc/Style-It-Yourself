"""
Unit tests for tryon router - direct function calls.
"""
import pytest
from fastapi import HTTPException, status

from app.models.schemas import (
    User,
    TryOnResponse,
    TryOnSingleRequest,
    TryOnOutfitRequest,
    ClothingItemBase,
    Color,
    HSL,
    Category,
)
# Adjust import path if your file is in app/api/endpoints instead of app/routers
from app.routers import tryon as tryon_router


pytestmark = pytest.mark.asyncio


# HELPERS

def _make_user(user_id: str = "test-user-123") -> User:
    """Create a test user."""
    return User(id=user_id, email="test@example.com", name="Test User")


def _make_clothing_item() -> ClothingItemBase:
    """Create a minimal ClothingItemBase."""
    return ClothingItemBase(
        color=Color(
            hex="#000000",
            hsl=HSL(h=0, s=0, l=0),
            name="Black",
            is_neutral=True
        ),
        category=Category(l1="Tops", l2="T-Shirt"),
        formality=1.0,
        aesthetics=["Casual"]
    )


# try_on_single

async def test_try_on_single_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Successfully generates and saves a single item try-on."""
    user = _make_user()
    item = _make_clothing_item()
    
    request = TryOnSingleRequest(
        user_photo_url="http://example.com/user.jpg",
        item_image_url="http://example.com/shirt.jpg",
        item=item
    )

    # 1. Mock validate_image_url to do nothing (pass)
    async def fake_validate(url: str):
        return None
    
    # 2. Mock Gemini service response
    async def fake_generate_single(user_image_url, item_image_url, item, high_quality):
        assert user_image_url == request.user_photo_url
        assert item_image_url == request.item_image_url
        return TryOnResponse(
            success=True,
            generated_image_url="data:image/png;base64,fake_data",
            processing_time=1.23
        )

    # 3. Mock saving image
    async def fake_save_image(user_id, data_url):
        assert user_id == user.id
        return "https://storage.example.com/result.png"

    # Apply patches
    monkeypatch.setattr(tryon_router, "validate_image_url", fake_validate)
    monkeypatch.setattr(tryon_router, "generate_tryon_single", fake_generate_single)
    monkeypatch.setattr(tryon_router, "_save_generated_image", fake_save_image)

    # Execute
    response = await tryon_router.try_on_single(request, user)

    # Assert
    assert response.success is True
    assert response.generated_image_url == "https://storage.example.com/result.png"
    assert response.processing_time == 1.23


async def test_try_on_single_gemini_failure_maps_to_502(
    monkeypatch: pytest.MonkeyPatch
) -> None:
    """Service failure (success=False) raises 502."""
    user = _make_user()
    request = TryOnSingleRequest(
        user_photo_url="http://example.com/user.jpg",
        item_image_url="http://example.com/shirt.jpg",
        item=_make_clothing_item()
    )

    async def fake_validate(url: str): return None

    async def fake_generate_single(*args, **kwargs):
        # Service returns failure
        return TryOnResponse(success=False, error="NSFW content detected")

    monkeypatch.setattr(tryon_router, "validate_image_url", fake_validate)
    monkeypatch.setattr(tryon_router, "generate_tryon_single", fake_generate_single)

    with pytest.raises(HTTPException) as excinfo:
        await tryon_router.try_on_single(request, user)

    assert excinfo.value.status_code == status.HTTP_502_BAD_GATEWAY
    assert "NSFW content detected" in excinfo.value.detail


async def test_try_on_single_validation_error_maps_to_400(
    monkeypatch: pytest.MonkeyPatch
) -> None:
    """ValueError during processing maps to 400."""
    user = _make_user()
    request = TryOnSingleRequest(
        user_photo_url="http://example.com/user.jpg",
        item_image_url="http://example.com/shirt.jpg",
        item=_make_clothing_item()
    )

    # Mock validation to raise HTTPException (simulating unreachable URL)
    async def fake_validate(url: str):
        raise HTTPException(status_code=400, detail="Image URL not accessible")

    monkeypatch.setattr(tryon_router, "validate_image_url", fake_validate)

    with pytest.raises(HTTPException) as excinfo:
        await tryon_router.try_on_single(request, user)

    assert excinfo.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Image URL not accessible" in excinfo.value.detail


# try_on_outfit

async def test_try_on_outfit_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Successfully generates and saves an outfit try-on."""
    user = _make_user()
    item_base = _make_clothing_item()
    
    # Request with list of tuples [(url, item), ...]
    # Note: Pydantic handles the parsing, but here we pass the model structure
    request = TryOnOutfitRequest(
        user_photo_url="http://example.com/user.jpg",
        item_images=[
            ("http://example.com/top.jpg", item_base),
            ("http://example.com/pants.jpg", item_base)
        ]
    )

    async def fake_validate(url: str): return None

    async def fake_generate_outfit(user_image_url, item_images, high_quality):
        assert len(item_images) == 2
        return TryOnResponse(
            success=True,
            generated_image_url="data:image/png;base64,fake_outfit",
            processing_time=2.5
        )

    async def fake_save_image(user_id, data_url):
        return "https://storage.example.com/outfit_result.png"

    monkeypatch.setattr(tryon_router, "validate_image_url", fake_validate)
    monkeypatch.setattr(tryon_router, "generate_tryon_outfit", fake_generate_outfit)
    monkeypatch.setattr(tryon_router, "_save_generated_image", fake_save_image)

    response = await tryon_router.try_on_outfit(request, user)

    assert response.success is True
    assert response.generated_image_url == "https://storage.example.com/outfit_result.png"


async def test_try_on_outfit_partial_url_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail if one of the item URLs is invalid."""
    user = _make_user()
    item_base = _make_clothing_item()
    
    request = TryOnOutfitRequest(
        user_photo_url="http://example.com/user.jpg",
        item_images=[
            ("http://example.com/valid.jpg", item_base),
            ("http://example.com/invalid.jpg", item_base) 
        ]
    )

    async def fake_validate(url: str):
        if "invalid" in url:
            raise HTTPException(status_code=400, detail="Invalid URL")
        return None

    monkeypatch.setattr(tryon_router, "validate_image_url", fake_validate)

    with pytest.raises(HTTPException) as excinfo:
        await tryon_router.try_on_outfit(request, user)

    assert excinfo.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid URL" in excinfo.value.detail



# Internal helper: _save_generated_image

async def test_save_generated_image_handles_base64(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test the private helper _save_generated_image logic via direct call if possible, 
    or via a router call that triggers it."""
    
    # Since _save_generated_image is not an endpoint, we can test it 
    # if it's imported, or indirectly via the endpoint tests above.
    # However, Python allows importing/testing async internal functions too:
    
    async def fake_upload(user_id, image_data, outfit_id):
        assert user_id == "user-123"
        assert len(image_data) > 0 
        return "https://supa.link/image.png"

    monkeypatch.setattr(tryon_router, "upload_generated_image", fake_upload)

    # Valid base64 png header
    data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg=="
    
    result = await tryon_router._save_generated_image("user-123", data_url)
    assert result == "https://supa.link/image.png"


async def test_save_generated_image_skips_non_data_url(monkeypatch: pytest.MonkeyPatch) -> None:
    """If a regular URL is passed (not base64), it returns it as is."""
    url = "https://already-hosted.com/image.jpg"
    result = await tryon_router._save_generated_image("user-123", url)
    assert result == url