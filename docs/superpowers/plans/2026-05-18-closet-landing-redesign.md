# Closet + Landing Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visual rewrite of `/` (landing) and `/closet` to match the editorial × brutalist × minimalist design system. Preserves all behavior, routes, state, and API contracts.

**Architecture:** Bottom-up — update card primitives first so the closet has the right building blocks, then rewrite the closet page, then the landing page. Each task ends with a commit so the branch stays bisectable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS 4 with `@theme` token registration, system tokens from `frontend/src/styles/system.css`. No test runner — verification is lint + typecheck + dev-server browser smoke.

**Spec:** `docs/superpowers/specs/2026-05-18-closet-landing-redesign-design.md`.

**Working directory for all commands:** `frontend/` (i.e., `cd frontend` before any `npm` command). All file paths in this plan are absolute or relative to repo root.

**Branch:** `redesign/phase-1-primitives` (continue commits here).

---

## File inventory

**Rewritten:**

- `frontend/src/components/ui/Card.tsx` — `ItemCard` body (Task 2), `OutfitCard` body (Task 3). `Card`, `CardHeader`, `CardBody`, `CardFooter`, `RecommendationCard` left alone.
- `frontend/src/app/closet/page.tsx` — full rewrite (Task 5).
- `frontend/src/app/page.tsx` — full rewrite (Task 6).

**Modified (small):**

- `frontend/src/lib/colorUtils.ts` — add `dominantHueName(items)` helper (Task 1).
- `frontend/src/components/NavBar.tsx` — restructure to editorial `LOG IN` / `ENTER →` + remove "Home" link (Task 4).

**Untouched:**

- Other UI primitives, Headers shell, types, lib/api, store, all backend code, all other screens.

---

## Task 1: Add `dominantHueName` helper

**Why:** The closet ledger's `DOMINANT HUE` cell needs a function that takes a list of items and returns the most-common color family + sample hex. Lives in `colorUtils.ts` next to `getColorName`.

**Files:**
- Modify: `frontend/src/lib/colorUtils.ts` — append a new exported function at the end of the file.

- [ ] **Step 1: Read `colorUtils.ts` to confirm the existing export style**

Run: `Read frontend/src/lib/colorUtils.ts`
Expected: `getColorName(hsl)` is already exported and returns `{ name, isNeutral }`. `Color` type is imported from `@/types`.

- [ ] **Step 2: Append `dominantHueName` to `colorUtils.ts`**

Add to the end of `frontend/src/lib/colorUtils.ts`:

