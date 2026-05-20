# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Style It Yourself is a fashion styling web app that helps users build outfits using color theory, compatibility scoring, and AI-powered virtual try-on. Users upload clothing items, get recommendations, validate outfit combinations, and generate try-on images via Google Gemini.

## Architecture

Monorepo with two services:

- **Frontend** (`frontend/`): Next.js 16 + React 19, TypeScript, Tailwind CSS 4, Zustand state management
- **Backend** (`backend/`): FastAPI (Python 3.11), Pydantic schemas, Supabase (PostgreSQL + Auth + Storage), Google Gemini API

The backend follows MVC: `routers/` (controllers) → `services/` (business logic) → `models/schemas.py` (Pydantic DTOs). Constants and domain rules live in `utils/constants.py`.

Key backend services: `color_harmony.py` (HSL-based harmony classification), `compatibility.py` (outfit scoring), `matching.py` (finds closet items matching color/formality recommendations via weighted RGB distance), `gemini.py` (Gemini API calls for try-on image generation).

## Key Commands

### Frontend (`frontend/`)
```bash
npm ci               # Install dependencies (use ci over install for lockfile consistency)
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run lint         # ESLint (run before PRs)
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
- `backend/.env` — `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`, `CORS_ORIGINS`
- `frontend/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`

## Code Conventions

### Backend (Python)
- All request/response bodies are Pydantic `BaseModel` classes in `models/schemas.py` — define schemas first before implementing a new endpoint
- Routers use `Depends(get_current_user)` for auth — JWT verified via Supabase; use `get_optional_user()` for optional auth
- Services are stateless functions/classes — no global state
- Async Supabase client in `services/supabase.py`
- Color harmony logic uses HSL model with angular hue distance calculations
- Outfit scoring is penalty-based: starts at 100, deducts -30 (color clash), -40 (formality mismatch >2 levels), -30 (no shared aesthetics)

### Frontend (TypeScript/React)
- Strict TypeScript (`tsconfig.json` has `strict: true`); 2-space indentation; no semicolons
- Next.js App Router (`src/app/`); route directory names lowercase to match URL segments
- Single Zustand store (`store/styleStore.ts`) manages the full styling flow (5 steps: upload → metadata → colors → build → summary). The build step has its own nested sub-flow (`AddItemPanel`: upload → metadata → colors → validate) for adding additional outfit items. `store/index.ts` re-exports everything from `styleStore.ts` — import from either.
- Path alias: `@/*` → `./src/*`
- Components: `PascalCase` for files, `camelCase` for utilities/store functions
- Route-specific components live in `src/app/**/components/`; globally shared ones in `src/components/`; primitive UI atoms in `src/components/ui/`
- API calls go through `lib/api.ts` with auth token injection
- Color extraction uses ColorThief via `lib/colorExtractor.ts`; color utilities (harmony, HSL) in `lib/colorUtils.ts`; `lib/cn.ts` for Tailwind class merging
- TypeScript interfaces in `src/types/index.ts` mirror backend Pydantic schemas exactly — keep them in sync

### Editorial Design System (Frontend)
The frontend is fully on an editorial × brutalist × minimalist visual system. Every surface (landing, closet, account, style flow, modals) follows it.

- **Tokens live in `src/styles/system.css`**, imported from `src/app/layout.tsx`. The full design contract is `frontend/docs/redesign/design-system.md`; visual ground truth is the HTML artboards in `frontend/docs/redesign/reference/artboards/`.
- **Tailwind v4 `@theme` registration** in `src/app/global.css` exposes the tokens as utility classes: `bg-paper`, `bg-paper-2`, `bg-paper-3`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-ink`, `border-rule-soft`, `bg-accent` (oxblood), plus `font-display` (Instrument Serif), `font-sans` (Mona Sans), `font-mono` (JetBrains Mono).
- **Selection-state convention** (every tab, chip, segment, nav link, ownership pill): active = `font-bold` + `text-ink` + 1px ink underline (`border-b border-ink` with `pb-[2px]`). Inactive = `text-ink-3` + transparent border. Hover previews the underline. Vertical lists use a `→` prefix on active instead of an underline (the closet sidebar's FilterGroup pattern).
- **Editorial micro-typography**: italic + `text-ink-3` is the muted-emphasis convention. Used in display headlines (`The *closet*, edited.`, `*Navy* t-shirt.`), color names, system-generated tags, and accent verbs in loading states (`*Fitting* the piece onto your photo.`). Never italicize mono text.
- **Forbidden patterns**: no drop shadows, no gradients, no rounded corners larger than 2px, no emoji, no inline SVG icons. Hairline borders (`border-ink` or `border-rule-soft`) divide sections. Backdrop-blur is allowed only where image-color must remain legible (we use it on closet card try-on overlays).
- **One accent per page**. Accent (`text-accent` / `bg-accent`) is reserved for warnings, wishlist marks, destructive actions, and the active step indicator. Never decorative.

### General
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
| UI primitives | `frontend/src/components/ui/` |
| Style flow step components | `frontend/src/app/style/components/` |
| Color utilities (frontend) | `frontend/src/lib/colorExtractor.ts`, `frontend/src/lib/colorUtils.ts` |
| Editorial design tokens (CSS) | `frontend/src/styles/system.css` |
| Tailwind theme + token registration | `frontend/src/app/global.css` |

## Product Flows

See `golden-paths.md` for the three canonical user journeys: (1) Style an item I have, (2) Style for an event, (3) Experiment with color. These clarify the intended UX and help scope feature work correctly.

## Domain Concepts

- **Color Harmony**: Analogous (<=30deg), Complementary (165-195deg), Triadic (105-135deg), or Neutral. Hue distance = shortest arc on 360deg wheel.
- **Formality Levels**: 1 (Casual) to 5 (Black Tie). Distance > 2 warns; > 3 is a mismatch.
- **Aesthetics**: 8 tags (Minimalist, Streetwear, Classic, Bohemian, etc.) — items share at least one for cohesion.
- **Outfit Limits**: MAX_OUTFIT_ITEMS = 6, MAX_ACCESSORIES = 3. Required categories: Tops, Bottoms, Shoes.
- **AI Try-On**: Two Gemini models — `gemini-2.5-flash-image` (fast) and `gemini-3-pro-image-preview` (quality).
- **Storage Buckets**: `clothing-images` (item photos) and `user-photos` (full-body try-on photos).

## Testing

Backend tests use pytest + pytest-asyncio. Tests are in `backend/tests/unit/` and `backend/tests/integration/`. Run `pytest` from the `backend/` directory.

Frontend has no automated test runner. Before PRs: run `npm run lint` and manually verify core flows (`/`, `/style`, `/closet`, auth modal/login). If adding tests, use `*.test.ts` / `*.test.tsx` naming near the related code or under `src/__tests__/`.

## Common Gotchas

- The frontend Dockerfile has a multi-stage build with a `dev` target — Docker Compose dev uses `target: dev` to skip the production build step.
- Supabase handles the database, so there is no DB container in Docker Compose.
- The backend health endpoint is at `GET /health`.
- CORS origins are comma-separated in the backend `.env` and parsed into a list by `config.py`.
- Production frontend Docker builds require `NEXT_PUBLIC_*` env vars passed as build args (static injection at build time).
- `SUPABASE_SERVICE_KEY` (service role) is distinct from `SUPABASE_KEY` (anon key) — the service key bypasses RLS for admin operations.
- **CSS cascade layers vs. selector specificity** (`src/styles/system.css`): Tailwind v4 utilities live in `@layer utilities`. Unlayered element rules (e.g., `button { border: 0 }` at the top level of a stylesheet) **win over `@layer utilities` regardless of selector specificity**. The reset block in `system.css` is intentionally wrapped in `@layer base` so utilities like `border-b-2` actually apply to `<button>` elements. If you ever add a tag-level rule to `system.css` outside `@layer base` (`body { ... }`, `input { ... }`, etc.), utility overrides on that element will silently fail. Diagnostic: if a utility works on an inner `<span>` but not on the parent `<button>` with the same class, this is the bug.
- **Global masthead is route-aware via `usePathname()`** in `src/components/Headers.tsx`. It uses sentence-case labels but renders uppercase via `text-transform: uppercase`. Active route detection uses `pathname.startsWith()` so all sub-routes under `/style/*` mark `Style` as active.
- **Style flow state is frozen between sessions only by Zustand persistence**. Reloading mid-flow keeps the state. Visiting `/style` directly with no cropped image but non-`upload` step triggers an auto-reset (see `src/app/style/page.tsx`).
