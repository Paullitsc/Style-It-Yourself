# Closet + Landing Redesign — Phases 2 & 5, One PR

**Date:** 2026-05-18
**Branch:** continues `redesign/phase-1-primitives`
**Scope:** Editorial visual rewrite of `/closet` and `/` (landing) only. Other screens (style flow, outfit builder, account, modals consumed by those screens) remain in their current visuals and will be redesigned in follow-up PRs.

This spec compresses migration-plan Phases 2 and 5 into a single PR. Phases 3 (Outfit Builder), 4 (Style flow), and 6 (Cleanup) are deferred.

---

## 1. Goal

Land the highest-visibility surfaces of the editorial redesign:

- **Closet** — the user's home base after onboarding, the screen they live in.
- **Landing** — the first impression for logged-out visitors.

Both must match their respective artboards (`reference/artboards/06-closet.html`, `landing-minimalist.html`) at desktop, collapse sensibly on mobile, and break no existing behavior, routes, or data contracts.

## 2. Non-goals

- Style flow redesign (`/style/*`).
- Outfit builder redesign.
- Account page redesign.
- Visual updates to `OutfitDetailModal`, `ItemDetailModal`, `TryOnModal`, `AddItemPanel` — these are consumed by other screens; touching them produces drift across un-redesigned surfaces.
- Full-repo forbidden-pattern sweep (Phase 6 work).
- Backend changes. `OutfitSummary` / `ClothingItemResponse` / `ClosetResponse` shapes are frozen.
- Mobile-bespoke layouts. Mobile = "collapse columns" only, per migration plan.

## 3. Files touched

**Rewritten:**

- `frontend/src/components/ui/Card.tsx` — `ItemCard` and `OutfitCard` bodies. Public prop API unchanged plus one additive optional `index?: string` prop on `ItemCard`.
- `frontend/src/app/closet/page.tsx` — full layout rewrite; state logic and handlers preserved.
- `frontend/src/app/page.tsx` (landing) — full rewrite; drops upload zone; preserves `AuthModal`, `useAuth`, routing.

**May touch (small):**

- `frontend/src/lib/colorUtils.ts` — add a `dominantHueName(items)` helper. Read the file first; reuse existing exports if a similar helper is present.
- `frontend/src/components/Headers.tsx` — only if the global masthead's logged-out variant doesn't surface `LOG IN` / `ENTER →`. Read the file first to decide.

**Untouched:**

- Other UI primitives (`Button`, `Badge`, `Modal`, `Input`, `Tag`, `Hairline`, `Skeleton`) — already redesigned in Phase 1.
- `types/`, `lib/api.ts`, `store/styleStore.ts` — frozen per redesign rules.
- All backend code, `schemas.py`, routes.
- All other screen sources.

## 4. Commit boundaries (single PR)

1. `feat(redesign): rewrite ItemCard + OutfitCard to editorial product card`
2. `feat(redesign): rewrite Closet page as editorial layout`
3. `feat(redesign): rewrite Landing page as editorial minimalist`
4. (optional) `chore(redesign): scrub stray dark-theme classes in touched files`

Sequencing is bottom-up because `ItemCard` is consumed by un-redesigned screens; rewriting it first surfaces regressions before they pile up.

## 5. Component design

### 5.1 `ItemCard` — match `.product`

**Public API:** unchanged plus `index?: string` (additive, optional).

Existing props: `title`, `subtitle`, `imageUrl`, `imageAlt`, `colorHex`, `colorName`, `formality`, `aesthetics`, `badge`, `onClick`, `onTryOn`, `fallbackIcon`, `className`.

**Internal structure:**

