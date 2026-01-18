"""
Integration tests for recommendations router.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.schemas import (
    CategoryRecommendation,
    RecommendedColor,
    FormalityRange,
)
from app.routers.recommendations import router


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def app() -> FastAPI:
    """Create test FastAPI app."""
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """Create test client."""
    return TestClient(app)


def _make_request_body(
    formality: float = 3.0,
    category_l1: str = "Tops",
    category_l2: str = "T-Shirts",
) -> dict:
    """Create request body dict."""
    return {
        "base_color": {
            "hex": "#0B1C2D",
            "hsl": {"h": 210, "s": 61, "l": 11},
            "name": "navy",
            "is_neutral": True,
        },
        "base_formality": formality,
        "base_aesthetics": ["Minimalist"],
        "base_category": {"l1": category_l1, "l2": category_l2},
    }


def _make_category_recommendation(category_l1: str = "Bottoms") -> CategoryRecommendation:
    """Create a CategoryRecommendation."""
    return CategoryRecommendation(
        category_l1=category_l1,
        colors=[RecommendedColor(hex="#000000", name="black", harmony_type="neutral")],
        formality_range=FormalityRange(min=2.0, max=4.0),
        aesthetics=["Minimalist"],
        suggested_l2=["Jeans"],
        example="Jeans in black",
    )


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

def test_post_recommendations_returns_200(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/recommendations returns 200 with valid request."""

    def fake_generate(base_item, filled_categories):
        return [
            _make_category_recommendation("Bottoms"),
            _make_category_recommendation("Shoes"),
        ]

    monkeypatch.setattr(
        "app.routers.recommendations.generate_category_recommendations",
        fake_generate,
    )

    response = client.post("/api/recommendations", json=_make_request_body())

    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) == 2
    assert data["recommendations"][0]["category_l1"] == "Bottoms"


def test_post_recommendations_empty_result(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/recommendations returns empty list when appropriate."""

    def fake_generate(base_item, filled_categories):
        return []

    monkeypatch.setattr(
        "app.routers.recommendations.generate_category_recommendations",
        fake_generate,
    )

    response = client.post("/api/recommendations", json=_make_request_body())

    assert response.status_code == 200
    data = response.json()
    assert data["recommendations"] == []


def test_post_recommendations_invalid_formality_returns_422(client: TestClient) -> None:
    """POST /api/recommendations returns 422 for invalid formality."""
    body = _make_request_body(formality=10.0)  # Out of range

    response = client.post("/api/recommendations", json=body)

    assert response.status_code == 422  # Pydantic validation error


def test_post_recommendations_invalid_color_hex_returns_422(client: TestClient) -> None:
    """POST /api/recommendations returns 422 for invalid color hex."""
    body = _make_request_body()
    body["base_color"]["hex"] = "invalid"

    response = client.post("/api/recommendations", json=body)

    assert response.status_code == 422


def test_post_recommendations_missing_required_field_returns_422(client: TestClient) -> None:
    """POST /api/recommendations returns 422 for missing required field."""
    body = _make_request_body()
    del body["base_category"]

    response = client.post("/api/recommendations", json=body)

    assert response.status_code == 422


def test_post_recommendations_value_error_returns_400(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/recommendations returns 400 for ValueError."""

    def fake_generate(base_item, filled_categories):
        raise ValueError("Invalid input")

    monkeypatch.setattr(
        "app.routers.recommendations.generate_category_recommendations",
        fake_generate,
    )

    response = client.post("/api/recommendations", json=_make_request_body())

    assert response.status_code == 400
    assert "Invalid input" in response.json()["detail"]


def test_post_recommendations_server_error_returns_500(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/recommendations returns 500 for unexpected errors."""

    def fake_generate(base_item, filled_categories):
        raise RuntimeError("Boom")

    monkeypatch.setattr(
        "app.routers.recommendations.generate_category_recommendations",
        fake_generate,
    )

    response = client.post("/api/recommendations", json=_make_request_body())

    assert response.status_code == 500
    # Should NOT expose internal error message
    assert "Boom" not in response.json()["detail"]
    assert "Failed to generate recommendations" in response.json()["detail"]


def test_post_recommendations_response_structure(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/recommendations returns properly structured response."""

    def fake_generate(base_item, filled_categories):
        return [_make_category_recommendation("Bottoms")]

    monkeypatch.setattr(
        "app.routers.recommendations.generate_category_recommendations",
        fake_generate,
    )

    response = client.post("/api/recommendations", json=_make_request_body())

    assert response.status_code == 200
    data = response.json()

    rec = data["recommendations"][0]
    assert "category_l1" in rec
    assert "colors" in rec
    assert "formality_range" in rec
    assert "aesthetics" in rec
    assert "suggested_l2" in rec
    assert "example" in rec

    # Check nested structure
    assert "min" in rec["formality_range"]
    assert "max" in rec["formality_range"]
    assert len(rec["colors"]) > 0
    assert "hex" in rec["colors"][0]
    assert "name" in rec["colors"][0]
    assert "harmony_type" in rec["colors"][0]