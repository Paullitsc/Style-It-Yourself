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

Node 20 is required (matches `node:20-alpine` in the Dockerfile). If installed
keg-only via Homebrew, it needs a PATH entry:
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
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
- Single Zustand store (`store/styleStore.ts`) manages the full styling flow (5 steps: upload → metadata → colors → build → summary). The build step has its own nested sub-flow (`AddItemPanel`: upload → metadata → colors → validate) for adding additional outfit items. Import from `@/store/styleStore` directly.
- Path alias: `@/*` → `./src/*`
- Components: `PascalCase` for files, `camelCase` for utilities/store functions
- Route-specific components live in `src/app/**/components/`; app-wide shared ones in `frontend/src/components/`; reusable primitives live in `packages/ui` and are imported from `@siy/ui`
- API calls go through `lib/api.ts` with auth token injection
- Color extraction uses ColorThief via `lib/colorExtractor.ts`; color utilities (harmony, HSL) in `lib/colorUtils.ts`; `cn()` for Tailwind class merging is exported from `@siy/ui` (clsx + tailwind-merge, so later classes win on conflict)
- TypeScript interfaces in `src/types/index.ts` mirror backend Pydantic schemas exactly — keep them in sync

### Editorial Design System (Frontend)
The frontend is fully on an editorial × brutalist × minimalist visual system. Every surface (landing, closet, account, style flow, modals) follows it.