```
<article class="flex flex-col gap-3">
  <div class="relative aspect-[4/5] bg-paper-2 overflow-hidden cursor-pointer">
    {imageUrl
      ? <img class="h-full w-full object-cover" />
      : <DiagonalRulePattern />}
    {index && <span class="absolute top-3 left-3 t-mono text-ink">{index}</span>}
    {badge && <div class="absolute bottom-3 right-3">{badge}</div>}
    {onTryOn && <HoverTryOnButton />}   // opacity fade only, no transforms
  </div>
  <div class="flex justify-between items-baseline">
    <span class="font-display text-[18px] leading-tight">{title}</span>
    <span class="t-mono text-ink-3">{colorName ?? formality_label}</span>
  </div>
</article>
```

**Choices:**

- Aspect ratio **4:5** (was 3:4).
- Background `--paper-2` (warm off-white) replaces `bg-primary-900`. Diagonal-rule pattern shows when no image.
- Index slot is optional; closet uses 2-digit zero-padded positions within each category section.
- Wishlist accent comes from `<StatusBadge status="wishlist" />` passed as `badge`. That component already renders in `--accent` post-Phase 1, preserving the "one accent per page" rule.
- Hover state is opacity/color only — no `scale`, `translate`, `rotate`.
- `colorHex` swatch and `aesthetics` chips are **dropped from the rendered card** (preserved in `ItemDetailModal`). Quieter grid per redline.

**DiagonalRulePattern** is a tiny inline component (10 lines) that renders the repeating-linear-gradient pattern from `system.css`. Used by `ItemCard`, `OutfitCard`, and `AddSlot`.

### 5.2 `OutfitCard` — single thumbnail, editorially framed

**Public API:** existing props unchanged (`name`, `createdAt`, `thumbnailUrl`, `itemCount`, `onClick`, `className`) plus additive optional `index?: string`.

**Divergence from redline:** the redline asks for a 2×2 mini-grid of constituent piece thumbnails. `OutfitSummary` only carries one `thumbnail_url`. Building the grid would require either N+1 item fetches or a backend change. Both are out of scope. We use the existing single thumbnail framed editorially — same shape as `ItemCard`, so the closet grid has a consistent rhythm.

**Internal structure:**

```
<article class="flex flex-col gap-3 cursor-pointer">
  <div class="relative aspect-[4/5] bg-paper-2 overflow-hidden">
    {thumbnailUrl
      ? <img class="h-full w-full object-cover" />
      : <DiagonalRulePattern />}
    {index && <span class="absolute top-3 left-3 t-mono text-ink">{index}</span>}
    <span class="absolute bottom-3 right-3 t-mono-s text-ink-3">
      {itemCount} PIECES
    </span>
  </div>
  <div class="flex justify-between items-baseline">
    <span class="font-display text-[18px] leading-tight">{name}</span>
    <span class="t-mono text-ink-3">{createdAt}</span>
  </div>
</article>
```

Cohesion score is not surfaced (data gap).

## 6. Page design — Closet

### 6.1 Page shell

```
<ProtectedRoute>
  <main class="mx-auto max-w-[1440px] px-[var(--gutter)] py-12">
    <HeroBlock />
    <hr class="rule" />
    <Ledger />
    <hr class="rule" />
    <TabsAndFilters />
    {activeView === 'items' ? <ItemsView /> : <OutfitsView />}
  </main>
</ProtectedRoute>
```

### 6.2 HeroBlock

- Title: `Your closet.` in `.t-display-l` (Instrument Serif).
- Subline: `.t-body-l text-ink-2` — `{total_items} pieces. Established {est_month_year}.`
- `est_month_year` = `min(created_at)` across all items, formatted `MMM YYYY` (e.g., `April 2025`).
- Empty-closet copy: `Empty closet.` / `Add your first piece below.`

### 6.3 Ledger (5 cells, hairline-divided)

Grid of 5 equal columns. Cells 2–5 carry `border-l border-ink` plus 24px horizontal padding.

Each cell:

```
<div class="px-6">
  <span class="t-mono text-ink-3">PIECES</span>
  <span class="t-display-s">24</span>
  <span class="t-mono-s text-ink-3">5 categories</span>
</div>
```

