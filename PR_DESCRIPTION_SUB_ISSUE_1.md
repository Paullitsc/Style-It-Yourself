# PR: Implement Recommendations Router (Sub-Issue 1)

## Overview
Implements the `POST /api/recommendations` endpoint that generates color-coordinated outfit suggestions based on a base clothing item's properties (color, formality, aesthetics, category).

## Changes Made

### 1. Created Recommendations Router (`backend/app/routers/recommendations.py`)
- ✅ Implemented `APIRouter` with prefix `/api` and tag `recommendations`
- ✅ Created `POST /api/recommendations` endpoint
- ✅ Integrated with `RecommendationRequest` and `RecommendationResponse` schemas
- ✅ Added comprehensive error handling (400 for invalid input, 500 for service errors)
- ✅ Added OpenAPI documentation with summary, description, and docstrings
- ✅ Mapped request data to `ClothingItemBase` for service layer integration

### 2. Fixed Import Paths (`backend/app/main.py`)
- ✅ Fixed config import: `app.core.config` → `app.config`
- ✅ Fixed router imports: `app.api.routes` → `app.routers`
- ✅ Router registration verified (already correct on line 41)

## Technical Details

**Endpoint:** `POST /api/recommendations`  
**Auth:** Public (no authentication required)  
**Request Schema:** `RecommendationRequest`
- `base_color`: Color object (hex, HSL, name, is_neutral)
- `base_formality`: Integer (1-5)
- `base_aesthetics`: List of aesthetic tags
- `base_category`: Category object (L1, L2)

**Response Schema:** `RecommendationResponse`
- `recommendations`: List of `CategoryRecommendation` objects

**Error Handling:**
- `400 Bad Request`: Invalid input values (ValueError)
- `422 Unprocessable Entity`: Pydantic validation errors (auto-handled)
- `500 Internal Server Error`: Service layer failures

## Integration Points

- ✅ Uses existing schemas from `app/models/schemas.py`
- ✅ Calls `generate_category_recommendations()` from `app/services/compatibility.py`
- ✅ Service function is currently a stub - router will work once service is implemented

## Testing Instructions

See [TESTING_GUIDE.md](#testing-guide) below for detailed testing steps.

## Success Criteria

- [x] Router file created with proper APIRouter configuration
- [x] POST endpoint accepts RecommendationRequest and returns RecommendationResponse
- [x] Request data correctly mapped to ClothingItemBase for service call
- [x] Error handling distinguishes between 400 (client) and 500 (server) errors
- [x] Pydantic validation catches invalid formality/color values (422)
- [x] OpenAPI documentation includes summary, description, and response model
- [x] Router imported correctly in main.py
- [x] Endpoint accessible at `/api/recommendations`
- [x] OpenAPI docs show endpoint at `/docs`

## Notes

- This router is **public** (no auth required) - allows users to experiment without accounts
- The service function `generate_category_recommendations()` in `compatibility.py` is currently a stub (`pass`)
- Router structure is complete and will work correctly once the service layer is implemented
- Consider adding optional `filled_categories` query parameter in future iterations

---

# Testing Guide

## Prerequisites

1. Ensure backend dependencies are installed:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Set up environment variables (`.env` file):
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `GEMINI_API_KEY`

3. Start the FastAPI server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

   Server should start on `http://localhost:8000`

## Test 1: Verify Endpoint Registration

### Check OpenAPI Documentation

1. Open browser to: `http://localhost:8000/docs`
2. Verify you see the **recommendations** tag in the API documentation
3. Verify `POST /api/recommendations` endpoint is listed
4. Click on the endpoint to expand it
5. **What to show:** Screenshot of the OpenAPI docs showing the endpoint with all its details

### Expected Result:
- Endpoint visible in docs
- Request/response schemas displayed
- Example request body shown

## Test 2: Valid Request (Structure Test)

**Note:** This will return a 500 error until `generate_category_recommendations()` is implemented, but it proves the router structure is correct.

### Using curl:

```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "base_color": {
      "hex": "#1a237e",
      "hsl": {"h": 231, "s": 69, "l": 29},
      "name": "navy",
      "is_neutral": true
    },
    "base_formality": 3,
    "base_aesthetics": ["Classic", "Minimalist"],
    "base_category": {"l1": "Tops", "l2": "Blazers"}
  }'
```

### Using httpie:

```bash
http POST http://localhost:8000/api/recommendations \
  base_color:='{"hex": "#1a237e", "hsl": {"h": 231, "s": 69, "l": 29}, "name": "navy", "is_neutral": true}' \
  base_formality:=3 \
  base_aesthetics:='["Classic", "Minimalist"]' \
  base_category:='{"l1": "Tops", "l2": "Blazers"}'
```

### Using Python requests:

```python
import requests

url = "http://localhost:8000/api/recommendations"
payload = {
    "base_color": {
        "hex": "#1a237e",
        "hsl": {"h": 231, "s": 69, "l": 29},
        "name": "navy",
        "is_neutral": True
    },
    "base_formality": 3,
    "base_aesthetics": ["Classic", "Minimalist"],
    "base_category": {"l1": "Tops", "l2": "Blazers"}
}

response = requests.post(url, json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

### Expected Result:
- **Current state:** Returns `500 Internal Server Error` with message about service function (expected until service is implemented)
- **Once service is implemented:** Returns `200 OK` with `RecommendationResponse` containing recommendations

**What to show:** 
- Terminal output showing the request was accepted
- Response showing proper error handling (500 with descriptive message)
- This proves the router structure is correct and error handling works

## Test 3: Pydantic Validation - Invalid Formality

Tests that Pydantic automatically validates input and returns 422.

```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "base_color": {
      "hex": "#1a237e",
      "hsl": {"h": 231, "s": 69, "l": 29},
      "name": "navy",
      "is_neutral": true
    },
    "base_formality": 10,
    "base_aesthetics": ["Classic"],
    "base_category": {"l1": "Tops", "l2": "Blazers"}
  }'
