# Quick Testing Guide - Recommendations Router

## Start Server
```bash
cd backend
uvicorn app.main:app --reload
```

## Test Commands

### 1. Check OpenAPI Docs
Open in browser: `http://localhost:8000/docs`

### 2. Valid Request (Structure Test)
```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d @test_request.json
```

**Expected:** 500 error (service not implemented yet) - this proves router works!

### 3. Invalid Formality (Validation Test)
```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "base_color": {"hex": "#1a237e", "hsl": {"h": 231, "s": 69, "l": 29}, "name": "navy", "is_neutral": true},
    "base_formality": 10,
    "base_aesthetics": ["Classic"],
    "base_category": {"l1": "Tops", "l2": "Blazers"}
  }'
```

**Expected:** 422 Unprocessable Entity

### 4. Invalid Hex Color (Validation Test)
```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "base_color": {"hex": "invalid", "hsl": {"h": 231, "s": 69, "l": 29}, "name": "navy", "is_neutral": true},
    "base_formality": 3,
    "base_aesthetics": ["Classic"],
    "base_category": {"l1": "Tops", "l2": "Blazers"}
  }'
```

**Expected:** 422 Unprocessable Entity

## What to Show in PR

1. **Screenshot:** OpenAPI docs at `/docs` showing the endpoint
2. **Terminal output:** Valid request returning 500 (proves router structure)
3. **Terminal output:** Invalid requests returning 422 (proves validation)
4. **Code:** Show router implementation highlighting error handling