| Cell | Primary value | Secondary line |
|---|---|---|
| PIECES | `total_items` | `{n} categories` |
| OUTFITS | `total_outfits` | `{n} saved` |
| CATEGORIES | `Object.keys(items_by_category).length` | most common category |
| DOMINANT HUE | swatch + hue name (NAVY / SAND / OLIVE / …) | hex string |
| LAST ADDED | `MMM DD` (e.g., `APR 14`) | `{daysAgo}d ago` |

**Divergence:** redline calls for `AVG. COHESION`. `OutfitSummary` has no `cohesion_score`. Replaced with `CATEGORIES`. Documented.

Empty-closet state: every cell shows `—`.

Mobile (<768px): 5 cells collapse to a 2-column grid, fifth cell wraps to its own row.

### 6.4 Tabs

`PIECES` and `OUTFITS` as mono buttons with `border-b-2 border-ink` on the active one. 32px gap. **No counts inside the labels** — counts live in the ledger (one source of truth).

### 6.5 Filterbar

Two rows.

**Row 1 — labels:** `FILTER · CATEGORY · SHOW`. Inline mono labels with `·` separators. `CATEGORY` and `SHOW` are clickable and toggle which chip-row renders in row 2. Active label gets `border-b border-ink`. `FILTER` is a static prefix.

**Divergence:** redline lists `FILTER · CATEGORY · SEASON · COLOR · SHOW`. Season and Color have no existing filter logic; adding state is out of scope. Documented.

**Row 2 — chips:** `.tag`-style chips (hairline outline, mono, 6×10 padding). No counts on chips (count lives on the section header).

- When `CATEGORY` is active (default): `[ALL] [TOPS] [BOTTOMS] [OUTERWEAR] [SHOES] [ACCESSORIES]`.
- When `SHOW` is active: `[ALL] [OWNED] [WISHLIST]`.
- Active chip: filled — `bg-ink text-paper`.

**Removed:** sort dropdown (newest/oldest/color). Order is fixed: most recent first within each category. `sortOrder` state is deleted.

### 6.6 ItemsView — sectioned grid

For each category in canonical order (`Tops`, `Bottoms`, `Outerwear`, `Shoes`, `Accessories`):

```
<hr class="rule-soft" />
<header class="t-mono mt-6">{CATEGORY} · {count_padded_2} PIECES</header>
<div class="grid grid-cols-6 gap-[var(--col-gap)] mt-6 mb-12 max-md:grid-cols-3">
  {items.map((item, i) => <ItemCard index={pad2(i+1)} ... />)}
  <AddSlot category={cat} />
</div>
```

