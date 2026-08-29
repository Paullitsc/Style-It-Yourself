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


# =============================================================================
# HELPERS
# =============================================================================

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


# =============================================================================
# try_on_single
# =============================================================================

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
    async def fake_generate_single(user_image_url, item_image_url, item):
        assert user_image_url == request.user_photo_url
        assert item_image_url == request.item_image_url
        return TryOnResponse(
            success=True,
            generated_image_url="data:image/png;base64,fake_data",
            processing_time=1.23
        )

    # Apply patches
    monkeypatch.setattr(tryon_router, "validate_image_url", fake_validate)
    monkeypatch.setattr(tryon_router, "generate_tryon_single", fake_generate_single)

    # Execute
    response = await tryon_router.try_on_single(request, user)

    # Assert: the router returns the data URL directly. Upload to storage
    # happens later, in create_outfit, only when the user saves the outfit.
    assert response.success is True
    assert response.generated_image_url == "data:image/png;base64,fake_data"
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


# =============================================================================
# try_on_outfit
# =============================================================================

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

    async def fake_generate_outfit(user_image_url, item_images):
        assert len(item_images) == 2
        return TryOnResponse(
            success=True,
            generated_image_url="data:image/png;base64,fake_outfit",
            processing_time=2.5
        )

    monkeypatch.setattr(tryon_router, "validate_image_url", fake_validate)
    monkeypatch.setattr(tryon_router, "generate_tryon_outfit", fake_generate_outfit)

    response = await tryon_router.try_on_outfit(request, user)

    # The router returns the data URL directly; persistence happens on save.
    assert response.success is True
    assert response.generated_image_url == "data:image/png;base64,fake_outfit"


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


# =============================================================================
# Data-URL persistence now lives in services.supabase.upload_data_url_image
# and runs only when an outfit is saved (create_outfit), never in the router.
# =============================================================================

async def test_upload_data_url_image_decodes_base64(monkeypatch: pytest.MonkeyPatch) -> None:
    """A data: URL is decoded and uploaded to the generated-images bucket."""
    from app.services import supabase as supabase_service

    captured = {}

    async def fake_upload_image(user_id, image_bytes, file_name, bucket, content_type):
        captured.update(
            user_id=user_id, size=len(image_bytes), bucket=bucket, content_type=content_type
        )
        return "https://supa.link/image.png"

    monkeypatch.setattr(supabase_service, "upload_image", fake_upload_image)

    data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg=="
    result = await supabase_service.upload_data_url_image("user-123", data_url, "outfit-1")

    assert result == "https://supa.link/image.png"
    assert captured["user_id"] == "user-123"
    assert captured["size"] > 0
    assert captured["bucket"] == "generated-images"
    assert captured["content_type"] == "image/png"


async def test_upload_data_url_image_rejects_non_data_url() -> None:
    """A regular URL is a caller bug: the function refuses it loudly."""
    from app.services import supabase as supabase_service

    with pytest.raises(ValueError):
        await supabase_service.upload_data_url_image(
            "user-123", "https://already-hosted.com/image.jpg", "outfit-1"
        )
