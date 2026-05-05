# Frontend Redesign Migration — Execution Design

**Date:** 2026-05-05
**Author:** Thai (with Claude)
**Status:** Approved (pending user review)
**Source of design truth:** `frontend/docs/redesign/` (README, design-system.md, migration-plan.md, screens/, reference/artboards/)

---

## Why this spec exists

`frontend/docs/redesign/` already contains the visual design contract, a 6-phase migration plan, and seven screen-level redlines with HTML artboards. What it does **not** specify is the file-level execution: which current files map to which new state, how the app keeps working during the transition, how fonts and adjacent (non-redlined) components get handled, and how each phase is verified before merging.

This spec answers those questions. The visual design itself is settled — read `frontend/docs/redesign/design-system.md` for that. Nothing in this spec changes any visual decision.

---

## Scope

**In scope.**
- The full migration from the current dark-theme Tailwind frontend to the editorial paper-light design described in `frontend/docs/redesign/`.
- All seven redlined screens (landing, style flow x4, builder, closet) plus their adjacent components (modals, panels, headers).
- A stub-quality token+primitive pass on the non-redlined surfaces (`/account`, error boundary, 404, loading states) so they don't look broken next to the redesigned screens.
- Token coexistence strategy that lets the app keep functioning between Phase 0 and Phase 6.

**Out of scope.**
- Any change to the Zustand store, types, API client, or backend.
- Net-new features, route additions, or API endpoint changes.
- Designed (i.e. redlined) layouts for `/account`, error pages, or loading states. Those get a stub pass and a follow-up issue.
- Mobile artboards — they don't exist and we don't create them. Mobile follows the "shrink desktop honestly" rule.
- Söhne licensing. We use Mona Sans as the substitute.
- Vercel preview deploy wiring (your call, one-line config change, not a code change).

---

## Decisions made during brainstorming

These were the five choices that shape the rest of the plan.

1. **Spec scope.** Full migration spec, focused on execution mechanics rather than re-deriving design.
2. **Sans font.** Mona Sans (Apache 2.0). Instrument Serif and JetBrains Mono via Google Fonts. Söhne is flagged as a future ticket if/when licensed.
3. **Mobile.** Per-phase mobile breakpoint pass. "Shrink desktop honestly" — collapse columns, never introduce mobile-specific affordances. No mobile artboards.
4. **Adjacent (non-redlined) components.** Migrated mechanically using the new primitives in the same phase as the screen they live in. AuthModal restyles in Phase 1 because it pops over every screen.
5. **Branch strategy.** Long-lived `redesign/main` branch. Phase PRs merge into it. Single final merge to `main` at end of Phase 6. Production main stays on the current dark theme until cutover.

---

## Architecture

### Tokens

- Copy `frontend/docs/redesign/reference/system.css` to `frontend/src/styles/system.css`.
- Import `system.css` from `app/layout.tsx` *before* `global.css`.
- Inside `global.css`'s `@theme { ... }` block, add new color tokens — `--color-paper`, `--color-paper-2`, `--color-paper-3`, `--color-ink`, `--color-ink-2`, `--color-ink-3`, `--color-rule-soft`, `--color-accent`, `--color-accent-ink` — pointing at the corresponding `system.css` custom properties.
- **Keep** the existing dark-theme tokens (`--color-primary-900`, `--color-accent-500`, etc.) in `@theme` until Phase 6. Removing them mid-migration would break unmigrated screens.
- Tailwind utility classes resolve from this extended theme, so screens can opt into the new system per-phase by swapping classes (`bg-primary-900` → `bg-paper`, `text-neutral-50` → `text-ink`).

### Fonts