**`AddSlot`** — dashed `.product__frame`, centered 24px mono `+`. Click routes to `/style` (the styling flow's first step is upload, which is the existing add-piece entry — confirmed by reading `closet/page.tsx` and the routing in `app/style/`). This is the **only** add affordance on the closet. The redline mentions removing an "Add piece" segmented tab; the current code doesn't have one (segmented tabs today are `Items` / `Outfits`), so this line item is a no-op in practice.

### 6.7 OutfitsView

Group `outfits` by `created_at` month, rendered in reverse chronological order:

```
<hr class="rule-soft" />
<header class="t-mono mt-6">APRIL 2025 · 04 LOOKS</header>
<div class="grid grid-cols-6 gap-[var(--col-gap)] mt-6 mb-12 max-md:grid-cols-3">
  {outfits.map((o, i) => <OutfitCard index={pad2(i+1)} ... />)}
</div>
```

Empty state: dashed frame + mono caption `No outfits saved yet.`

### 6.8 Preserved behavior

- `selectedItem`, `selectedOutfit`, `tryOnItem` modal opens.
- `handleDeleteItem`, `handleDeleteOutfit` flow.
- `fetchCloset` with auth-token plumbing.
- Wishlist filter under SHOW.
- All existing API calls.

### 6.9 Removed

- Sort dropdown.
- "Add piece" segmented tab.
- Gradient divider lines on category headers.
- Counts inside chips.
- All dark-theme classes (`text-white`, `bg-primary-*`, `text-accent-500`, etc.).

## 7. Page design — Landing

### 7.1 Page shell

```
<div class="min-h-[calc(100vh-80px)] flex flex-col">
  <Hero />
  <hr class="rule" />
  <Steps id="steps" />
  <hr class="rule" />
  <Colophon />
  <AuthModal ... />
</div>
```

Stays a Client Component (`useAuth`, `useRouter`, `useState`).

Masthead is handled by the global `<Header />` rendered in `layout.tsx` (already redesigned in Phase 1). If the logged-out variant doesn't surface `LOG IN` and `ENTER →` per the redline, the header is updated in this PR.

### 7.2 Hero

```
<section class="px-[var(--gutter)] py-[var(--section-pad-y)]">
  <h1 class="t-display-xl">
    An outfit<br />
    generator for<br />
    clothes you<br />
    already own.
  </h1>
  <div class="flex gap-6 mt-12">
    <Button onClick={handleStartStyling}>START STYLING</Button>
    <Button variant="ghost" onClick={scrollToSteps}>HOW IT WORKS</Button>
  </div>
</section>
```

- `t-display-xl` is Instrument Serif, `clamp(72px → 184px)`, line-height 0.88.
- Hard-coded `<br />` line breaks preserve the 4-line shape per redline.
- No image, no upload zone, no gradient, no auth badge.
- `START STYLING`:
  - Logged-out → routes to `/style`.
  - Logged-in → routes to `/closet`.
- `HOW IT WORKS` → smooth scroll to `#steps`.

### 7.3 Steps

```
<section id="steps" class="px-[var(--gutter)] py-16 grid grid-cols-3 gap-[var(--col-gap)] max-md:grid-cols-1">
  {[
    { num: '01', label: 'UPLOAD',   title: 'Photos of\nyour closet.', body: 'Snap or import a photo of each piece.' },
    { num: '02', label: 'DESCRIBE', title: 'Tags & color\npalette.',  body: 'Add formality, aesthetic, and the colors we read.' },
    { num: '03', label: 'OUTFIT',   title: 'Daily looks\non demand.', body: 'Get outfit recommendations from what you already own.' },
  ].map((step) => (
    <article class="pt-8 border-t border-ink">
      <span class="t-mono text-ink-3">{step.num} / {step.label}</span>
      <h3 class="t-display-s mt-6 whitespace-pre-line">{step.title}</h3>
      <p class="t-body text-ink-2 mt-4">{step.body}</p>
    </article>
  ))}
</section>
```

On mobile, columns stack — each retains its top hairline.

### 7.4 Colophon

```
<footer class="px-[var(--gutter)] py-8">
  <hr class="rule" />
  <p class="t-mono text-ink-3 mt-6">STYLE IT YOURSELF · 2025 · CONTACT</p>
</footer>
```

`CONTACT` is a `mailto:` link if a support email exists; otherwise unlinked text.

### 7.5 Removed

- Right-column drag-drop upload zone, including handlers (`handleFileUpload`, `handleDrop`, `handleDragOver`, `triggerFileInput`) and `fileInputRef`.
- `setPendingUpload` invocation from this page.
- `Create Account` CTA (replaced by `START STYLING` direct route).
- Imports: `Upload`, `Sparkles`, `useRef`.

### 7.6 Preserved

- `useAuth` for logged-in/-out branching.
- `AuthModal` mounted for masthead `LOG IN`.
- Routes: `/closet` (logged-in entry), `/style` (logged-out start).
- `setPendingUpload` action still exists in the store; just no longer triggered from landing.

## 8. Verification plan

Run in order:

1. `npm run lint` — passes clean.
2. `npx tsc --noEmit` — passes clean.
3. `npm run dev` — boots without console errors.
4. Browser verification:

   | Path | What to verify |
   |---|---|
   | Landing, logged-out | Hero with 4-line serif. CTAs side-by-side. 01/02/03 block. `START STYLING` → `/style`. `HOW IT WORKS` scrolls to steps. `LOG IN` opens `AuthModal`. No upload zone. |
   | Landing, logged-in | Same hero. `START STYLING` → `/closet`. Masthead `ENTER →` works as expected. |
   | Closet, populated | Hero. 5-cell ledger renders with derived values. Tabs swap. Category chips filter. Wishlist toggle works. Canonical category order. Add-slot ends each section. Modals open. |
   | Closet, empty | Hero copy swaps. Ledger shows `—`. |
   | Closet, outfits tab | Month groupings. OutfitCards. Modal opens. |
   | Closet, mobile (~375px) | Ledger collapses to 2-col. Grid drops to 3-up. Readable. |
   | Other consumers | Hit `/style`. `ItemCard` doesn't crash in `AddItemPanel` / `TryOnModal`. Visual mismatch with surrounding dark UI is expected and out of scope. |

5. Scoped forbidden-pattern sweep in touched files only:
   - `rounded-{md,lg,xl,2xl}`
   - `shadow-`, `backdrop-blur`, `bg-gradient-`
   - Emoji literals in JSX
   - Dark-theme leftovers: `text-white`, `bg-primary-*`, `text-accent-500`

6. PR description must include:
   - Summary of changes
   - Verification checklist results
   - Screenshots of landing + closet at desktop and mobile collapse, next to artboards
   - Documented divergences (see section 9)
   - Listed out-of-scope items

## 9. Known divergences from redline

| Topic | Redline | This PR | Reason |
|---|---|---|---|
| Closet ledger 3rd cell | `AVG. COHESION` | `CATEGORIES` | `OutfitSummary` lacks `cohesion_score`; backend change forbidden. |
| OutfitCard image area | 2×2 mini-grid of constituent items | Single thumbnail in 4:5 frame | `OutfitSummary` only carries one `thumbnail_url`; N+1 fetch out of scope. |
| Closet filterbar labels | `FILTER · CATEGORY · SEASON · COLOR · SHOW` | `FILTER · CATEGORY · SHOW` | No filter logic exists for season/color; adding state is out of scope. |
| Landing CTA `START STYLING` | Implies "/style" route | Same — and *replaces* the current `Create Account` auth-gate flow | Redline preserves the "try without account" path. |
| ItemCard meta on closet | (Implicit: chips + swatch) | Aesthetics + swatch dropped from card | Redline says product card is "serif name + mono price." Detail modal retains them. |

## 10. Risks

1. **`ItemCard` regressions in unredesigned screens.** Style flow, `AddItemPanel`, `TryOnModal` consume it. Browser-verify `/style` after the rewrite.
2. **Mobile ledger collapse layout.** 5 cells → 2-col on <768px; fifth wraps. If awful in practice, revisit during browser verification.
3. **`onTryOn` hover button.** Preserved as opacity-fade only — no transforms — per the no-hover-transform rule.
4. **`Established` line** requires non-empty closet; empty state uses different copy.
5. **Forbidden-pattern leftovers** outside touched files (style flow, modals) are explicitly out of scope. Phase 6 sweep.
6. **Header `LOG IN` / `ENTER →` surfacing** — if the global `<Header />` doesn't already provide both for logged-out users, this PR fixes it. Verified during implementation.

## 11. Out of scope — explicit deferral list

- `/style/*` screens (Upload, Describe, Color, Summary, Outfit Builder, Add Item Panel, Try-On Modal).
- `/account/*` page.
- `OutfitDetailModal`, `ItemDetailModal` (visual; modal primitive itself is already redesigned).
- Phase 6 full-repo sweep.
- Mobile-bespoke layouts.
- Season / Color filter logic.
- `cohesion_score` in `OutfitSummary`.
- 2×2 outfit thumbnail grid.
- Söhne font licensing (uses Mona Sans / Helvetica Neue fallback per `layout.tsx`).
