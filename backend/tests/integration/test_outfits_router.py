"""
Integration tests for outfits router - HTTP endpoint testing.


ROUGH DRAFT - NEEDS WORK

"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
from app.main import app
from app.models.schemas import User


# Test Client Setup

client = TestClient(app)


# Helper Functions

def _make_test_user(user_id: str = "test-user-123") -> User:
    """Create a test user."""
    return User(
        id=user_id,
        email="test@example.com",
        name="Test User",
        created_at="2024-01-01T00:00:00Z"
    )


def _get_auth_headers(token: str = "test-token") -> dict:
    """Get authorization headers for testing."""
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=False)
def mock_auth_user():
    """Fixture to mock authentication."""
    from app.middleware.auth import get_current_user
    test_user = _make_test_user()
    
    async def mock_get_current_user():
        return test_user
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield test_user
    app.dependency_overrides.clear()


# Create Outfit Tests

@patch("app.services.supabase.create_outfit")
@pytest.mark.asyncio
async def test_create_outfit_success(mock_create_outfit, mock_auth_user):
    """Test successful outfit creation via API."""
    # Mock service response
    from app.models.schemas import OutfitResponse, ClothingItemResponse, Color, HSL, Category
    mock_response = OutfitResponse(
        id="outfit-123",
        user_id=mock_auth_user.id,
        name="Test Outfit",
        items=[
            ClothingItemResponse(
                id="item-1",
                user_id=mock_auth_user.id,
                image_url="https://example.com/image.jpg",
                color=Color(hex="#123456", hsl=HSL(h=0, s=50, l=50), name="navy", is_neutral=False),
                category=Category(l1="Tops", l2="T-Shirts"),
                formality=3.0,
                aesthetics=["Minimalist"],
                brand="Test Brand",
                price=50.0,
                ownership="owned",
                created_at="2024-01-01T00:00:00Z"
            )
        ],
        created_at="2024-01-01T00:00:00Z"
    )
    mock_create_outfit.return_value = mock_response
    
    request_data = {
        "name": "Test Outfit",
        "item_ids": ["item-1"]
    }
    
    response = client.post(
        "/api/outfits",
        json=request_data,
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == "outfit-123"
    assert data["name"] == "Test Outfit"
    assert len(data["items"]) == 1


def test_create_outfit_unauthorized():
    """Test outfit creation without authentication."""
    # Don't use the mock_auth_user fixture to test unauthorized access
    
    request_data = {
        "name": "Test Outfit",
        "item_ids": []
    }
    
    # Endpoint should return 401
    response = client.post(
        "/api/outfits",
        json=request_data
    )
    
    # Without auth header, should get 403 or 401
    assert response.status_code in [401, 403]


@patch("app.services.supabase.create_outfit")
def test_create_outfit_service_error(mock_create_outfit, mock_auth_user):
    """Test outfit creation when service raises error."""
    mock_create_outfit.side_effect = Exception("Database error")
    
    request_data = {
        "name": "Test Outfit",
        "item_ids": []
    }
    
    response = client.post(
        "/api/outfits",
        json=request_data,
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 500
    assert "Failed to create outfit" in response.json()["detail"]


# Get Outfits Tests

@patch("app.services.supabase.get_user_outfits")
def test_get_outfits_success(mock_get_outfits, mock_auth_user):
    """Test successful retrieval of all outfits."""
    
    from app.models.schemas import OutfitSummary
    mock_response = [
        OutfitSummary(
            id="outfit-1",
            name="Outfit 1",
            item_count=2,
            thumbnail_url=None,
            created_at="2024-01-01T00:00:00Z"
        ),
        OutfitSummary(
            id="outfit-2",
            name="Outfit 2",
            item_count=3,
            thumbnail_url=None,
            created_at="2024-01-02T00:00:00Z"
        )
    ]
    mock_get_outfits.return_value = mock_response
    
    response = client.get(
        "/api/outfits",
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == "outfit-1"
    assert data[1]["id"] == "outfit-2"


@patch("app.services.supabase.get_user_outfits")
def test_get_outfits_empty(mock_get_outfits, mock_auth_user):
    """Test retrieval when user has no outfits."""
    mock_get_outfits.return_value = []
    
    response = client.get(
        "/api/outfits",
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 200
    assert response.json() == []


# Get Single Outfit Tests

@patch("app.services.supabase.get_outfit")
def test_get_outfit_success(mock_get_outfit, mock_auth_user):
    """Test successful retrieval of single outfit."""
    
    from app.models.schemas import OutfitResponse
    mock_response = OutfitResponse(
        id="outfit-123",
        user_id=mock_auth_user.id,
        name="Test Outfit",
        items=[],
        created_at="2024-01-01T00:00:00Z"
    )
    mock_get_outfit.return_value = mock_response
    
    response = client.get(
        "/api/outfits/outfit-123",
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "outfit-123"
    assert data["name"] == "Test Outfit"


@patch("app.services.supabase.get_outfit")
def test_get_outfit_not_found(mock_get_outfit, mock_auth_user):
    """Test retrieval of non-existent outfit."""
    mock_get_outfit.return_value = None
    
    response = client.get(
        "/api/outfits/nonexistent-id",
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@patch("app.services.supabase.get_outfit")
def test_get_outfit_permission_denied(mock_get_outfit, mock_auth_user):
    """Test retrieval of outfit belonging to another user."""
    mock_get_outfit.side_effect = ValueError("You do not have permission to delete this outfit")
    
    response = client.get(
        "/api/outfits/other-user-outfit",
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 403
    assert "permission" in response.json()["detail"].lower()


# Delete Outfit Tests

@patch("app.services.supabase.delete_outfit")
def test_delete_outfit_success(mock_delete_outfit, mock_auth_user):
    """Test successful outfit deletion."""
    mock_delete_outfit.return_value = True
    
    response = client.delete(
        "/api/outfits/outfit-123",
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 204
    assert response.content == b""  # No content


@patch("app.services.supabase.delete_outfit")
def test_delete_outfit_not_found(mock_delete_outfit, mock_auth_user):
    """Test deletion of non-existent outfit."""
    mock_delete_outfit.return_value = False
    
    response = client.delete(
        "/api/outfits/nonexistent-id",
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@patch("app.services.supabase.delete_outfit")
def test_delete_outfit_permission_denied(mock_delete_outfit, mock_auth_user):
    """Test deletion of outfit belonging to another user."""
    mock_delete_outfit.side_effect = ValueError("You do not have permission to delete this outfit")
    
    response = client.delete(
        "/api/outfits/other-user-outfit",
        headers=_get_auth_headers()
    )
    
    assert response.status_code == 403
    assert "permission" in response.json()["detail"].lower()

