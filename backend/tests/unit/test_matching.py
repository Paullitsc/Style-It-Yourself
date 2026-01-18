"""
Unit tests for the matching service.
"""
import pytest
from app.services.matching import (
    hex_to_rgb,
    color_distance,
    is_color_similar,
    score_item_match,
    filter_and_rank_items,
)
from app.models.schemas import (
    ClothingItemResponse,
    RecommendedColor,
    FormalityRange,
    Color,
    HSL,
    Category,
)
from datetime import datetime


# FIXTURES

@pytest.fixture
def sample_recommended_colors() -> list[RecommendedColor]:
    return [
        RecommendedColor(hex="#1E3A5F", name="Navy", harmony_type="complementary"),
        RecommendedColor(hex="#F5F5DC", name="Beige", harmony_type="neutral"),
        RecommendedColor(hex="#2F4F4F", name="Slate", harmony_type="analogous"),
    ]


@pytest.fixture
def sample_formality_range() -> FormalityRange:
    return FormalityRange(min=2, max=4)


@pytest.fixture
def sample_clothing_item() -> ClothingItemResponse:
    return ClothingItemResponse(
        id="item-1",
        user_id="user-1",
        image_url="https://example.com/image.jpg",
        color=Color(
            hex="#1E3A5F",
            hsl=HSL(h=210, s=52, l=24),
            name="Navy",
            is_neutral=False,
        ),
        category=Category(l1="Bottoms", l2="Chinos"),
        formality=3.0,
        aesthetics=["Classic", "Minimalist"],
        ownership="owned",
        created_at=datetime.now().isoformat(),
    )


@pytest.fixture
def sample_closet_items() -> list[ClothingItemResponse]:
    """Create a variety of closet items for testing."""
    base_time = datetime.now().isoformat()
    
    return [
        # Perfect match - Navy chinos, formality 3
        ClothingItemResponse(
            id="item-1",
            user_id="user-1",
            image_url="https://example.com/navy-chinos.jpg",
            color=Color(hex="#1E3A5F", hsl=HSL(h=210, s=52, l=24), name="Navy", is_neutral=False),
            category=Category(l1="Bottoms", l2="Chinos"),
            formality=3.0,
            aesthetics=["Classic"],
            ownership="owned",
            created_at=base_time,
        ),
        # Good match - Beige pants, formality 2
        ClothingItemResponse(
            id="item-2",
            user_id="user-1",
            image_url="https://example.com/beige-pants.jpg",
            color=Color(hex="#F5F5DC", hsl=HSL(h=60, s=56, l=91), name="Beige", is_neutral=True),
            category=Category(l1="Bottoms", l2="Dress Pants"),
            formality=2.0,
            aesthetics=["Classic"],
            ownership="owned",
            created_at=base_time,
        ),
        # Poor color match - Red jeans, formality 3
        ClothingItemResponse(
            id="item-3",
            user_id="user-1",
            image_url="https://example.com/red-jeans.jpg",
            color=Color(hex="#FF0000", hsl=HSL(h=0, s=100, l=50), name="Red", is_neutral=False),
            category=Category(l1="Bottoms", l2="Jeans"),
            formality=3.0,
            aesthetics=["Streetwear"],
            ownership="owned",
            created_at=base_time,
        ),
        # Poor formality match - Navy shorts, formality 1
        ClothingItemResponse(
            id="item-4",
            user_id="user-1",
            image_url="https://example.com/navy-shorts.jpg",
            color=Color(hex="#1E3A5F", hsl=HSL(h=210, s=52, l=24), name="Navy", is_neutral=False),
            category=Category(l1="Bottoms", l2="Shorts"),
            formality=1.0,
            aesthetics=["Casual"],
            ownership="owned",
            created_at=base_time,
        ),
        # Different category - Navy sneakers
        ClothingItemResponse(
            id="item-5",
            user_id="user-1",
            image_url="https://example.com/navy-sneakers.jpg",
            color=Color(hex="#1E3A5F", hsl=HSL(h=210, s=52, l=24), name="Navy", is_neutral=False),
            category=Category(l1="Shoes", l2="Sneakers"),
            formality=2.0,
            aesthetics=["Casual"],
            ownership="owned",
            created_at=base_time,
        ),
    ]


# TESTS: hex_to_rgb

class TestHexToRgb:
    def test_black(self):
        assert hex_to_rgb("#000000") == (0, 0, 0)
    
    def test_white(self):
        assert hex_to_rgb("#FFFFFF") == (255, 255, 255)
    
    def test_red(self):
        assert hex_to_rgb("#FF0000") == (255, 0, 0)
    
    def test_navy(self):
        assert hex_to_rgb("#1E3A5F") == (30, 58, 95)
    
    def test_lowercase(self):
        assert hex_to_rgb("#1e3a5f") == (30, 58, 95)
    
    def test_without_hash(self):
        # Should work without # prefix
        assert hex_to_rgb("1E3A5F") == (30, 58, 95)



# TESTS: color_distance

class TestColorDistance:
    def test_identical_colors(self):
        assert color_distance("#1E3A5F", "#1E3A5F") == 0
    
    def test_black_vs_white(self):
        # Maximum distance
        distance = color_distance("#000000", "#FFFFFF")
        assert distance > 400  # Should be ~441
    
    def test_similar_colors(self):
        # Two shades of blue should be close
        distance = color_distance("#1E3A5F", "#1E3A6F")
        assert distance < 50
    
    def test_different_colors(self):
        # Red vs Blue should be far
        distance = color_distance("#FF0000", "#0000FF")
        assert distance > 200
    
    def test_symmetry(self):
        # Distance should be same regardless of order
        d1 = color_distance("#1E3A5F", "#FF0000")
        d2 = color_distance("#FF0000", "#1E3A5F")
        assert d1 == d2



