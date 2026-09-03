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

## Rate limiting

`services/rate_limit.py` is the single entry point. Two enforcement points,
deliberately different:

- **Per-user, per-endpoint** — `Depends(rate_limit(name, limit))` in the route
  decorator's `dependencies=[...]`. Counters live in Supabase
  (`consume_rate_limit` RPC) so they are shared across Cloud Run instances;
  a per-process dict multiplies the limit by the instance count and resets on
  every cold start, which with `--min-instances 0` is often. Use this for
  anything that costs money or does outbound I/O.
- **Per-IP** — `IPRateLimitMiddleware`, registered in `main.py` *before* CORS so
  CORS stays outermost and 429s carry the headers a browser needs. It runs
  before `get_current_user`, which spends a Supabase round-trip on every
  request including junk-token ones. Intentionally per-instance: a database hit
  on every request would tax the whole API to sharpen an approximate bound.

Gotchas:

- Schema changes here must be applied to the live Supabase project by hand;
  see DEPLOYMENT.md. If the RPC is missing the limiter logs an error and falls
  back to per-instance counters rather than failing the request.
- The window is fixed, not sliding, so a caller can spend a full budget either
  side of a boundary (up to 2x nominal). Set limits with that in mind.
- 429 bodies must stay human-readable: clients render `detail` verbatim and
  do not inspect status codes, so a bare 429 surfaces as "API error: 429".
- The suite disables rate limiting via an autouse fixture in `tests/conftest.py`;
  tests that exercise it opt back in.

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