```ts
// =============================================================================
// AGGREGATE HUE
// =============================================================================

/**
 * Compute the dominant hue across a set of items.
 * Returns the most-frequent fashion color name (via getColorName) and a sample hex
 * from the first item that contributed to it. Falls back to a neutral gray when
 * the input is empty.
 */
export function dominantHueName(
  items: Array<{ color: Color }>
): { name: string; hex: string } {
  if (items.length === 0) return { name: 'Neutral', hex: '#808080' }

  const counts = new Map<string, number>()
  const samples = new Map<string, string>()

  for (const item of items) {
    const { name } = getColorName(item.color.hsl)
    counts.set(name, (counts.get(name) ?? 0) + 1)
    if (!samples.has(name)) samples.set(name, item.color.hex)
  }

  let topName = 'Neutral'
  let topCount = 0
  for (const [name, count] of counts) {
    if (count > topCount) {
      topName = name
      topCount = count
    }
  }

  return { name: topName, hex: samples.get(topName) ?? '#808080' }
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: zero errors. If the import for `Color` is missing it's already there at the top of the file (`import type { HSL, Color } from '@/types'`).

- [ ] **Step 4: Commit**

```
git add frontend/src/lib/colorUtils.ts
git commit -m "feat(redesign): add dominantHueName helper for closet ledger"
```

---

## Task 2: Rewrite `ItemCard` to match `.product`

**Why:** The current `ItemCard` uses dark-theme classes (`bg-primary-900`, `text-white`) and a 3:4 frame. The redesign needs a 4:5 frame with paper-2 background, diagonal-rule placeholder fallback, optional `index` slot, and editorial meta (serif name + mono color/formality).

**Files:**
- Modify: `frontend/src/components/ui/Card.tsx` lines 42–200 (`ItemCard` block, between `const FORMALITY_LABELS` and the start of `OutfitCardProps`).

- [ ] **Step 1: Read `Card.tsx` to confirm current line numbers**

Run: `Read frontend/src/components/ui/Card.tsx`
Expected: `ItemCard` definition starts around line 58 and ends around line 200 with the trailing `}` before the `OutfitCardProps` interface.

- [ ] **Step 2: Replace the `ItemCard` definition (props + function body)**

Replace the entire `ItemCard` block in `frontend/src/components/ui/Card.tsx`. Locate `interface ItemCardProps {` and replace from there through the closing `}` of the `ItemCard` function (just before `interface OutfitCardProps {`). The new code:

```tsx
interface ItemCardProps {
  title: string
  subtitle?: string
  imageUrl?: string | null
  imageAlt: string
  colorHex?: string
  colorName?: string
  formality?: number
  aesthetics?: string[]
  badge?: ReactNode
  onClick?: () => void
  className?: string
  fallbackIcon?: ReactNode
  onTryOn?: () => void
  index?: string
}

export function ItemCard({
  title,
  imageUrl,
  imageAlt,
  colorName,
  formality,
  badge,
  onClick,
  className,
  onTryOn,
  index,
}: ItemCardProps) {
  const metaText =
    colorName ??
    (formality !== undefined ? FORMALITY_LABELS[formality] : '')

  const frame = (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden bg-paper-2',
        !imageUrl && 'product__frame--placeholder',
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className="h-full w-full object-cover"
        />
      ) : null}

      {index && (
        <span className="absolute top-3 left-3 font-mono text-[11px] uppercase tracking-[0.04em] text-ink">
          {index}
        </span>
      )}

      {badge && (
        <div className="absolute bottom-3 right-3">{badge}</div>
      )}

      {onTryOn && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTryOn()
          }}
          className={cn(
            'absolute top-3 right-3',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            'font-mono text-[10px] uppercase tracking-[0.08em]',
            'bg-ink text-paper px-3 py-2 border border-ink',
            'hover:bg-paper hover:text-ink',
          )}
          aria-label={`Try on ${title}`}
        >
          Try on
        </button>
      )}
    </div>
  )

  const meta = (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-display text-[18px] leading-tight text-ink">
        {title}
      </span>
      {metaText && (
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          {metaText}
        </span>
      )}
    </div>
  )

  const containerClasses = cn(
    'group flex flex-col gap-3 text-left',
    onClick && 'cursor-pointer',
    'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
    className,
  )

  if (!onClick) {
    return (
      <article className={containerClasses}>
        {frame}
        {meta}
      </article>
    )
  }

  // onTryOn renders a <button> inside the frame, so the outer interactive
  // element must be a <div role="button"> to avoid nested buttons.
  if (onTryOn) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        className={containerClasses}
        aria-label={`Open item details for ${title}`}
      >
        {frame}
        {meta}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={containerClasses}
      aria-label={`Open item details for ${title}`}
    >
      {frame}
      {meta}
    </button>
  )
}
```

Notes:
- `subtitle`, `colorHex`, `aesthetics`, `fallbackIcon` are still in the props interface for API back-compat but unused in the rendered output (meta line is `colorName` or `FORMALITY_LABELS[formality]` only). This avoids breaking the consumers in `closet/page.tsx`, `style/components/*`, `TryOnModal.tsx`.
- `Shirt` import and the `imageArea` variable are gone — clean up `Shirt` from the `import` statement at the top of `Card.tsx` only if no other function in the file references it.

- [ ] **Step 3: Clean up unused `Shirt` import**

Search `frontend/src/components/ui/Card.tsx` for `Shirt`. After the rewrite, only `Package` and `Sparkles` should still be used (in `OutfitCard`'s placeholder area and `RecommendationCard`). If `Shirt` no longer appears in the file body, remove it from the `import` line:

Change:
```tsx
import { Shirt, Package, Sparkles } from 'lucide-react'
```
to:
```tsx
import { Package, Sparkles } from 'lucide-react'
```

- [ ] **Step 4: Lint + typecheck**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: zero errors. If lint flags `Sparkles` as unused, leave it — Task 3 also removes it after rewriting `OutfitCard`.

- [ ] **Step 5: Boot dev server and smoke-test ItemCard consumers**

Run: `cd frontend && npm run dev`
Open in a browser:
- `http://localhost:3000/closet` (logged in) — `ItemCard` instances render with the new 4:5 paper frames. May look odd against the still-dark closet layout — expected.
- `http://localhost:3000/style` — start the style flow. `AddItemPanel` and `TryOnModal` use `ItemCard`. Confirm no console errors and the cards render (visual mismatch with surrounding dark UI is expected and out of scope).

Stop the dev server (Ctrl-C) before committing.

- [ ] **Step 6: Commit**

```
git add frontend/src/components/ui/Card.tsx
git commit -m "feat(redesign): rewrite ItemCard to editorial product card"
```

---

## Task 3: Rewrite `OutfitCard` to match `.product`

**Why:** Same reasons as `ItemCard` — current implementation uses dark-theme classes and a gradient hover overlay. New version is a single editorially-framed thumbnail with item-count cap and serif name + mono date below. Single-thumbnail divergence from redline documented in spec §9.

**Files:**
- Modify: `frontend/src/components/ui/Card.tsx` lines 202–269 (`OutfitCard` block).

- [ ] **Step 1: Read the current `OutfitCard` to confirm location**

Run: `Read frontend/src/components/ui/Card.tsx` starting at line ~200.
Expected: `interface OutfitCardProps` defined at ~202, `OutfitCard` function ends around line 269 with the trailing `}` before `interface RecommendationCardProps {`.

- [ ] **Step 2: Replace the `OutfitCard` block**

Replace the entire block from `interface OutfitCardProps {` through the closing `}` of `OutfitCard`. The new code:

```tsx
interface OutfitCardProps {
  name: string
  createdAt?: string
  thumbnailUrl?: string | null
  itemCount: number
  onClick?: () => void
  className?: string
  index?: string
}

export function OutfitCard({
  name,
  createdAt,
  thumbnailUrl,
  itemCount,
  onClick,
  className,
  index,
}: OutfitCardProps) {
  const frame = (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden bg-paper-2',
        !thumbnailUrl && 'product__frame--placeholder',
      )}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`${name} preview`}
          className="h-full w-full object-cover"
        />
      ) : null}

      {index && (
        <span className="absolute top-3 left-3 font-mono text-[11px] uppercase tracking-[0.04em] text-ink">
          {index}
        </span>
      )}

      <span className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
        {itemCount} {itemCount === 1 ? 'piece' : 'pieces'}
      </span>
    </div>
  )

  const meta = (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-display text-[18px] leading-tight text-ink">
        {name}
      </span>
      {createdAt && (
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          {createdAt}
        </span>
      )}
    </div>
  )

  const containerClasses = cn(
    'group flex flex-col gap-3 text-left w-full',
    onClick && 'cursor-pointer',
    'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
    className,
  )

  if (!onClick) {
    return (
      <article className={containerClasses}>
        {frame}
        {meta}
      </article>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={containerClasses}
      aria-label={`Open outfit details for ${name}`}
    >
      {frame}
      {meta}
    </button>
  )
}
```

- [ ] **Step 3: Clean up unused `Package` and `Sparkles` imports**

After Task 2 and Task 3, `Card.tsx` no longer renders `Package` or `Sparkles` in `ItemCard` or `OutfitCard`. Check whether `RecommendationCard` still uses them (search the file). `RecommendationCard` does not use either. Remove from the import:

Change:
```tsx
import { Package, Sparkles } from 'lucide-react'
```
to: delete the line entirely (no lucide-react imports remain in this file).

- [ ] **Step 4: Lint + typecheck**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Browser smoke-test**

Run: `cd frontend && npm run dev`
Open `http://localhost:3000/closet` (logged in), click the "Outfits" tab. `OutfitCard` should render with paper-2 frame and serif name. No console errors.

Stop the dev server.

- [ ] **Step 6: Commit**

```
git add frontend/src/components/ui/Card.tsx
git commit -m "feat(redesign): rewrite OutfitCard to editorial product card"
```

---

## Task 4: Update `NavBar` for editorial masthead

**Why:** Current `NavBar` shows `Home / Login` (logged-out) or `Home / My Closet / Account / Logout` (logged-in). The redline calls for `LOG IN  ENTER →` (logged-out) and on app pages, just functional links (`Closet / Account / Log out` for logged-in, no "Home" — the wordmark covers home). Adds an `Enter →` link for logged-out users that routes to `/style`.

**Files:**
- Modify: `frontend/src/components/NavBar.tsx` — full file rewrite (it's tiny).

- [ ] **Step 1: Read `NavBar.tsx`**

Run: `Read frontend/src/components/NavBar.tsx`
Expected: Client component using `useAuth` and `usePathname`. Renders `Link`s and an `onOpenAuth` button.

- [ ] **Step 2: Replace the file contents**

Overwrite `frontend/src/components/NavBar.tsx` with:

```tsx
'use client'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { usePathname } from 'next/navigation'

interface NavBarProps {
  onOpenAuth: () => void
}

export default function NavBar({ onOpenAuth }: NavBarProps) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const baseLink =
    'font-mono text-[11px] uppercase tracking-[0.08em] transition-colors'
  const activeLink = 'text-ink border-b border-ink pb-[2px]'
  const inactiveLink = 'text-ink-3 hover:text-ink'

  const linkClass = (path: string) =>
    `${baseLink} ${pathname === path ? activeLink : inactiveLink}`

  if (!user) {
    return (
      <nav className="flex items-center gap-[32px]">
        <button onClick={onOpenAuth} className={`${baseLink} ${inactiveLink}`}>
          Log in
        </button>
        <Link href="/style" className={`${baseLink} text-ink`}>
          Enter →
        </Link>
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-[32px]">
      <Link href="/closet" className={linkClass('/closet')}>
        Closet
      </Link>
      <Link href="/account" className={linkClass('/account')}>
        Account
      </Link>
      <button
        onClick={signOut}
        className={`${baseLink} text-ink-3 hover:text-accent`}
      >
        Log out
      </button>
    </nav>
  )
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Browser smoke-test**

Run: `cd frontend && npm run dev`
- Open `http://localhost:3000/` while logged out — masthead reads `Log in  Enter →`. Click `Log in` → AuthModal opens. Close it. Click `Enter →` → routes to `/style`.
- Log in via `Log in`, then return to `/` — masthead reads `Closet  Account  Log out`.
- Click `Closet` → routes to `/closet` and `Closet` link gets the underline. Click `Account` → routes to `/account`.

Stop the dev server.

- [ ] **Step 5: Commit**

```
git add frontend/src/components/NavBar.tsx
git commit -m "feat(redesign): rewrite NavBar to editorial masthead links"
```

---

## Task 5: Rewrite `closet/page.tsx`

**Why:** Full layout rewrite from dark-theme inventory grid to editorial wardrobe ledger. Preserves all state, API calls, modal handlers, and filtering logic. Adds 5-cell ledger, mono filterbar, sectioned category grid with add-slot, month-grouped outfits view.

**Files:**
- Modify: `frontend/src/app/closet/page.tsx` — full file rewrite.

- [ ] **Step 1: Read the current closet page to confirm the consumer surface**

Run: `Read frontend/src/app/closet/page.tsx`
Expected: Confirms imports (`getCloset`, `deleteClothingItem`, `deleteOutfit`, `useAuth`, `ProtectedRoute`, modals, `ItemCard`, `OutfitCard`, `StatusBadge`, `Button`, `CardSkeleton`), state shape, and modal-opening pattern.

- [ ] **Step 2: Replace the file contents**

Overwrite `frontend/src/app/closet/page.tsx` with:

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getCloset, deleteClothingItem, deleteOutfit } from '@/lib/api'
import { dominantHueName } from '@/lib/colorUtils'
import { cn } from '@/lib/cn'
import type {
  ClosetResponse,
  ClothingItemResponse,
  OutfitSummary,
} from '@/types'
import {
  Button,
  CardSkeleton,
  ItemCard,
  OutfitCard,
  StatusBadge,
} from '@/components/ui'
import ItemDetailModal from './components/ItemDetailModal'
import OutfitDetailModal from './components/OutfitDetailModal'
import TryOnModal from '@/app/style/components/TryOnModal'

type ViewMode = 'items' | 'outfits'
type FilterMode = 'category' | 'show'
type OwnershipFilter = 'all' | 'owned' | 'wishlist'

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories']

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

const formatMonthDay = (date: Date) =>
  date
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()

const daysAgo = (date: Date) => {
  const ms = Date.now() - date.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export default function ClosetPage() {
  const { session } = useAuth()
  const [closetData, setClosetData] = useState<ClosetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeView, setActiveView] = useState<ViewMode>('items')
  const [activeFilter, setActiveFilter] = useState<FilterMode>('category')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all')

  const [selectedItem, setSelectedItem] =
    useState<ClothingItemResponse | null>(null)
  const [tryOnItem, setTryOnItem] = useState<ClothingItemResponse | null>(null)
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitSummary | null>(
    null,
  )

  const fetchCloset = async () => {
    if (!session?.access_token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCloset(session.access_token)
      setClosetData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load closet')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCloset()
  }, [session?.access_token])

  const handleDeleteItem = async (itemId: string) => {
    if (!session?.access_token) return
    await deleteClothingItem(itemId, session.access_token)
    await fetchCloset()
  }

  const handleDeleteOutfit = async (outfitId: string) => {
    if (!session?.access_token) return
    await deleteOutfit(outfitId, session.access_token)
    await fetchCloset()
  }

  const allItems = useMemo<ClothingItemResponse[]>(
    () =>
      closetData ? Object.values(closetData.items_by_category).flat() : [],
    [closetData],
  )

  const categoriesPresent = useMemo<string[]>(
    () => (closetData ? Object.keys(closetData.items_by_category) : []),
    [closetData],
  )

  const sortedCategories = useMemo<string[]>(() => {
    const present = new Set(categoriesPresent)
    return [
      ...CATEGORY_ORDER.filter((c) => present.has(c)),
      ...categoriesPresent
        .filter((c) => !CATEGORY_ORDER.includes(c))
        .sort(),
    ]
  }, [categoriesPresent])

  const ledger = useMemo(() => {
    const empty = {
      pieces: { primary: '—', secondary: '—' },
      outfits: { primary: '—', secondary: '—' },
      categories: { primary: '—', secondary: '—' },
      dominantHue: {
        primary: '—',
        secondary: '—',
        swatch: null as string | null,
      },
      lastAdded: { primary: '—', secondary: '—' },
      established: null as string | null,
    }
    if (!closetData || closetData.total_items === 0) return empty

    const totalCategories = categoriesPresent.length
    const mostCommonCategory =
      categoriesPresent
        .map((c) => ({
          c,
          n: (closetData.items_by_category[c] ?? []).length,
        }))
        .sort((a, b) => b.n - a.n)[0]?.c ?? '—'

    const hue = dominantHueName(allItems.map((i) => ({ color: i.color })))

    const sortedByDate = allItems
      .map((i) => new Date(i.created_at))
      .sort((a, b) => b.getTime() - a.getTime())
    const lastItem = sortedByDate[0]
    const firstItem = sortedByDate[sortedByDate.length - 1]

    return {
      pieces: {
        primary: pad2(closetData.total_items),
        secondary: `${totalCategories} ${
          totalCategories === 1 ? 'category' : 'categories'
        }`,
      },
      outfits: {
        primary: pad2(closetData.total_outfits),
        secondary: 'saved',
      },
      categories: {
        primary: pad2(totalCategories),
        secondary: mostCommonCategory.toLowerCase(),
      },
      dominantHue: {
        primary: hue.name.toUpperCase(),
        secondary: hue.hex.toUpperCase(),
        swatch: hue.hex as string | null,
      },
      lastAdded: {
        primary: formatMonthDay(lastItem),
        secondary: `${daysAgo(lastItem)}d ago`,
      },
      established: formatMonthYear(firstItem),
    }
  }, [closetData, allItems, categoriesPresent])

  const filterItems = (items: ClothingItemResponse[]) =>
    [...items]
      .filter((i) => ownershipFilter === 'all' || i.ownership === ownershipFilter)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

  const outfitsByMonth = useMemo(() => {
    if (!closetData)
      return [] as Array<{
        key: string
        label: string
        outfits: OutfitSummary[]
      }>
    const groups = new Map<string, OutfitSummary[]>()
    for (const o of closetData.outfits) {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
      const list = groups.get(key) ?? []
      list.push(o)
      groups.set(key, list)
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, outfits]) => {
        const sample = new Date(outfits[0].created_at)
        return {
          key,
          label: formatMonthYear(sample).toUpperCase(),
          outfits: outfits.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        }
      })
  }, [closetData])

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-[1440px] px-[var(--gutter)] py-12 text-ink">
        {/* HERO */}
        <section className="mb-10">
          <h1 className="t-display-l">Your closet.</h1>
          <p className="t-body-l text-ink-2 mt-3">
            {closetData && closetData.total_items > 0 && ledger.established
              ? `${closetData.total_items} ${
                  closetData.total_items === 1 ? 'piece' : 'pieces'
                }. Established ${ledger.established}.`
              : 'Empty closet. Add your first piece below.'}
          </p>
        </section>

        <hr className="border-t border-ink" />

        {/* LEDGER */}
        <section className="grid grid-cols-5 max-md:grid-cols-2 py-6 mb-8">
          {[
            { label: 'PIECES', ...ledger.pieces, swatch: null as string | null },
            { label: 'OUTFITS', ...ledger.outfits, swatch: null as string | null },
            {
              label: 'CATEGORIES',
              ...ledger.categories,
              swatch: null as string | null,
            },
            { label: 'DOMINANT HUE', ...ledger.dominantHue },
            {
              label: 'LAST ADDED',
              ...ledger.lastAdded,
              swatch: null as string | null,
            },
          ].map((cell, i) => (
            <div
              key={cell.label}
              className={cn(
                'flex flex-col gap-2 px-6',
                i !== 0 && 'border-l border-ink max-md:border-l-0',
                'max-md:py-3',
              )}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
                {cell.label}
              </span>
              <div className="flex items-center gap-2">
                {cell.swatch && (
                  <span
                    className="inline-block w-[14px] h-[14px] border border-ink"
                    style={{ backgroundColor: cell.swatch }}
                    aria-hidden="true"
                  />
                )}
                <span className="t-display-s">{cell.primary}</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                {cell.secondary}
              </span>
            </div>
          ))}
        </section>

        <hr className="border-t border-ink" />

        {/* TABS + FILTERBAR */}
        <section className="py-6">
          <div className="flex items-center gap-8 mb-6">
            <button
              type="button"
              onClick={() => setActiveView('items')}
              className={cn(
                'font-mono text-[11px] uppercase tracking-[0.08em] pb-1',
                activeView === 'items'
                  ? 'text-ink border-b-2 border-ink'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Pieces
            </button>
            <button
              type="button"
              onClick={() => setActiveView('outfits')}
              className={cn(
                'font-mono text-[11px] uppercase tracking-[0.08em] pb-1',
                activeView === 'outfits'
                  ? 'text-ink border-b-2 border-ink'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Outfits
            </button>
          </div>

          {activeView === 'items' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.04em]">
                <span className="text-ink-3">Filter</span>
                <span className="text-ink-3">·</span>
                <button
                  type="button"
                  onClick={() => setActiveFilter('category')}
                  className={cn(
                    'pb-[2px]',
                    activeFilter === 'category'
                      ? 'text-ink border-b border-ink'
                      : 'text-ink-3 hover:text-ink',
                  )}
                >
                  Category
                </button>
                <span className="text-ink-3">·</span>
                <button
                  type="button"
                  onClick={() => setActiveFilter('show')}
                  className={cn(
                    'pb-[2px]',
                    activeFilter === 'show'
                      ? 'text-ink border-b border-ink'
                      : 'text-ink-3 hover:text-ink',
                  )}
                >
                  Show
                </button>
              </div>

              {activeFilter === 'category' && (
                <div className="flex flex-wrap gap-2">
                  {(['All', ...sortedCategories] as string[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        'border border-ink px-[10px] py-[6px]',
                        'font-mono text-[10px] uppercase tracking-[0.08em]',
                        categoryFilter === cat
                          ? 'bg-ink text-paper'
                          : 'bg-transparent text-ink hover:bg-ink hover:text-paper',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {activeFilter === 'show' && (
                <div className="flex flex-wrap gap-2">
                  {(['all', 'owned', 'wishlist'] as OwnershipFilter[]).map(
                    (opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOwnershipFilter(opt)}
                        className={cn(
                          'border border-ink px-[10px] py-[6px]',
                          'font-mono text-[10px] uppercase tracking-[0.08em]',
                          ownershipFilter === opt
                            ? 'bg-ink text-paper'
                            : 'bg-transparent text-ink hover:bg-ink hover:text-paper',
                        )}
                      >
                        {opt === 'all'
                          ? 'All'
                          : opt === 'owned'
                          ? 'Owned'
                          : 'Wishlist'}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* CONTENT */}
        {isLoading && (
          <section aria-live="polite" aria-busy="true" className="space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
              Loading closet…
            </p>
            <div className="grid grid-cols-6 gap-[var(--col-gap)] max-md:grid-cols-3">
              <CardSkeleton count={6} />
            </div>
          </section>
        )}

        {error && !isLoading && (
          <section className="py-16 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-accent mb-4">
              Failed to load closet
            </p>
            <p className="t-body text-ink-2 mb-6">{error}</p>
            <Button onClick={fetchCloset}>Try again</Button>
          </section>
        )}

        {!isLoading && !error && closetData && activeView === 'items' && (
          <ItemsView
            closetData={closetData}
            sortedCategories={sortedCategories}
            categoryFilter={categoryFilter}
            filterItems={filterItems}
            onItemClick={(item) => {
              setTryOnItem(null)
              setSelectedItem(item)
            }}
            onTryOn={(item) => {
              setSelectedItem(null)
              setTryOnItem(item)
            }}
          />
        )}

        {!isLoading && !error && closetData && activeView === 'outfits' && (
          <OutfitsView
            outfitsByMonth={outfitsByMonth}
            onOutfitClick={setSelectedOutfit}
          />
        )}

        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={handleDeleteItem}
          />
        )}

        {selectedOutfit && session?.access_token && (
          <OutfitDetailModal
            outfit={selectedOutfit}
            token={session.access_token}
            onClose={() => setSelectedOutfit(null)}
            onDelete={handleDeleteOutfit}
          />
        )}

        {tryOnItem && session?.access_token && (
          <TryOnModal
            item={tryOnItem}
            itemImageUrl={tryOnItem.image_url}
            token={session.access_token}
            onClose={() => setTryOnItem(null)}
          />
        )}
      </main>
    </ProtectedRoute>
  )
}

interface ItemsViewProps {
  closetData: ClosetResponse
  sortedCategories: string[]
  categoryFilter: string
  filterItems: (items: ClothingItemResponse[]) => ClothingItemResponse[]
  onItemClick: (item: ClothingItemResponse) => void
  onTryOn: (item: ClothingItemResponse) => void
}

function ItemsView({
  closetData,
  sortedCategories,
  categoryFilter,
  filterItems,
  onItemClick,
  onTryOn,
}: ItemsViewProps) {
  if (closetData.total_items === 0) {
    return (
      <section className="py-16 text-center">
        <p className="font-display text-[28px] leading-snug">Empty closet.</p>
        <p className="t-body text-ink-2 mt-3">Add your first piece below.</p>
      </section>
    )
  }

  const visibleCategories =
    categoryFilter === 'All'
      ? sortedCategories
      : sortedCategories.filter((c) => c === categoryFilter)

  return (
    <div>
      {visibleCategories.map((category) => {
        const allInCategory = closetData.items_by_category[category] ?? []
        const filtered = filterItems(allInCategory)
        if (filtered.length === 0 && allInCategory.length === 0) return null
        return (
          <section key={category} className="mb-12">
            <hr className="border-t border-rule-soft" />
            <header className="font-mono text-[11px] uppercase tracking-[0.04em] mt-6 mb-6">
              {category} · {pad2(filtered.length)}{' '}
              {filtered.length === 1 ? 'piece' : 'pieces'}
            </header>
            <div className="grid grid-cols-6 gap-[var(--col-gap)] max-md:grid-cols-3">
              {filtered.map((item, i) => (
                <ItemCard
                  key={item.id}
                  index={pad2(i + 1)}
                  title={item.category.l2}
                  imageUrl={item.image_url}
                  imageAlt={item.category.l2}
                  colorName={item.color?.name}
                  formality={item.formality}
                  onClick={() => onItemClick(item)}
                  onTryOn={() => onTryOn(item)}
                  badge={
                    item.ownership === 'wishlist' ? (
                      <StatusBadge status="wishlist" size="sm" />
                    ) : undefined
                  }
                />
              ))}
              <AddSlot />
            </div>
          </section>
        )
      })}
    </div>
  )
}

function AddSlot() {
  return (
    <Link
      href="/style"
      className="group flex flex-col gap-3"
      aria-label="Add a new piece"
    >
      <div className="relative aspect-[4/5] border border-dashed border-ink flex items-center justify-center transition-colors group-hover:bg-paper-2">
        <span className="font-mono text-[24px] text-ink leading-none">+</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[18px] leading-tight text-ink-2">
          Add piece
        </span>
      </div>
    </Link>
  )
}

interface OutfitsViewProps {
  outfitsByMonth: Array<{
    key: string
    label: string
    outfits: OutfitSummary[]
  }>
  onOutfitClick: (outfit: OutfitSummary) => void
}

function OutfitsView({ outfitsByMonth, onOutfitClick }: OutfitsViewProps) {
  if (outfitsByMonth.length === 0) {
    return (
      <section className="py-16 text-center">
        <p className="font-display text-[28px] leading-snug">
          No outfits saved yet.
        </p>
        <p className="t-body text-ink-2 mt-3">
          Build your first outfit to save it here.
        </p>
      </section>
    )
  }

  return (
    <div>
      {outfitsByMonth.map((group) => (
        <section key={group.key} className="mb-12">
          <hr className="border-t border-rule-soft" />
          <header className="font-mono text-[11px] uppercase tracking-[0.04em] mt-6 mb-6">
            {group.label} · {pad2(group.outfits.length)}{' '}
            {group.outfits.length === 1 ? 'look' : 'looks'}
          </header>
          <div className="grid grid-cols-6 gap-[var(--col-gap)] max-md:grid-cols-3">
            {group.outfits.map((outfit, i) => (
              <OutfitCard
                key={outfit.id}
                index={pad2(i + 1)}
                name={outfit.name}
                createdAt={new Date(outfit.created_at)
                  .toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                  .toUpperCase()}
                thumbnailUrl={outfit.thumbnail_url}
                itemCount={outfit.item_count}
                onClick={() => onOutfitClick(outfit)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: zero errors.

Common issues to expect:
- If `Link` is flagged as unused — confirm `AddSlot` references it.
- If `cn` is flagged as unused — confirm it's used in the ledger / filterbar `className={cn(...)}` blocks.

- [ ] **Step 4: Browser smoke-test — populated closet**

Run: `cd frontend && npm run dev`
- Open `http://localhost:3000/closet` (logged-in with items).
- Verify:
  - Hero shows `Your closet.` (serif) with `N pieces. Established {Month YYYY}.` subline.
  - 5-cell ledger renders with derived values (no `—` placeholders since closet is populated).
  - Tabs `Pieces` / `Outfits` toggle. Active tab has 2px underline.
  - Filterbar shows `Filter · Category · Show`. Clicking `Show` reveals the All/Owned/Wishlist chip row; clicking `Category` reverts to category chips.
  - Category sections render in canonical order (Tops, Bottoms, Outerwear, Shoes, Accessories) with `rule-soft` dividers and `CATEGORY · NN PIECES` headers.
  - Each section ends with the dashed `Add piece` slot.
  - Item cards have indexed top-left, wishlist badge (oxblood) bottom-right if applicable, serif name + mono color name below.
  - Click an item → `ItemDetailModal` opens. Close it.
  - Hover an item → `Try on` button fades in (no scale/transform). Click it → `TryOnModal` opens.
- Open the `Outfits` tab. Outfits group by month with `APRIL 2025 · 04 LOOKS` style headers. Click an outfit → `OutfitDetailModal` opens.
- Resize browser to ~375px wide:
  - Ledger collapses to 2 columns.
  - Item grid collapses to 3 columns.
  - Section headers and filterbar remain readable.
- Browser console: no errors.

- [ ] **Step 5: Browser smoke-test — empty closet (optional)**

If a test user with zero items exists or one can be created quickly: log in as that user, navigate to `/closet`:
- Hero copy reads `Empty closet. Add your first piece below.`.
- Ledger cells all show `—`.
- ItemsView shows the `Empty closet.` centered message.

If creating an empty user is friction, skip this step and rely on code-reading the empty branches.

- [ ] **Step 6: Browser smoke-test — `/style` consumers still work**

Navigate to `http://localhost:3000/style`. Walk through the upload flow far enough to see `AddItemPanel` and any `ItemCard` usage. They will render with the editorial card on top of a dark page — visual mismatch is expected and out of scope. Confirm no console errors and the flow still progresses.

Stop the dev server.

- [ ] **Step 7: Commit**

```
git add frontend/src/app/closet/page.tsx
git commit -m "feat(redesign): rewrite Closet page as editorial layout"
```

---

## Task 6: Rewrite `app/page.tsx` (landing)

**Why:** Strip dark theme, drag-drop upload zone, and "Create Account" CTA. Land the editorial minimalist landing: hero (4-line serif), two CTAs, three hairline-divided steps, mono colophon.

**Files:**
- Modify: `frontend/src/app/page.tsx` — full file rewrite.

- [ ] **Step 1: Read the current landing to confirm consumer surface**

Run: `Read frontend/src/app/page.tsx`
Expected: Client component using `useAuth`, `useRouter`, `useState` (for `AuthModal` open state), and `useRef` (for file input). Imports `AuthModal`, `useStyleStore`'s `setPendingUpload`, lucide icons.

- [ ] **Step 2: Replace the file contents**

Overwrite `frontend/src/app/page.tsx` with:

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui'

const STEPS = [
  {
    num: '01',
    label: 'Upload',
    title: 'Photos of\nyour closet.',
    body: 'Snap or import a photo of each piece.',
  },
  {
    num: '02',
    label: 'Describe',
    title: 'Tags & color\npalette.',
    body: 'Add formality, aesthetic, and the colors we read.',
  },
  {
    num: '03',
    label: 'Outfit',
    title: 'Daily looks\non demand.',
    body: 'Get outfit recommendations from what you already own.',
  },
]

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()

  const handleStartStyling = () => {
    router.push(user ? '/closet' : '/style')
  }

  const scrollToSteps = () => {
    document
      .getElementById('steps')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col text-ink">
      {/* HERO */}
      <section className="px-[var(--gutter)] py-[var(--section-pad-y)] max-w-[1440px] w-full mx-auto">
        <h1 className="t-display-xl">
          An outfit<br />
          generator for<br />
          clothes you<br />
          already own.
        </h1>
        <div className="flex flex-wrap gap-6 mt-12">
          <Button onClick={handleStartStyling}>Start styling</Button>
          <Button variant="secondary" onClick={scrollToSteps}>
            How it works
          </Button>
        </div>
      </section>

      <hr className="border-t border-ink" />

      {/* STEPS */}
      <section
        id="steps"
        className="px-[var(--gutter)] py-16 max-w-[1440px] w-full mx-auto grid grid-cols-3 gap-[var(--col-gap)] max-md:grid-cols-1"
      >
        {STEPS.map((step) => (
          <article
            key={step.num}
            className="pt-8 border-t border-ink"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
              {step.num} / {step.label}
            </span>
            <h3 className="t-display-s mt-6 whitespace-pre-line">
              {step.title}
            </h3>
            <p className="t-body text-ink-2 mt-4">{step.body}</p>
          </article>
        ))}
      </section>

      <hr className="border-t border-ink" />

      {/* COLOPHON */}
      <footer className="px-[var(--gutter)] py-8 max-w-[1440px] w-full mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
          Style It Yourself · 2025 ·{' '}
          <Link
            href="mailto:hello@styleityourself.app"
            className="hover:text-ink"
          >
            Contact
          </Link>
        </p>
      </footer>
    </div>
  )
}
```

Notes:
- `AuthModal` is no longer imported here — it's mounted by the global `<Header />` (`frontend/src/components/Headers.tsx`), which is rendered for every page from `layout.tsx`. The masthead's `Log in` button there opens the modal.
- `setPendingUpload`, `useStyleStore`, file-input refs, drag/drop handlers, lucide-react imports — all removed. These pieces of state still exist in the store for future re-use; we just no longer trigger them from landing.
- `mailto:hello@styleityourself.app` is a placeholder. If a real support email is preferred, swap it before merging.

- [ ] **Step 3: Lint + typecheck**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Browser smoke-test — landing, logged-out**

Run: `cd frontend && npm run dev`
- Open `http://localhost:3000/` while logged-out (use an incognito tab if needed).
- Verify:
  - Headline reads `An outfit / generator for / clothes you / already own.` on four serif lines (Instrument Serif).
  - Two CTAs side-by-side: filled `Start styling` (ink-on-paper) + outlined `How it works`.
  - Click `How it works` → page smoothly scrolls down to the steps section.
  - Three hairline-divided columns: `01 / Upload`, `02 / Describe`, `03 / Outfit`. Each has the serif title on two lines and a body line.
  - Footer: `Style It Yourself · 2025 · Contact`.
  - Masthead shows `Log in  Enter →`.
  - Click `Start styling` → routes to `/style`.
  - Browser back, click `Log in` (masthead) → `AuthModal` opens. Close it.
  - No upload zone visible. No drag-drop affordance. No console errors.

- [ ] **Step 5: Browser smoke-test — landing, logged-in**

Log in (sign up or sign in via the masthead's `Log in`). Return to `/`:
- Masthead now shows `Closet  Account  Log out`.
- Click `Start styling` → routes to `/closet` (since user is logged-in).
- Browser back. Click `How it works` → still scrolls to steps.

- [ ] **Step 6: Resize check**

Resize the browser to ~375px wide:
- Hero headline remains a 4-line serif (font-size clamps down via `--t-display-xl`).
- CTAs wrap if needed (Tailwind's `flex-wrap`).
- Steps stack vertically into one column, each still hairline-divided.
- Colophon remains on one line or wraps gracefully.

Stop the dev server.

- [ ] **Step 7: Commit**

```
git add frontend/src/app/page.tsx
git commit -m "feat(redesign): rewrite Landing page as editorial minimalist"
```

---

## Task 7: Scoped forbidden-pattern sweep (touched files only)

**Why:** Phase 6 in the migration plan does a full-repo sweep. For this PR, we only verify that the files we *touched* are clean. Anything else (style flow, account, modals) is explicitly out-of-scope.

**Files to check (all should now be clean):**
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/NavBar.tsx`
- `frontend/src/app/closet/page.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/lib/colorUtils.ts`

- [ ] **Step 1: Grep for forbidden patterns**

Run these greps. Each should return **zero matches** in the listed files. (Use the `Grep` tool, not raw `rg`/`grep`.)

For each pattern, grep with path filter:

| Pattern | Grep call |
|---|---|
| Large radius | `Grep(pattern: "rounded-(md\|lg\|xl\|2xl)", path: "frontend/src", glob: "{components/ui/Card.tsx,components/NavBar.tsx,app/closet/page.tsx,app/page.tsx,lib/colorUtils.ts}")` |
| Shadows | `Grep(pattern: "shadow-", path: "frontend/src", glob: "{components/ui/Card.tsx,components/NavBar.tsx,app/closet/page.tsx,app/page.tsx,lib/colorUtils.ts}")` |
| Backdrop blur | `Grep(pattern: "backdrop-blur", path: "frontend/src", glob: "{components/ui/Card.tsx,components/NavBar.tsx,app/closet/page.tsx,app/page.tsx}")` |
| Gradients | `Grep(pattern: "bg-gradient-", path: "frontend/src", glob: "{components/ui/Card.tsx,components/NavBar.tsx,app/closet/page.tsx,app/page.tsx}")` |
| Dark-theme leftovers | `Grep(pattern: "text-white\|bg-primary-\|text-accent-500\|border-accent-500", path: "frontend/src", glob: "{components/ui/Card.tsx,components/NavBar.tsx,app/closet/page.tsx,app/page.tsx}")` |

Expected for every grep: **0 matches**.

- [ ] **Step 2: If any pattern matches, fix it inline**

For each match:
- `rounded-{md|lg|xl|2xl}` → remove the class. The editorial system uses square corners.
- `shadow-*` → remove. Use hairlines instead.
- `backdrop-blur` → remove. Solid `--paper` backgrounds only.
- `bg-gradient-*` → remove. Replace with solid token (likely `bg-paper` or `bg-ink`).
- `text-white` → `text-paper` if on dark surface, otherwise `text-ink` on paper.
- `bg-primary-*` → `bg-paper-2` or `bg-ink` based on context.
- `text-accent-500` / `border-accent-500` → `text-accent` / `border-accent` (the new editorial accent token).

Re-run the grep until clean.

- [ ] **Step 3: Final lint + typecheck**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Final full-flow browser verification**

Run: `cd frontend && npm run dev`. Do one full pass through the goldens:
1. Open `/` logged-out. Hero, CTAs, steps, footer, masthead all editorial.
2. Click `Start styling` → `/style` loads. (Style flow visuals will be old/dark — expected and out of scope.)
3. Navigate back to `/`. Click `Log in` → AuthModal opens. Authenticate.
4. After auth, navigate to `/closet`. Hero, ledger, tabs, filterbar, sectioned grid render correctly.
5. Click an item → modal opens. Close.
6. Hover, click `Try on` → TryOnModal opens. Close.
7. Click `Outfits` tab. Click an outfit → modal opens. Close.
8. Resize to 375px and re-verify both screens collapse.
9. Browser console: no errors at any step.

Stop the dev server.

- [ ] **Step 5: Commit (only if Step 2 made changes; otherwise skip)**

If Step 2 produced any edits:
```
git add frontend/src/components/ui/Card.tsx frontend/src/components/NavBar.tsx frontend/src/app/closet/page.tsx frontend/src/app/page.tsx frontend/src/lib/colorUtils.ts
git commit -m "chore(redesign): scrub stray dark-theme classes in touched files"
```

If no edits were needed, this task ends without a new commit.

---

## Final PR

After Task 7 completes:

- [ ] **Confirm commit history**

Run: `git log --oneline -10`
Expected to see (in reverse chronological order):
1. (optional) `chore(redesign): scrub stray dark-theme classes in touched files`
2. `feat(redesign): rewrite Landing page as editorial minimalist`
3. `feat(redesign): rewrite Closet page as editorial layout`
4. `feat(redesign): rewrite NavBar to editorial masthead links`
5. `feat(redesign): rewrite OutfitCard to editorial product card`
6. `feat(redesign): rewrite ItemCard to editorial product card`
7. `feat(redesign): add dominantHueName helper for closet ledger`
8. `docs(redesign): add closet+landing redesign design spec`
9. Phase 1 primitive commits (already present on branch)

- [ ] **Hand control back to the user for PR creation**

Do not push or open a PR autonomously. Ask the user whether they want to:
- Push the branch and open a PR (with the suggested title and body below).
- Review locally first.

Suggested PR title: `feat(redesign): editorial rewrite of Closet + Landing (Phases 2 & 5)`

Suggested PR body (filled in based on actual implementation):

```
## Summary
Editorial visual rewrite of `/` (landing) and `/closet`. Compresses migration-plan
Phases 2 and 5 into one PR. Other phases deferred.

- Rewrote `ItemCard` + `OutfitCard` to the `.product` editorial spec.
- Updated `NavBar` to the editorial masthead pattern (`Log in / Enter →` for
  logged-out, `Closet / Account / Log out` for logged-in).
- Rewrote `Closet` page: hero, 5-cell ledger, mono filterbar, sectioned category
  grid with add-slot, month-grouped outfits view.
- Rewrote `Landing` page: 4-line serif hero, two CTAs, three hairline-divided
  steps, mono colophon. Removed drag-drop upload zone and Create-Account gate.
- Added `dominantHueName` helper in `colorUtils.ts` for the ledger.

## Documented divergences from the redline
- Closet ledger: `Avg. Cohesion` → `Categories` (data model doesn't store cohesion).
- OutfitCard: single thumbnail in 4:5 frame instead of 2×2 grid (data model only
  carries one thumbnail; backend change out of scope).
- Closet filterbar: `Filter · Category · Show` only (Season/Color filters deferred —
  no underlying state).
- Landing CTA: `Start styling` routes directly into `/style` for logged-out users,
  replacing the previous Create-Account auth gate.

## Out of scope
- `/style/*` screens, `/account`, outfit builder (deferred to later PRs).
- Visual updates to `ItemDetailModal`, `OutfitDetailModal`, `TryOnModal`,
  `AddItemPanel` (they consume the new card primitive but their surrounding UI
  is still dark; expected mid-redesign state).
- Full-repo forbidden-pattern sweep (Phase 6).

## How to verify
- `cd frontend && npm run lint && npx tsc --noEmit && npm run dev`
- Open `/` logged-out → editorial landing, masthead `Log in  Enter →`.
- Click `Start styling` → `/style` (auth not required).
- Authenticate via the masthead `Log in`.
- Open `/closet` → editorial wardrobe layout with ledger, sectioned grid, modals.
- Resize to 375px → both screens collapse cleanly.

## Screenshots
[Attach screenshots of landing + closet at desktop and mobile collapse, side by
side with `reference/artboards/landing-minimalist.html` and
`reference/artboards/06-closet.html`.]
```
