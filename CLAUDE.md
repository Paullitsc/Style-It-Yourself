# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Style It Yourself is a fashion styling web app that helps users build outfits using color theory, compatibility scoring, and AI-powered virtual try-on. Users upload clothing items, get recommendations, validate outfit combinations, and generate try-on images via Google Gemini.

## Architecture

npm-workspaces monorepo (root `package.json` declares `workspaces: ["frontend", "packages/*"]`):

- **Frontend** (`frontend/`): Next.js 16 + React 19, TypeScript, Tailwind CSS 4, Zustand state management
- **Design system** (`packages/ui/`, published internally as `@siy/ui`): shared components, design tokens, and `cn()`. Ships raw TSX from `src/`, so the frontend compiles it via `transpilePackages` in `next.config.ts` — there is no build step.
- **Backend** (`backend/`): FastAPI (Python 3.11), Pydantic schemas, Supabase (PostgreSQL + Auth + Storage), Google Gemini API
- **Extension** (`extension/`): Chrome MV3, esbuild. Deliberately **outside** the workspace with its own lockfile; it shares no code with the frontend (`extension/src/lib/color.ts` hand-mirrors `colorUtils.ts` rather than importing it).

`packages/ui` is split in two:
- `src/primitives/` — shadcn/ui output (lowercase filenames). Restyled to the editorial system; treat as owned code, not vendored.
- `src/components/` — our composed public API (PascalCase), re-exported from `src/index.ts`.

The backend follows MVC: `routers/` (controllers) → `services/` (business logic) → `models/schemas.py` (Pydantic DTOs). Constants and domain rules live in `utils/constants.py`.

Key backend services: `color_harmony.py` (HSL-based harmony classification), `compatibility.py` (outfit scoring), `matching.py` (finds closet items matching color/formality recommendations via weighted RGB distance), `gemini.py` (Gemini API calls for try-on image generation).

## Area Guides

Each area has its own `CLAUDE.md` with conventions, testing, and gotchas
specific to it. Agent tools load them automatically when working in that
directory; humans should read the relevant one before touching an area.

- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — Next.js app, editorial design system, `packages/ui`
- [`backend/CLAUDE.md`](backend/CLAUDE.md) — FastAPI, scoring engine, Supabase, tests
- [`extension/CLAUDE.md`](extension/CLAUDE.md) — Chrome MV3 popup, build, mirrors

`AGENTS.md` files are deliberate stubs that deeplink here so only the
`CLAUDE.md` files need maintaining.

## Key Commands

### Frontend (from repo root — workspaces)
```bash
npm ci               # Install ALL workspaces (single lockfile at the root)
npm run dev          # Dev server on :3000 (delegates to the frontend workspace)
npm run build        # Production build
npm run lint         # ESLint (see Common Gotchas — main is not lint-clean)
```
Running the same scripts from inside `frontend/` also works. Add a workspace
dependency with `npm install --workspace @siy/ui <pkg>`, but see the lockfile
gotcha below before committing the result.

Node 24 is required (current LTS; matches `node:24-alpine` in the Dockerfile,
`engines` in the manifests, and `.nvmrc`). If installed keg-only via Homebrew,
it needs a PATH entry:
```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
```

### Backend (`backend/`)
```bash
pip install -r requirements.txt        # Install dependencies
uvicorn app.main:app --reload          # Dev server on :8000
pytest                                 # Run all tests
pytest tests/unit/                     # Unit tests only
pytest tests/integration/              # Integration tests only
pytest tests/unit/test_color_harmony.py  # Single test file
```

### Docker (project root)
```bash
docker compose up --build         # Dev environment (hot-reload)
docker compose -f docker-compose.prod.yml up --build  # Production build
```

## Environment Setup