- **Tokens live in `packages/ui/src/styles/system.css`** (`@siy/ui/styles.css`), `@import`-ed by `frontend/src/app/global.css`. It must be imported *there*, not in `layout.tsx`: Tailwind only collects `@theme` blocks from the stylesheet graph rooted at the file containing `@import "tailwindcss"`, so a separate entry point silently breaks token registration. `system.css` is the only design ground truth — there is no `docs/redesign/` directory.
- **shadcn/ui is remapped, never redefined.** `global.css` points shadcn's semantic variables (`--background`, `--primary`, `--border`, `--destructive`, …) at editorial tokens so colour has one source of truth. `--radius` is pinned to `2px`. When adding a shadcn component, restyle it: strip `rounded-md/lg`, `shadow-*`, and `dark:` variants.
- **Tailwind v4 `@theme` registration** in `src/app/global.css` exposes the tokens as utility classes: `bg-paper`, `bg-paper-2`, `bg-paper-3`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-ink`, `border-rule-soft`, `bg-accent` (oxblood), plus `font-display` (Instrument Serif), `font-sans` (Mona Sans), `font-mono` (JetBrains Mono).
- **Selection-state convention** (every tab, chip, segment, nav link, ownership pill): active = `font-bold` + `text-ink` + 1px ink underline (`border-b border-ink` with `pb-[2px]`). Inactive = `text-ink-3` + transparent border. Hover previews the underline. Vertical lists use a `→` prefix on active instead of an underline (the closet sidebar's FilterGroup pattern).
- **Editorial micro-typography**: inline italic/muted emphasis is retired — headlines, color names, tags, and loading copy render in uniform weight and color. Do not reintroduce `<em className="italic text-ink-3">` fragments inside text. Block-level italic remains for full serif captions and subheads (whole `font-display italic text-ink-2` paragraphs) and for the masthead wordmark. Never italicize mono text.
- **Forbidden patterns**: no drop shadows, no gradients, no rounded corners larger than 2px, no emoji, no hand-authored `<svg>` markup (use `@hugeicons/react` with `strokeWidth={1}` to match hairlines — see the icon gotcha below). Hairline borders (`border-ink` or `border-rule-soft`) divide sections. Backdrop-blur is allowed only where image-color must remain legible (we use it on closet card try-on overlays).
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
- **The frontend Docker build context is the REPO ROOT, not `frontend/`** (both compose files set `context: .` + `dockerfile: frontend/Dockerfile`). It has to be: the frontend imports `@siy/ui` from `packages/ui`, which a frontend-scoped context cannot reach. Consequences: paths inside the Dockerfile are `frontend/…` and `packages/ui/…`; the root `.dockerignore` is what keeps `node_modules` out of the context; dev volume mounts are `/app/frontend/src` and `/app/packages/ui/src`.
- **`output: "standalone"` needs `outputFileTracingRoot`** (set to the repo root in `next.config.ts`). Without it the traced bundle omits `packages/ui`. Because the root is the monorepo, the standalone layout is nested: the entrypoint is `frontend/server.js`, not `server.js`.
- Supabase handles the database, so there is no DB container in Docker Compose.
- The backend health endpoint is at `GET /health`.
- CORS origins are comma-separated in the backend `.env` and parsed into a list by `config.py`.
- Production frontend Docker builds require `NEXT_PUBLIC_*` env vars passed as build args (static injection at build time).
- `SUPABASE_SERVICE_KEY` (service role) is distinct from `SUPABASE_KEY` (anon key) — the service key bypasses RLS for admin operations.
- **CSS cascade layers vs. selector specificity** (`packages/ui/src/styles/system.css`): Tailwind v4 utilities live in `@layer utilities`. Unlayered element rules (e.g., `button { border: 0 }` at the top level of a stylesheet) **win over `@layer utilities` regardless of selector specificity**. The reset block in `system.css` is intentionally wrapped in `@layer base` so utilities like `border-b-2` actually apply to `<button>` elements. If you ever add a tag-level rule to `system.css` outside `@layer base` (`body { ... }`, `input { ... }`, etc.), utility overrides on that element will silently fail. Diagnostic: if a utility works on an inner `<span>` but not on the parent `<button>` with the same class, this is the bug.
- **Global masthead is route-aware via `usePathname()`** in `src/components/Headers.tsx`. It uses sentence-case labels but renders uppercase via `text-transform: uppercase`. Active route detection uses `pathname.startsWith()` so all sub-routes under `/style/*` mark `Style` as active.
- **Style flow state is frozen between sessions only by Zustand persistence**. Reloading mid-flow keeps the state. Visiting `/style` directly with no cropped image but non-`upload` step triggers an auto-reset (see `src/app/style/page.tsx`).
- **`npx shadcn add` will silently overwrite our components on macOS.** The filesystem is case-insensitive, so shadcn's `button.tsx` IS our `Button.tsx`. This already destroyed `Button/Input/Skeleton` once. `components.json` therefore points `aliases.ui` and `aliases.components` at `@/primitives`, keeping shadcn's lowercase files in `src/primitives/` and away from `src/components/`. Do not repoint them.
- **shadcn-generated code needs two fixes before it works here.** (1) Imports must be made relative (`../lib/cn`, not `@/lib/cn`): inside `packages/ui`, Next resolves `@/*` against the *frontend's* tsconfig, so the alias silently fails. (2) It emits `lucide-react` imports — port them to `@hugeicons/react` (`Cancel01Icon` for close, `Alert01Icon` for warnings, `Upload01Icon` for uploads).
- **shadcn's `--accent` means "subtle hover surface"; ours is the oxblood brand mark.** Defining shadcn's version would repaint every `bg-accent`/`text-accent` usage. `--accent` stays oxblood, shadcn's hover role is routed to `--muted`, and `--destructive` is mapped to the accent (this system uses one accent for destructive actions). Generated components that use `bg-accent` for hover must be changed to `muted`.
- **Use plain `@theme`, not `@theme inline`, in `global.css`.** `inline` does not emit the `--color-*` custom properties, and several components reference `var(--color-ink)` / `var(--color-paper-2)` directly in inline styles. Switching to `inline` blanks those colours with no build error.
- **Incremental `npm install --workspace …` prunes platform binaries from the lockfile.** It drops the `linux-*-musl` variants of `lightningcss`, `@tailwindcss/oxide`, and `@next/swc`, which the Alpine-based image needs — the container then 500s with `Cannot find module '../lightningcss.linux-arm64-musl.node'` while local dev stays fine. Fix: `rm -rf node_modules package-lock.json && npm install`, then confirm with `grep -c linux-arm64-musl package-lock.json` (expect 12).
- **Font tokens: next/font variables must live on `<html>`, not `<body>`.** `global.css` resolves `--font-sans`/`--font-display`/`--font-mono` from the next/font variables in a `:root` rule. Custom properties substitute at the element where they are *declared*, and inherit their already-computed value — so if `--font-mona-sans` only existed on `<body>`, the `:root` declaration would be invalid-at-computed-value-time, resolve to empty, and every font would silently fall back to the browser default. `layout.tsx` therefore puts the `.variable` classes on `<html>`.
- **The `:root` font block in `global.css` must stay after the `@siy/ui` import.** Tailwind emits `@theme` values at the `@import "tailwindcss"` position, so `system.css` — imported after it — otherwise wins with its standalone literals (`"Söhne"` for sans, which is not licensed or loaded), and body copy renders in Helvetica. Verify with computed `font-family` on `<body>`: it should report `Mona Sans`.
- **`npm run lint` does not pass on `main`.** There is a standing backlog of `react-hooks/set-state-in-effect` and refs-during-render errors in the style-flow components. Compare counts before and after your change rather than expecting zero.
