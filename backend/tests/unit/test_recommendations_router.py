"""
Unit tests for recommendations router behavior.
"""
import pytest
from fastapi import HTTPException, status

from app.models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    CategoryRecommendation,
    RecommendedColor,
    FormalityRange,
    Color,
    HSL,
    Category,
)
from app.routers import recommendations as recommendations_router


pytestmark = pytest.mark.asyncio


# FIXTURES / HELPERS

def _make_color(name: str = "navy", hex_value: str = "#0B1C2D") -> Color:
    """Create a Color object."""
    is_neutral = name.lower() in [
        "black", "white", "gray", "grey", "navy", "beige", "cream", "tan", "khaki"
    ]
    return Color(
        hex=hex_value,
        hsl=HSL(h=210, s=61, l=11),
        name=name,
        is_neutral=is_neutral,
    )


def _make_request(
    color_name: str = "navy",
    formality: float = 3.0,
    aesthetics: list[str] | None = None,
    category_l1: str = "Tops",
    category_l2: str = "T-Shirts",
) -> RecommendationRequest:
    """Create a RecommendationRequest."""
    return RecommendationRequest(
        base_color=_make_color(color_name),
        base_formality=formality,
        base_aesthetics=aesthetics or ["Minimalist"],
        base_category=Category(l1=category_l1, l2=category_l2),
    )


def _make_category_recommendation(
    category_l1: str = "Bottoms",
) -> CategoryRecommendation:
    """Create a CategoryRecommendation."""
    return CategoryRecommendation(
        category_l1=category_l1,
        colors=[
            RecommendedColor(hex="#000000", name="black", harmony_type="neutral"),
            RecommendedColor(hex="#FFFFFF", name="white", harmony_type="neutral"),
        ],
        formality_range=FormalityRange(min=2.0, max=4.0),
        aesthetics=["Minimalist"],
        suggested_l2=["Jeans", "Chinos"],
        example="Jeans in black",
    )


# UNIT TESTS

async def test_get_recommendations_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Returns recommendations for valid request."""
    request = _make_request()
    expected_recommendations = [
        _make_category_recommendation("Bottoms"),
        _make_category_recommendation("Shoes"),
    ]

    def fake_generate_category_recommendations(base_item, filled_categories):
        assert base_item.category.l1 == "Tops"
        assert base_item.formality == 3.0
        return expected_recommendations

    monkeypatch.setattr(
        recommendations_router,
        "generate_category_recommendations",
        fake_generate_category_recommendations,
    )

    response = await recommendations_router.get_recommendations(request)

    assert isinstance(response, RecommendationResponse)
    assert len(response.recommendations) == 2
    assert response.recommendations[0].category_l1 == "Bottoms"
    assert response.recommendations[1].category_l1 == "Shoes"


async def test_get_recommendations_empty_result(monkeypatch: pytest.MonkeyPatch) -> None:
    """Returns empty recommendations when all categories filled."""
    request = _make_request()

    def fake_generate_category_recommendations(base_item, filled_categories):
        return []

    monkeypatch.setattr(
        recommendations_router,
        "generate_category_recommendations",
        fake_generate_category_recommendations,
    )

    response = await recommendations_router.get_recommendations(request)

    assert isinstance(response, RecommendationResponse)
    assert response.recommendations == []


async def test_get_recommendations_value_error_maps_to_400(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """ValueError maps to 400 response."""
    request = _make_request()

    def fake_generate_category_recommendations(base_item, filled_categories):
        raise ValueError("Invalid formality value")

    monkeypatch.setattr(
        recommendations_router,
        "generate_category_recommendations",
        fake_generate_category_recommendations,
    )

    with pytest.raises(HTTPException) as excinfo:
        await recommendations_router.get_recommendations(request)

    assert excinfo.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid formality value" in excinfo.value.detail


async def test_get_recommendations_unexpected_error_maps_to_500(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Unexpected errors map to 500 response."""
    request = _make_request()

    def fake_generate_category_recommendations(base_item, filled_categories):
        raise RuntimeError("Unexpected failure")

    monkeypatch.setattr(
        recommendations_router,
        "generate_category_recommendations",
        fake_generate_category_recommendations,
    )

    with pytest.raises(HTTPException) as excinfo:
        await recommendations_router.get_recommendations(request)

    assert excinfo.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "Failed to generate recommendations" in excinfo.value.detail


async def test_get_recommendations_preserves_aesthetics(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Aesthetics are passed through to service."""
    request = _make_request(aesthetics=["Streetwear", "Edgy"])
    captured_base_item = None

    def fake_generate_category_recommendations(base_item, filled_categories):
        nonlocal captured_base_item
        captured_base_item = base_item
        return []

    monkeypatch.setattr(
        recommendations_router,
        "generate_category_recommendations",
        fake_generate_category_recommendations,
    )

    await recommendations_router.get_recommendations(request)

    assert captured_base_item is not None
    assert captured_base_item.aesthetics == ["Streetwear", "Edgy"]


async def test_get_recommendations_float_formality(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Float formality values are handled correctly."""
    request = _make_request(formality=2.5)
    captured_base_item = None

    def fake_generate_category_recommendations(base_item, filled_categories):
        nonlocal captured_base_item
        captured_base_item = base_item
        return [_make_category_recommendation()]

    monkeypatch.setattr(
        recommendations_router,
        "generate_category_recommendations",
        fake_generate_category_recommendations,
    )

    response = await recommendations_router.get_recommendations(request)

    assert captured_base_item.formality == 2.5
    assert isinstance(response, RecommendationResponse)


async def test_get_recommendations_fullbody_base(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Full Body base item generates appropriate recommendations."""
    request = _make_request(category_l1="Full Body", category_l2="Dresses")
    captured_base_item = None

    def fake_generate_category_recommendations(base_item, filled_categories):
        nonlocal captured_base_item
        captured_base_item = base_item
        return [
            _make_category_recommendation("Shoes"),
            _make_category_recommendation("Accessories"),
        ]

    monkeypatch.setattr(
        recommendations_router,
        "generate_category_recommendations",
        fake_generate_category_recommendations,
    )

    response = await recommendations_router.get_recommendations(request)

    assert captured_base_item.category.l1 == "Full Body"
    assert len(response.recommendations) == 2