Copy `.env.example` files and fill in credentials:
- `backend/.env` — `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `CORS_ORIGINS`
- `frontend/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`

## Code Conventions

Area-specific conventions live in the area guides; only cross-cutting rules follow.

### General
- Copy conventions: no em-dashes anywhere (source or prose), no semicolons in landing copy, titles carry no decorative punctuation, tooltips render sentence case
- Commit messages are short, imperative-style descriptions (e.g., `fix duplicate item validation`, not `nit` or `test fixes`)
- Branch naming: `name/category/description` (e.g., `thai/devops/docker`)
- PRs should include: summary of changes, how to verify, linked issue if available, screenshots/GIFs for UI changes

## Important File Paths

| Area | Path |
|------|------|
| Backend entry point | `backend/app/main.py` |
| Backend config | `backend/app/config.py` |
| Pydantic schemas | `backend/app/models/schemas.py` |
| API routers | `backend/app/routers/` |
| Business logic | `backend/app/services/` |
| Domain constants | `backend/app/utils/constants.py` |
| Auth middleware | `backend/app/middleware/auth.py` |
| DB schema (SQL) | `backend/supabase_schema.sql` |
| Frontend pages | `frontend/src/app/` |
| Zustand store | `frontend/src/store/styleStore.ts` |
| API client | `frontend/src/lib/api.ts` |
| TypeScript types | `frontend/src/types/index.ts` |
| Auth provider | `frontend/src/components/AuthProvider.tsx` |
| Global masthead (route-aware nav) | `frontend/src/components/Headers.tsx` |
| Shared design system (`@siy/ui`) | `packages/ui/src/` |
| shadcn primitives (owned, restyled) | `packages/ui/src/primitives/` |
| Composed public components | `packages/ui/src/components/` |
| `cn()` helper | `packages/ui/src/lib/cn.ts` |
| Style flow step components | `frontend/src/app/style/components/` |
| Color utilities (frontend) | `frontend/src/lib/colorExtractor.ts`, `frontend/src/lib/colorUtils.ts` |
| Editorial design tokens (CSS) | `packages/ui/src/styles/system.css` |
| Tailwind theme + shadcn remap | `frontend/src/app/global.css` |
| Workspace root manifest | `package.json` (single lockfile alongside it) |

## Product Flows

See `golden-paths.md` for the three canonical user journeys: (1) Style an item I have, (2) Style for an event, (3) Experiment with color. These clarify the intended UX and help scope feature work correctly.

## Domain Concepts

- **Color Harmony**: Analogous (<=30deg), Complementary (165-195deg), Triadic (105-135deg), or Neutral. Hue distance = shortest arc on 360deg wheel.
- **Neutrals** (black, white, gray, navy, brown, beige, cream, tan, khaki) pair with everything. The color namer treats warm hues as earth tones (dark = brown, muted = tan, very light = beige/cream) via saturation-lightness rules that live in `color_harmony.py` and are mirrored in `colorUtils.ts` and the extension's `color.ts` — change all three together.
- **Formality Levels**: 1 (Casual) to 5 (Black Tie). Distance > 2 warns; > 3 is a mismatch.
- **Aesthetics**: 8 tags (Minimalist, Streetwear, Classic, Bohemian, etc.) — items share at least one for cohesion.
- **Outfit Limits**: MAX_OUTFIT_ITEMS = 6, MAX_ACCESSORIES = 3. Required categories: Tops, Bottoms, Shoes.
- **AI Try-On**: Two Gemini models — `gemini-2.5-flash-image` (fast) and `gemini-3-pro-image-preview` (quality).
- **Storage Buckets**: `clothing-images` (item photos) and `user-photos` (full-body try-on photos).

## Common Gotchas

- The frontend Dockerfile has a multi-stage build with a `dev` target — Docker Compose dev uses `target: dev` to skip the production build step.
- **Dev and prod compose share image names**: building with `docker-compose.prod.yml` overwrites the dev-target image, and the next `docker compose up` runs the prod layout with the dev command (fails with `ENOENT /app/package.json`). After validating a prod build, run `docker compose build frontend` before bringing dev back up.
- **The frontend Docker build context is the REPO ROOT, not `frontend/`** (both compose files set `context: .` + `dockerfile: frontend/Dockerfile`). It has to be: the frontend imports `@siy/ui` from `packages/ui`, which a frontend-scoped context cannot reach. Consequences: paths inside the Dockerfile are `frontend/…` and `packages/ui/…`; the root `.dockerignore` is what keeps `node_modules` out of the context; dev volume mounts are `/app/frontend/src`, `/app/frontend/public`, and `/app/packages/ui/src`.
- **`output: "standalone"` needs `outputFileTracingRoot`** (set to the repo root in `next.config.ts`). Without it the traced bundle omits `packages/ui`. Because the root is the monorepo, the standalone layout is nested: the entrypoint is `frontend/server.js`, not `server.js`.
- Supabase handles the database, so there is no DB container in Docker Compose.
- The backend health endpoint is at `GET /health`.
- CORS origins are comma-separated in the backend `.env` and parsed into a list by `config.py`.
- Production frontend Docker builds require `NEXT_PUBLIC_*` env vars passed as build args (static injection at build time).
- `SUPABASE_SERVICE_KEY` (service role) is distinct from `SUPABASE_KEY` (anon key) — the service key bypasses RLS for admin operations.
- **Incremental `npm install --workspace …` prunes platform binaries from the lockfile.** It drops the `linux-*-musl` variants of `lightningcss`, `@tailwindcss/oxide`, and `@next/swc`, which the Alpine-based image needs — the container then 500s with `Cannot find module '../lightningcss.linux-arm64-musl.node'` while local dev stays fine. Fix: `rm -rf node_modules package-lock.json && npm install`, then confirm with `grep -c linux-arm64-musl package-lock.json` (expect 12).