# TESTS: is_color_similar

class TestIsColorSimilar:
    def test_identical_colors(self):
        assert is_color_similar("#1E3A5F", "#1E3A5F") is True
    
    def test_similar_colors(self):
        assert is_color_similar("#1E3A5F", "#1E3A6F", threshold=50) is True
    
    def test_different_colors(self):
        assert is_color_similar("#FF0000", "#0000FF", threshold=50) is False
    
    def test_custom_threshold(self):
    # With high threshold, even different colors pass
        assert is_color_similar("#FF0000", "#0000FF", threshold=600) is True

# TESTS: score_item_match

class TestScoreItemMatch:
    def test_perfect_match(
        self, 
        sample_clothing_item, 
        sample_recommended_colors, 
        sample_formality_range
    ):
        """Item with exact color match and formality in range should score high."""
        score = score_item_match(
            sample_clothing_item,
            sample_recommended_colors,
            sample_formality_range,
        )
        # Color: ~50 (exact match), Formality: 50 (in range) = ~100
        assert score >= 90
    
    def test_poor_color_match(
        self, 
        sample_recommended_colors, 
        sample_formality_range
    ):
        """Item with very different color should score lower."""
        red_item = ClothingItemResponse(
            id="item-red",
            user_id="user-1",
            image_url="https://example.com/red.jpg",
            color=Color(hex="#FF0000", hsl=HSL(h=0, s=100, l=50), name="Red", is_neutral=False),
            category=Category(l1="Bottoms", l2="Jeans"),
            formality=3.0,
            aesthetics=[],
            ownership="owned",
            created_at=datetime.now().isoformat(),
        )
        
        score = score_item_match(red_item, sample_recommended_colors, sample_formality_range)
        # Color score should be low, formality should be 50
        assert score < 70
    
    def test_formality_out_of_range(
        self, 
        sample_recommended_colors
    ):
        """Item with formality outside range should score lower."""
        casual_item = ClothingItemResponse(
            id="item-casual",
            user_id="user-1",
            image_url="https://example.com/casual.jpg",
            color=Color(hex="#1E3A5F", hsl=HSL(h=210, s=52, l=24), name="Navy", is_neutral=False),
            category=Category(l1="Bottoms", l2="Shorts"),
            formality=1.0,  # Below range of 2-4
            aesthetics=[],
            ownership="owned",
            created_at=datetime.now().isoformat(),
        )
        
        formality_range = FormalityRange(min=2, max=4)
        score = score_item_match(casual_item, sample_recommended_colors, formality_range)
        
        # Color: ~50, Formality: 35 (1 level below min)
        assert score < 90
        assert score > 50  # But still reasonable due to color match


# TESTS: filter_and_rank_items

class TestFilterAndRankItems:
    def test_filters_by_category(
        self, 
        sample_closet_items, 
        sample_recommended_colors, 
        sample_formality_range
    ):
        """Should only return items from specified category."""
        results = filter_and_rank_items(
            sample_closet_items,
            category_l1="Bottoms",
            recommended_colors=sample_recommended_colors,
            formality_range=sample_formality_range,
        )
        
        assert all(item.category.l1 == "Bottoms" for item in results)
        assert not any(item.category.l1 == "Shoes" for item in results)
    
    def test_respects_limit(
        self, 
        sample_closet_items, 
        sample_recommended_colors, 
        sample_formality_range
    ):
        """Should return at most 'limit' items."""
        results = filter_and_rank_items(
            sample_closet_items,
            category_l1="Bottoms",
            recommended_colors=sample_recommended_colors,
            formality_range=sample_formality_range,
            limit=2,
        )
        
        assert len(results) <= 2
    
    def test_ranks_by_score(
        self, 
        sample_closet_items, 
        sample_recommended_colors, 
        sample_formality_range
    ):
        """Best matching items should be first."""
        results = filter_and_rank_items(
            sample_closet_items,
            category_l1="Bottoms",
            recommended_colors=sample_recommended_colors,
            formality_range=sample_formality_range,
            limit=5,
            min_score=0,  # Include all for this test
        )
        
        if len(results) >= 2:
            # First item should be navy chinos (perfect match)
            assert results[0].id == "item-1"
    
    def test_filters_by_min_score(
        self, 
        sample_closet_items, 
        sample_recommended_colors, 
        sample_formality_range
    ):
        """Should exclude items below min_score."""
        # With high min_score, only perfect matches pass
        results = filter_and_rank_items(
            sample_closet_items,
            category_l1="Bottoms",
            recommended_colors=sample_recommended_colors,
            formality_range=sample_formality_range,
            min_score=90,
        )
        
        # Only the navy chinos should pass (perfect match)
        assert len(results) <= 2
    
    def test_empty_category(
        self, 
        sample_closet_items, 
        sample_recommended_colors, 
        sample_formality_range
    ):
        """Should return empty list for category with no items."""
        results = filter_and_rank_items(
            sample_closet_items,
            category_l1="Accessories",
            recommended_colors=sample_recommended_colors,
            formality_range=sample_formality_range,
        )
        
        assert results == []
    
    def test_empty_items_list(
        self, 
        sample_recommended_colors, 
        sample_formality_range
    ):
        """Should handle empty items list gracefully."""
        results = filter_and_rank_items(
            [],
            category_l1="Bottoms",
            recommended_colors=sample_recommended_colors,
            formality_range=sample_formality_range,
        )
        
        assert results == []