- Replace the current `Inter` loader in `app/layout.tsx` with three `next/font` loaders:
  - `next/font/google` `Instrument_Serif` weight 400 → CSS variable `--font-display` (overrides `system.css`'s `--font-display`).
  - `next/font/google` `JetBrains_Mono` → `--font-mono`.
  - `next/font/google` `Mona_Sans` → `--font-sans`.
- Each loader applies `variable: '--font-...'` so the CSS custom property cascades from `<html>`.
- `system.css` keeps its existing `--font-*` declarations as fallbacks; the runtime values come from `next/font` injection.
- **Delete** the Inter loader and the `--font-inter` variable from `global.css` once the swap lands. Inter is a forbidden pattern; we don't keep it for "transition safety."

### Primitives

`frontend/src/components/ui/` keeps the same file names and same exported prop APIs. Internals get rewritten in Phase 1.

| File | Today | After Phase 1 |
|---|---|---|
| `Button.tsx` | rounded, dark-on-light primary, gold accent | `.btn` filled ink-on-paper, `.btn--ghost`, `.btn--accent`. Same `variant`/`size`/`fullWidth`/`leftIcon`/`rightIcon`/`loading` props. |
| `Card.tsx` | rounded shadowed container | hairline-bordered paper block, no shadow, no radius |
| `Input.tsx` | bordered, rounded | bottom-hairline-only, serif for content fields, mono for code-y fields |
| `Modal.tsx` | rounded, shadowed, dark | full-bleed `--paper` background, 1px ink border, no rounded corners |
| `Badge.tsx` | rounded pill, color variants | `.tag` chip, hairline outline, mono uppercase |
| `Skeleton.tsx` | rounded shimmer block | `--paper-2` block with `--paper-3` diagonal-rule pulse |

Two new files:
- `Tag.tsx` — exports a `<Tag>` for `.tag` chips with `selected?: boolean` prop. Distinct from `Badge` — Badge was designed as a status pill; Tag is a filter chip. We could merge them, but the redesign spec defines `.tag` as the filter primitive and a status badge isn't currently used outside of `Badge`'s few callers; keep both for now.
- `Hairline.tsx` — exports `<Hairline />` and `<Hairline soft />`, thin wrappers around `<hr class="rule">` and `<hr class="rule-soft">`.

### Variant mapping (frozen for Phase 1)

| Today's prop | Phase 1 rendering |
|---|---|
| `<Button variant="primary">` | `.btn` (filled ink) |
| `<Button variant="secondary">` | `.btn--ghost` |
| `<Button variant="ghost">` | `.btn--ghost` |
| `<Button variant="danger">` | `.btn--accent` (oxblood) |
| `<Button size="sm">` | reduced padding 12px 14px, same min-width 220px |
| `<Button size="md">` | default `.btn` 18px 22px |
| `<Button size="lg">` | increased padding 22px 28px |

### Layout

- `app/layout.tsx` body classes: `bg-primary-900 text-neutral-50` → `bg-paper text-ink` (in Phase 1).
- `<main className="pt-20 min-h-screen">` stays.
- `Header.tsx` rewritten in Phase 1 as the wordmark masthead. `NavBar.tsx` is unused dead code (confirm via grep before deleting in Phase 6).

### What we don't introduce

- No CSS modules, no styled-components, no third styling system. Tailwind only.
- No new dependencies beyond the three `next/font` loaders.
- No new state, no new contexts, no new providers.

---

## Phase plan

Each phase is one PR (Phase 4 is four PRs). Each PR targets `redesign/main`. The final PR is `redesign/main` → `main`.

### Phase 0 — Setup

**Branch:** `redesign/phase-0-setup` → `redesign/main`.

**Deliverables:**
- Branch `redesign/main` cut from current `main`.
- `frontend/src/styles/system.css` (copied verbatim from redesign reference).
- `app/layout.tsx` imports `system.css` *before* `global.css`.
- Three `next/font` loaders wired (Instrument Serif, JetBrains Mono, Mona Sans). Inter loader removed; `--font-inter` variable removed.
- `global.css` `@theme` extended with new paper/ink/accent color tokens. Old tokens kept untouched.
- `--font-sans`, `--font-display`, `--font-mono` in `@theme` updated to point at the new font variables.

**Done when:** App boots, screen renders identically to current `main` (still dark theme — body classes haven't flipped yet), `getComputedStyle(document.body).getPropertyValue('--color-paper')` returns the oklch value, Tailwind utility `bg-paper` resolves on a test element, no console errors, lint and build pass.

### Phase 1 — Primitives + masthead flip

**Branch:** `redesign/phase-1-primitives` → `redesign/main`.

**Deliverables:**
- Rewrite `Button.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx`, `Badge.tsx`, `Skeleton.tsx` per the variant mapping table above.
- Add `Tag.tsx` and `Hairline.tsx`. Export from `components/ui/index.ts`.
- Flip `app/layout.tsx` body classes from `bg-primary-900 text-neutral-50` to `bg-paper text-ink`.
- Rewrite `Header.tsx` to the wordmark masthead (text-only, `.t-mono` "STYLE IT YOURSELF · EST. 2025", two text links right per `screens/00-landing.md`).
- Restyle `AuthModal.tsx` using new Modal primitive — pops over every screen, can't stay dark.

**Acknowledged regression:** Existing screens (closet, style flow, builder, account) will look visually broken after this PR — wrong proportions, wrong type, wrong density. This is the documented expected state of the long-lived branch mid-migration. Production `main` is unaffected.

**Done when:** Every primitive renders editorial-style. Click-throughs of one-of-each primitive succeed (open AuthModal, submit a form, filter the closet, render a tag). No prop-API regressions. Universal verification checklist passes.

### Phase 2 — Closet

**Branch:** `redesign/phase-2-closet` → `redesign/main`.

**Source files:**
- `frontend/src/app/closet/page.tsx`
- `frontend/src/app/closet/components/ItemDetailModal.tsx`
- `frontend/src/app/closet/components/OutfitDetailModal.tsx`

**Deliverables:**
- Replace closet page layout with the editorial structure per `screens/06-closet.md`: hero block, 5-cell ledger, tabs, filterbar with section labels (`FILTER · CATEGORY · SEASON · COLOR · SHOW`), category chips without counts, hairline-soft section headers (`TOPS · 08 PIECES`), `.product` grid, dashed add-slot.
- Restyle `ItemDetailModal.tsx` and `OutfitDetailModal.tsx` using new primitives.
- Outfits tab: 2×2 mini-grid look cards grouped by month.
- Mobile pass: 6-col → 3-col grid, ledger stacks vertically, tabs and filterbar stack.
- **Create `frontend/docs/redesign/mobile-rules.md`** — short doc (3-5 rules) capturing the mobile collapse decisions made here, so subsequent phases match.

**Keep:** All filtering logic, piece-edit flow, saved-outfits view, wishlist state. Visual layer only.

**Done when:** Page matches `06-closet.html` artboard at 1440px and a sensible mobile breakpoint. All filters and the piece-edit flow still work. Backend smoke test (closet GET, item edit POST) passes. Universal + Phase 2 checklist passes.

### Phase 3 — Outfit Builder

**Branch:** `redesign/phase-3-builder` → `redesign/main`.

**Source files:** Confirm during execution. Builder UI today lives inside the style flow as `frontend/src/app/style/components/BuildStep.tsx`. There is no dedicated `/builder` route. Two options at execution time:
1. Treat `BuildStep.tsx` as the surface and continue using the current route (`/style` step 4).
2. Create `app/builder/page.tsx` per the redline's "likely source file" hint and route to it independently.

The redline implies (1) is fine — "Not part of the linear flow. This is the daily-use surface." Decide at start of phase based on how the redesigned closet flows users into the builder. Flag in the PR description.

**Adjacent components to restyle:** `OutfitSlot.tsx`, `TryOnModal.tsx`, `TryonOutfitModal.tsx`, `AddItemPanel.tsx`.

**Deliverables:**
- Date-based headline (`Today's outfit. / Tuesday, April 16.`).
- Single-line serif prompt input with rotating placeholder (4s instant swap, no fade).
- 4-up `.product` grid with index in mono top-left, item type cap top-right.
- Mono cohesion line (`COHESION · 92 / 100`), accent if score < 70.
- Three ghost buttons: `SAVE LOOK`, `SWAP A PIECE`, `REGENERATE`.
- Recent looks horizontal scroll row.
- Replace any "AI is thinking…" full-screen loader with a 1px ink hairline that animates left-to-right under the prompt input.

**Keep:** Generation API, swap drawer, saved-looks persistence, scoring/cohesion logic.

**Done when:** Builder generates an outfit and renders in the new layout. Save / regenerate / swap functional. Recent looks scrolls. Backend smoke test passes. Mobile pass per the rules established in Phase 2.

### Phase 4 — Style flow (4 PRs)

Four PRs in order. Each PR targets `redesign/main`.

**Phase 4a — Upload.** Branch `redesign/phase-4a-upload`. Source: `app/style/components/UploadStep.tsx`, `app/style/page.tsx`, `StepIndicator.tsx`. Per `screens/01-style-upload.md`.

**Phase 4b — Describe.** Branch `redesign/phase-4b-describe`. Source: `app/style/components/MetadataStep.tsx`. Per `screens/02-style-describe.md`. Restyle `app/style/components/ItemDetailModal.tsx` (different file from closet's; confirm) at this phase.

**Phase 4c — Color.** Branch `redesign/phase-4c-color`. Source: `app/style/components/ColorStep.tsx`. Per `screens/03-style-color.md`.

**Phase 4d — Summary.** Branch `redesign/phase-4d-summary`. Source: `app/style/components/SummaryStep.tsx`. Per `screens/05-style-summary.md`.

**Keep across all four:** The Zustand store contract verbatim. No edits to `store/styleStore.ts`, no edits to `lib/api.ts`.

**Done when:** A new test user can complete Upload → Describe → Color → Summary and land on the closet. Step indicator highlights the active step in `--accent`. Backend smoke (upload to Supabase, color extraction, item save) passes. Mobile pass per Phase 2 rules.

### Phase 5 — Landing

**Branch:** `redesign/phase-5-landing` → `redesign/main`.

**Source:** `app/page.tsx`.

**Deliverables (per `screens/00-landing.md`, Minimalist direction):**
- Wordmark masthead with `STYLE IT YOURSELF · EST. 2025` left, `LOG IN` and `ENTER →` right.
- `.t-display-xl` 4-line headline, left-aligned to `--gutter`. Don't fight the line breaks.
- Two CTAs side-by-side, 24px gap: `[ START STYLING → ]` (`.btn`), `[ HOW IT WORKS ]` (`.btn--ghost`).
- Three-column hairline-divided "01 / 02 / 03" block, `var(--col-gap)` between, top hairline + 32px top padding per column.
- Mono colophon footer: `STYLE IT YOURSELF · 2025 · CONTACT`.

**Auth-state routing:** Logged-in → `/closet`. Logged-out CTA → `/style`. Confirm existing routing matches; if not, add the redirect.

**Don't:** Add hero image, add scroll animations, add testimonials/pricing.

**Done when:** Logged-out visitors see new landing. CTA routes to `/style`. Logged-in visitors hit `/` → `/closet`.

### Phase 6 — Cleanup + final merge

**Branch:** `redesign/phase-6-cleanup` → `redesign/main`, then `redesign/main` → `main`.

**Deliverables:**
- Delete unused old components: confirm `NavBar.tsx` is unused (grep), delete if so.
- Delete old dark-theme tokens from `@theme`: `--color-primary-*`, `--color-neutral-*` (audit which are still referenced; remove only those with zero hits in `frontend/src/`).
- Delete Inter font import (already removed in Phase 0; confirm).
- Forbidden-pattern grep across all of `frontend/src/`. Zero hits required for: `rounded-(md|lg|xl|2xl)`, `shadow-`, `backdrop-blur`, `bg-gradient`, emoji literals in JSX, `bg-primary-`, `text-neutral-`, `font-bold` (we use Instrument Serif weight 400 only).
- Stub-quality pass on `app/account/`, error boundary, 404 page, loading states: paper background, ink type, primitives only, single-column layout, page-gutter padding. **Open follow-up issue:** "Design redline for /account, error pages, loading states."
- Final visual audit: load every screen at 1440px and ~390px, screenshot each, attach to the cutover PR.
- Run `npm run lint` and `npm run build`. Both pass.

**Then:** Open `redesign/main` → `main` PR. Use a merge commit (not squash) so phase history is preserved — that lets you bisect to a specific phase if a visual regression surfaces post-cutover. Production cuts over.

**Done when:** All forbidden-pattern greps return zero hits. Build size delta is negative versus current `main` (we removed Inter, dark tokens, dead code). Final cutover PR merged.

---

## Coexistence rules (Phase 0 → Phase 6)

1. **Tokens coexist, screens don't.** Both old and new color tokens live in `@theme` simultaneously. A given screen is either fully migrated or fully on the old visual — never mid-flight.
2. **Primitive prop APIs are frozen across Phase 1.** Same exported types and signatures. Internals only.
3. **State, types, API client untouched.** No edits to `store/`, `types/`, `lib/api.ts`, or backend. If a redline implies a state change, flag in the PR description and ask before proceeding.

---

## Verification checklist

### Universal (every phase)

- [ ] `npm run lint` passes, no new warnings.
- [ ] `npm run build` succeeds.
- [ ] Browser console clean on every touched route.
- [ ] Forbidden-pattern grep on changed files: zero new hits for `rounded-(md|lg|xl|2xl)`, `shadow-`, `backdrop-blur`, `bg-gradient`, emoji literals, `font-bold`.
- [ ] Screenshot at 1440px attached.
- [ ] Phase 2+: Screenshot at ~390px also attached.

### Phase-specific

- **Phase 0** — App boots identical to `main`. CSS custom properties resolve. Tailwind `bg-paper` works on a test element.
- **Phase 1** — Primitives render editorial. Click-through of every primitive succeeds. AuthModal pops over a paper-light page without dark-theme bleed-through.
- **Phase 2** — Closet matches `06-closet.html`. All filters work. Modals open/save/delete. Outfits tab toggles. Wishlist toggles. `mobile-rules.md` written.
- **Phase 3** — Builder matches `04-outfit-builder.html`. Generate/swap/save/regenerate work. Cohesion < 70 renders in `--accent` (verify with fixture).
- **Phase 4** — Full Upload → Describe → Color → Summary walk by a test user. Photos upload. Metadata saves. Summary lands at `/closet`.
- **Phase 5** — Logged-out sees new landing. CTA routes correctly. Logged-in routes to `/closet`.
- **Phase 6** — Forbidden-pattern grep: zero hits. Build size delta negative. Side-by-side screenshots of every page in cutover PR description.

### Backend smoke (Phase 2+)

Run `uvicorn app.main:app --reload` from `backend/` and confirm at least one API call from each touched screen succeeds.

---

## Risk register

### R1 — `redesign/main` drifts from `main`

You've been merging fixes to main recently. If you keep doing that during the redesign window, `redesign/main` accumulates merge debt.

**Mitigation:** Rebase `redesign/main` onto `main` at the start of every new phase PR. If a conflict touches a Zustand store or an API call, stop and ask — a redesign PR should never resolve a logic conflict.

**Rollback:** `redesign/main` is a branch. If it goes sideways, abandon it and start a new one from current `main`. No production impact because nothing has been merged to `main` yet.

### R2 — Mona Sans renders noticeably differently from Söhne

Artboards are calibrated to Söhne's metrics; Mona Sans has a slightly larger x-height and different aperture.

**Mitigation:** In Phase 0, render `system.html` artboard side-by-side with the same content rendered through Mona Sans. If type rhythm visibly collapses (line-heights, tracking off), fall back to system stack (`Helvetica Neue, Helvetica, Arial`) and flag Söhne as a future ticket.

**Rollback:** Single-line change in `layout.tsx` font loader.

### R3 — Primitive prop API drift in Phase 1

Phase 1 rewrites internals while keeping prop APIs. If any consumer relies on a side effect, the rewrite silently breaks it.

**Mitigation:** Before rewriting each primitive, grep all usages and document what props are in use. Phase 1 PR description includes a "props inventory" section per primitive. Props with zero consumers can be removed; props with consumers must render identically.

**Rollback:** Per-primitive revert. Each primitive lives in its own file.

### R4 — Mobile breakpoints diverge between phases

Without a mobile artboard, "shrink desktop honestly" is interpretive. Phase 2 might collapse to 3-col while Phase 3 collapses to 2-col, losing coherence.

**Mitigation:** Phase 2 PR establishes mobile rules in `frontend/docs/redesign/mobile-rules.md` (3-5 rules: gutter at mobile, column count rules, masthead behavior). Subsequent phases must match.

**Rollback:** Each phase's mobile pass is a sub-section of its PR; revertable independently.

### R5 — Stub-quality non-redlined screens after Phase 6

`/account`, error boundary, 404, loading states get a token+primitive pass with no designed layout. A user landing on `/account` could see a parking lot of unstyled inputs.

**Mitigation:** Phase 6 stub pass enforces minimum dignity — paper background, ink type, primitives only, single-column layout, page-gutter padding. Won't be designed; won't be broken. Follow-up issue opened.

**Rollback:** Stub work is a few lines per file; trivially revertable.

### Final merge has no rollback

`redesign/main` → `main` is the cutover. Undoing it means a revert-PR of the entire merge. We accept this — the long-lived branch exists to gate that merge behind your final eyes-on visual approval.

---

## Open questions to resolve at execution time

These are not blockers for the spec; they're decisions to make during the relevant phase.

1. **Phase 3** — Does the Outfit Builder become a new route (`app/builder/page.tsx`), or does it remain the `BuildStep` inside the style flow? Decide based on how the redesigned closet links into it.
2. **Phase 4b** — Confirm the Style flow's `ItemDetailModal.tsx` is a separate file from the Closet's `ItemDetailModal.tsx`. If they're duplicates, consider consolidating in this phase. If they diverge, leave them.
3. **Phase 6** — Audit which `--color-primary-*` and `--color-neutral-*` tokens still have references in `frontend/src/` after all screens are migrated. Delete only those with zero hits; flag any survivors for review.

---

## Success criteria for the whole migration

- Every screen matches its corresponding artboard at 1440px and a sensible mobile breakpoint.
- All existing behavior intact: auth, routing, API, Zustand state, color extraction, try-on generation, outfit scoring.
- Zero hits on the forbidden-pattern grep.
- `npm run lint` and `npm run build` clean.
- Build size smaller than current `main` (we deleted Inter, dark tokens, dead components).
- One merge commit cutting over `redesign/main` → `main`, preserving phase history.