```

### Expected Result:
- Returns `422 Unprocessable Entity`
- Response includes validation error details showing formality must be ≤ 5

**What to show:**
- Response showing 422 status code
- Error details showing which field failed validation

## Test 4: Pydantic Validation - Invalid Hex Color

```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "base_color": {
      "hex": "invalid-color",
      "hsl": {"h": 231, "s": 69, "l": 29},
      "name": "navy",
      "is_neutral": true
    },
    "base_formality": 3,
    "base_aesthetics": ["Classic"],
    "base_category": {"l1": "Tops", "l2": "Blazers"}
  }'
```

### Expected Result:
- Returns `422 Unprocessable Entity`
- Response shows hex color pattern validation error

**What to show:**
- Response showing 422 with hex validation error

## Test 5: Pydantic Validation - Invalid HSL Range

```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "base_color": {
      "hex": "#1a237e",
      "hsl": {"h": 500, "s": 69, "l": 29},
      "name": "navy",
      "is_neutral": true
    },
    "base_formality": 3,
    "base_aesthetics": ["Classic"],
    "base_category": {"l1": "Tops", "l2": "Blazers"}
  }'
```

### Expected Result:
- Returns `422 Unprocessable Entity`
- Response shows HSL hue must be ≤ 360

**What to show:**
- Response showing HSL validation error

## Test 6: Missing Required Fields

```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "base_color": {
      "hex": "#1a237e",
      "hsl": {"h": 231, "s": 69, "l": 29},
      "name": "navy",
      "is_neutral": true
    }
  }'
```

### Expected Result:
- Returns `422 Unprocessable Entity`
- Response lists missing required fields (`base_formality`, `base_category`)

**What to show:**
- Response showing missing field errors

## Test 7: Test Error Handling (ValueError)

This test requires the service function to raise a ValueError. Once `generate_category_recommendations()` is implemented and raises ValueError for invalid input, this will return 400.

**What to show:**
- Once service is implemented, demonstrate that ValueError from service returns 400 Bad Request (not 500)

## What to Show in PR Review

### Screenshots/Demonstrations:

1. **OpenAPI Documentation** (`/docs`)
   - Screenshot showing the recommendations endpoint
   - Expand the endpoint to show request/response schemas
   - Shows proper documentation is in place

2. **Valid Request Structure**
   - Terminal output showing curl/httpie request
   - Response showing 500 error (expected until service implemented)
   - Proves router accepts request and handles errors gracefully

3. **Validation Tests**
   - Multiple 422 responses for different validation failures
   - Shows Pydantic validation is working correctly
   - Demonstrates proper error messages

4. **Code Review Points**
   - Show the router implementation code
   - Highlight error handling structure
   - Show import fixes in main.py

### Terminal Commands to Run:

```bash
# Start server
cd backend
uvicorn app.main:app --reload

# In another terminal, run tests
# Test 1: Valid structure (will return 500 until service implemented)
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d @test_request.json

# Test 2: Invalid formality
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{"base_color": {...}, "base_formality": 10, ...}'

# Test 3: Check OpenAPI docs
open http://localhost:8000/docs
```

### Expected Test Results Summary:

| Test | Status Code | Expected Behavior |
|------|-------------|-------------------|
| Valid request (service stub) | 500 | Error message about service function |
| Invalid formality | 422 | Validation error details |
| Invalid hex color | 422 | Pattern validation error |
| Invalid HSL | 422 | Range validation error |
| Missing fields | 422 | Missing field errors |
| OpenAPI docs | 200 | Endpoint visible and documented |

## Next Steps

Once this PR is merged:
1. Implement `generate_category_recommendations()` in `compatibility.py`
2. Test with actual recommendation generation
3. Add integration tests for the full flow

---

## Files Changed

- `backend/app/routers/recommendations.py` - Complete router implementation
- `backend/app/main.py` - Fixed import paths

## Related Issues

- Sub-Issue 1: Implement Recommendations Router
- Main Issue: Implement Router Skeleton Structure for All API Endpoints

