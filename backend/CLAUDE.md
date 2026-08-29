# Backend Guide

Read the root [`CLAUDE.md`](../CLAUDE.md) first for architecture, commands,
environment, and domain concepts. This file covers the FastAPI service.

## Conventions

- All request/response bodies are Pydantic `BaseModel` classes in `models/schemas.py` — define schemas first before implementing a new endpoint
- Routers use `Depends(get_current_user)` for auth — JWT verified via Supabase; use `get_optional_user()` for optional auth
- Services are stateless functions/classes — no global state
- Async Supabase client in `services/supabase.py`
- Color harmony logic uses HSL model with angular hue distance calculations
- Outfit scoring is penalty-based: starts at 100, deducts -30 (color clash), -40 (formality mismatch >2 levels), -30 (no shared aesthetics)

## Supabase

- The live project is provisioned (all four tables, all columns, three public
  storage buckets, RLS enabled and verified to block anonymous reads). It was
  applied by hand through the dashboard: `supabase_schema.sql` is the source
  of truth, so any schema change must be applied to the live project AND
  committed to that file in the same change. A migration workflow (supabase
  CLI) would be an upgrade.
- `SUPABASE_SERVICE_KEY` bypasses RLS; never expose it beyond the backend.

## Testing

Backend tests use pytest + pytest-asyncio. Tests are in `backend/tests/unit/` and `backend/tests/integration/`. Run `pytest` from the `backend/` directory.

- The local machine may lack pytest (system Python 3.9); run inside the
  container instead: `docker compose cp backend/tests backend:/app/` then
  `docker compose exec backend sh -c 'cd /app && python -m pytest tests/unit -q'`.
  The image bakes tests at build time and only `backend/app` is volume-mounted,
  hence the copy step.
- `docker compose cp` overlays but never deletes: after moving or removing
  test files, `docker compose exec backend rm -rf /app/tests` before copying,
  or ghosts of deleted tests keep running.
- The unit suite must pass completely. `tests/integration/test_gemini_tryon.py`
  calls the real Gemini API and runs only deliberately.
