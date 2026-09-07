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

## Observability

`app/observability/` holds the whole of it, and `app/main.py` calls
`configure_logging()` then `init_sentry()` **at import time**, not from the
lifespan hook. That ordering is load-bearing: uvicorn configures its own
loggers in `Config.__init__` and imports this module afterwards, so configuring
at import wins that race, and Sentry's Starlette integration patches the
framework, so it has to run before the `FastAPI` object exists.

Nothing else needs to know the package is there. The existing
`logging.getLogger(__name__)` call sites pick up the format, the level, and the
correlation id without being touched.

**Format and level** default per environment and are overridable with
`LOG_FORMAT` / `LOG_LEVEL`:

| | development | production |
|---|---|---|
| format | `console`, one readable line | `json`, one object per line |
| level | `DEBUG` | `INFO` |

JSON because Cloud Logging reads `severity` and `message` out of a JSON line
and leaves anything else as text at a single default severity, which is why
levels were meaningless in production before this existed.

**Correlation id.** `RequestContextMiddleware` assigns one per request from,
in order: an inbound `X-Request-ID`, the trace half of Cloud Run's
`X-Cloud-Trace-Context`, or a fresh UUID. It rides on every log line for that
request, comes back in the `X-Request-ID` response header, appears in the
`detail` of a 500 (so a user can quote it), and tags every Sentry issue.
`get_current_user` binds the user id into the same context.

**Sentry** is off unless `SENTRY_DSN` is set. Handled-and-logged failures
report themselves: the SDK's default `LoggingIntegration` turns every `ERROR`
record into an issue, so `logger.error(..., exc_info=True)` in a router is
already all that a call site has to do.

Gotchas:

- The per-request context is a **mutable dict** inside one ContextVar, not one
  ContextVar per value, and it has to stay that way. `IPRateLimitMiddleware` is
  a `BaseHTTPMiddleware`, so it runs everything below it in a child task; a
  `ContextVar.set()` down there (binding the user during auth) is invisible to
  the access line logged above it. Mutating a shared dict crosses that
  boundary. `test_user_bound_inside_the_route_reaches_the_access_line` is the
  test that fails if this is ever "simplified".
- **`uvicorn.access` is disabled.** The one access line per request comes from
  our middleware instead, carrying the id, the duration, and the user. If
  request logging ever looks missing, that is where it went.
- `/health` and `/` log at DEBUG, so in production (INFO) liveness probes are
  invisible. That is deliberate -- Docker healthchecks hit `/health` every 30s.
- An unhandled exception is logged twice on purpose: once as our access line
  (level ERROR, no traceback) and once by `uvicorn.error` (the traceback).
  Both carry the request id. Sentry only files one issue -- the access logger
  is registered with `ignore_logger`, and the SDK's dedupe integration
  collapses uvicorn's copy.
- `configure_logging()` removes only the handler it owns, so pytest's `caplog`
  keeps working. Anything asserting on log output should copy the
  `isolated_logging` fixture in `tests/unit/test_logging_config.py`.

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
