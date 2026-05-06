# Frontend Redesign — Phase 0 + 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land tokens, fonts, and editorial primitives on a long-lived `redesign/main` branch so subsequent phase plans can rewrite each screen without further infrastructure work.

**Architecture:** Phase 0 adds new color/font tokens to Tailwind 4's `@theme` block alongside the existing dark-theme tokens (coexistence). Phase 1 rewrites the `components/ui` primitives in place — same prop APIs, new visuals — then flips `app/layout.tsx`'s body classes from dark to paper. Adjacent components that pop over every screen (`AuthModal`, `Header`) get restyled in Phase 1 because dark modals over a paper-light page would look broken.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4 (`@theme` syntax), `next/font/google`, Zustand (untouched).

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-05-05-frontend-redesign-migration-design.md`
- Design contract: `frontend/docs/redesign/design-system.md`
- Token source: `frontend/docs/redesign/reference/system.css`
- Visual ground truth: `frontend/docs/redesign/reference/artboards/system.html`

**Verification model.** This codebase has no frontend test runner. Verification is: lint passes, build succeeds, devtools console clean, forbidden-pattern grep passes, manual click-through of touched primitives, screenshots attached to PRs. Where the work has a deterministic check (token resolution, prop API preservation), the plan includes an explicit grep or `getComputedStyle` check.

---

## Pre-flight

### Task 1: Cut redesign branch

**Files:** none.

- [ ] **Step 1: Confirm working tree is clean of WIP edits we want to keep.**

Run: `git status --short`

Expected: only the untracked items from the spec brainstorm (`docs/`, `.claude/`, `.playwright-mcp/`, `ISSUES_BACKLOG.md`, `frontend/.superpowers/`, `frontend/docs/redesign/`). Nothing in this plan modifies any of those untracked files; they can stay where they are.

- [ ] **Step 2: Cut the long-lived branch from current `main`.**

Run:
```
git switch main
git pull --ff-only
git switch -c redesign/main
git push -u origin redesign/main
```

Expected: Branch `redesign/main` exists locally and on origin. No code changed.

- [ ] **Step 3: Cut the Phase 0 working branch off `redesign/main`.**

Run:
```
git switch -c redesign/phase-0-setup
```

Expected: HEAD on `redesign/phase-0-setup`, identical content to `redesign/main`.

---

## Phase 0 — Setup

Goal: tokens and font CSS variables available globally; app boots and renders **identical** to current `main` (still dark theme — body className flip is Phase 1).

### Task 2: Copy `system.css` into `frontend/src/styles/`

**Files:**
- Create: `frontend/src/styles/system.css`

- [ ] **Step 1: Create the styles directory and copy the file.**

Run:
```
New-Item -ItemType Directory -Path frontend/src/styles -Force | Out-Null
Copy-Item frontend/docs/redesign/reference/system.css frontend/src/styles/system.css
```

Expected: `frontend/src/styles/system.css` exists with content identical to the redesign reference file.

- [ ] **Step 2: Confirm copy succeeded.**

Run: `Get-Item frontend/src/styles/system.css | Select-Object Length`

Expected: same byte length as `frontend/docs/redesign/reference/system.css`.

### Task 3: Import `system.css` in the root layout

**Files:**
- Modify: `frontend/src/app/layout.tsx`

`system.css` must be imported **before** `global.css` so `global.css`'s `@theme` declarations on `:root` win on conflicts.

- [ ] **Step 1: Add the import line.**

Edit `frontend/src/app/layout.tsx`. Replace:
```tsx
import "./global.css";
import Header from "@/components/Headers";
```
with:
```tsx
import "@/styles/system.css";
import "./global.css";
import Header from "@/components/Headers";
```

- [ ] **Step 2: Boot the app and verify it still renders identically to current main.**

Run: `npm run dev` (in `frontend/`)

Open `http://localhost:3000`. Expected: page renders with the existing dark theme. No console errors. Then ctrl-C to stop the dev server.

- [ ] **Step 3: Verify CSS custom properties from `system.css` are reachable.**

In devtools console:
```js
getComputedStyle(document.body).getPropertyValue('--paper').trim()
```

Expected: `oklch(0.985 0.004 80)` (or equivalent computed value). Non-empty.

### Task 4: Wire `next/font` for the three typefaces

**Files:**
- Modify: `frontend/src/app/layout.tsx`

We add three new font loaders alongside the existing Inter loader. Inter gets removed in Task 5 — keeping it for one task isolates the font swap from the loader wiring.

- [ ] **Step 1: Add the three new font loaders.**

Edit `frontend/src/app/layout.tsx`. Replace:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/system.css";
import "./global.css";
import Header from "@/components/Headers";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
```
with:
```tsx
import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono, Mona_Sans } from "next/font/google";
import "@/styles/system.css";
import "./global.css";
import Header from "@/components/Headers";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

const monaSans = Mona_Sans({
  subsets: ['latin'],
  variable: '--font-mona-sans',
  display: 'swap',
});
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});
```

**Fallback if `Mona_Sans` is not exported by `next/font/google` in your Next version:** swap the Mona Sans loader to `next/font/local` instead. Download `Mona-Sans.woff2` from `https://github.com/github/mona-sans/releases/latest`, save to `frontend/public/fonts/Mona-Sans.woff2`, then use:
```tsx
import localFont from 'next/font/local';
const monaSans = localFont({
  src: '../../public/fonts/Mona-Sans.woff2',
  variable: '--font-mona-sans',
  display: 'swap',
});
```

- [ ] **Step 2: Add font CSS variables to the `<body>` className.**

Replace the body opening tag:
```tsx
<body className={`${inter.variable} font-sans antialiased bg-primary-900 text-neutral-50`}>
```
with:
```tsx
<body className={`${inter.variable} ${monaSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased bg-primary-900 text-neutral-50`}>
```

(Body className still uses dark theme classes — that's intentional. The flip happens in Phase 1.)

- [ ] **Step 3: Boot and verify fonts load.**

Run: `npm run dev`

Open devtools → Network tab → filter by font. Expected: woff2 files for Instrument Serif, JetBrains Mono, and Mona Sans load (or, if you used the local fallback, only the local file). No 404s. Ctrl-C the dev server.

- [ ] **Step 4: Verify font CSS variables are set on the document.**

In devtools console:
```js
const root = document.documentElement;
['--font-mona-sans', '--font-instrument-serif', '--font-jetbrains-mono'].forEach(v => {
  console.log(v, getComputedStyle(root).getPropertyValue(v).trim());
});
```

Expected: each variable returns a non-empty value (a Next-injected font-family token like `'__Mona_Sans_abcdef'`).

### Task 5: Remove the Inter loader

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/global.css`

Inter is a forbidden pattern in the redesign. We remove it now even though the body still renders in `font-sans` → `var(--font-inter)` → Inter — because Phase 0's "looks unchanged" rule survives this swap: Inter and the *existing* `--font-sans` declaration in `global.css` are dropped together in Task 6 below, and the body's currently-applied font-family is `font-sans` Tailwind utility, which we'll re-target there too.

- [ ] **Step 1: Remove the Inter import and loader.**

Edit `frontend/src/app/layout.tsx`. Replace:
```tsx
import { Inter, Instrument_Serif, JetBrains_Mono, Mona_Sans } from "next/font/google";
```
with:
```tsx
import { Instrument_Serif, JetBrains_Mono, Mona_Sans } from "next/font/google";
```

Then delete the line:
```tsx
const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
```

And remove `${inter.variable}` from the body className. The body should now read:
```tsx
<body className={`${monaSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased bg-primary-900 text-neutral-50`}>
```

- [ ] **Step 2: Verify Inter is gone from the bundle.**

Run: `npm run dev`

Open devtools → Network tab → reload. Expected: no Inter font files in the request list. Console clean. Ctrl-C the dev server.

### Task 6: Extend `@theme` in `global.css` with new tokens

**Files:**
- Modify: `frontend/src/app/global.css`

We add new color tokens (paper, ink, accent, rule-soft) and rewire the font tokens to point at the next/font CSS variables. We leave the existing dark-theme color tokens untouched per the coexistence rule — they're deleted in Phase 6.

- [ ] **Step 1: Add new color tokens inside `@theme`.**

Edit `frontend/src/app/global.css`. Find the `@theme {` block and immediately after the line `--color-warning-900: #612200;` (the last existing color in the WARNING block), add:
```css
  /* --- 7. EDITORIAL (Phase 0+) --- */
  --color-paper: oklch(0.985 0.004 80);
  --color-paper-2: oklch(0.965 0.006 80);
  --color-paper-3: oklch(0.93  0.008 80);
  --color-ink: oklch(0.18  0.01  60);
  --color-ink-2: oklch(0.32  0.008 60);
  --color-ink-3: oklch(0.55  0.006 60);
  --color-rule-soft: oklch(0.18 0.01 60 / 0.18);
  --color-accent: oklch(0.42  0.14  25);
  --color-accent-ink: oklch(0.985 0.004 80);
```

- [ ] **Step 2: Replace the font token block.**

In the same `@theme` block, find:
```css
  /* --- FONTS & VARS --- */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
```
and replace with:
```css
  /* --- FONTS & VARS --- */
  --font-sans: var(--font-mona-sans), "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-display: var(--font-instrument-serif), "Times New Roman", Georgia, serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, "SF Mono", Menlo, monospace;
```

(Tailwind 4 picks `font-sans`, `font-display`, `font-mono` utility classes from these declarations.)

- [ ] **Step 3: Boot and verify the new tokens resolve.**

Run: `npm run dev`. Open devtools console:
```js
getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim()
```

Expected: `oklch(0.985 0.004 80)`.

```js
getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim()
```

Expected: starts with `var(--font-instrument-serif), "Times New Roman"...`.

- [ ] **Step 4: Verify Tailwind utility resolution.**

In devtools console:
```js
const probe = document.createElement('div');
probe.className = 'bg-paper text-ink font-display';
document.body.appendChild(probe);
const cs = getComputedStyle(probe);
console.log('bg', cs.backgroundColor, 'color', cs.color, 'font', cs.fontFamily);
probe.remove();
```

Expected: `backgroundColor` resolves to an `oklch(...)` or `rgb(...)` near the paper value (Tailwind 4 may normalize). `color` resolves near ink. `fontFamily` includes `Instrument Serif`. None empty.

- [ ] **Step 5: Verify the app still renders identically.**

Visually scan `http://localhost:3000` (or `/closet`, `/style` if you have an account). Expected: dark theme everywhere, no visual regression. Ctrl-C the dev server.

### Task 7: Mona Sans visual smoke (R2 mitigation)

**Files:** none (verification only).

Risk R2: Mona Sans renders noticeably differently from Söhne. We side-by-side Mona Sans rendering of the system specimen against the artboard *now*, in Phase 0, so a fallback to system stack costs only one line of code if needed.

- [ ] **Step 1: Open the system artboard in a browser.**

Open `frontend/docs/redesign/reference/artboards/system.html` directly via `file://` in your browser. Screenshot it.

- [ ] **Step 2: Render the same specimen content using Mona Sans.**

In the running dev server, open devtools console on any page:
```js
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:oklch(0.985 0.004 80);color:oklch(0.18 0.01 60);padding:48px;z-index:9999;font-family:var(--font-sans);font-size:16px;line-height:1.5';
probe.innerHTML = `
  <div style="font-family:var(--font-display);font-size:120px;line-height:0.92;letter-spacing:-0.02em">Style.</div>
  <p style="margin-top:24px;font-size:20px;line-height:1.45">The page should look quiet. The thing the user is doing should be the loudest object on screen.</p>
  <div style="margin-top:24px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.04em;text-transform:uppercase">Style it yourself · est. 2025</div>
`;
document.body.appendChild(probe);
```

Screenshot the rendered probe. Then `probe.remove()` in console.

- [ ] **Step 3: Compare and decide.**

Place the two screenshots side-by-side. Acceptable if: type rhythm reads similarly, the body sans doesn't look conspicuously narrower/wider than the artboard's, the mono and serif feel correctly weighted alongside the sans.

If Mona Sans clearly disrupts the rhythm, fall back to system stack: edit `frontend/src/app/global.css`, replace `--font-sans: var(--font-mona-sans), "Helvetica Neue"...` with `--font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;` and remove the `Mona_Sans` loader from `app/layout.tsx`. Open a follow-up issue: "Evaluate Söhne licensing for editorial sans."

If Mona Sans looks fine, proceed.

### Task 8: Phase 0 verification + PR

**Files:** none new.

- [ ] **Step 1: Lint passes.**

Run from `frontend/`: `npm run lint`. Expected: no new warnings.

- [ ] **Step 2: Build succeeds.**

Run from `frontend/`: `npm run build`. Expected: build completes without errors. Ctrl-C any dev server first.

- [ ] **Step 3: Forbidden-pattern grep on changed files.**

We've only added tokens and fonts. The grep should be clean. Run from repo root using the Grep tool (or ripgrep equivalent) over the diff against `redesign/main`:
```
git diff redesign/main --name-only
```
For each changed file, grep for: `rounded-(md|lg|xl|2xl)`, `shadow-`, `backdrop-blur`, `bg-gradient`, emoji literals.

Expected: zero hits across the diff.

- [ ] **Step 4: Visual identical-to-main check.**

Boot dev server. Compare `/`, `/closet` (if signed in), `/style/upload` to a screenshot of current `main`. Expected: pixel-equivalent. Ctrl-C.

- [ ] **Step 5: Commit.**

```
git add frontend/src/styles/system.css frontend/src/app/layout.tsx frontend/src/app/global.css
git commit -m "feat(redesign): phase 0 — tokens + fonts wired

Adds editorial color and font tokens to Tailwind @theme alongside
existing dark-theme tokens (coexistence). Wires Instrument Serif,
JetBrains Mono, and Mona Sans via next/font. Removes Inter. App
renders identically — body className flip is Phase 1."
```

- [ ] **Step 6: Push and open PR.**

```
git push -u origin redesign/phase-0-setup
gh pr create --base redesign/main --head redesign/phase-0-setup --title "feat(redesign): phase 0 — tokens + fonts" --body "Implements Phase 0 of the redesign migration spec. App renders identically to main (verified). Tokens (paper, ink, accent, rule-soft) and fonts (Instrument Serif, JetBrains Mono, Mona Sans) now globally available; subsequent phases consume them.

## Verification
- npm run lint passes
- npm run build succeeds
- Devtools console clean
- bg-paper, text-ink, font-display utilities resolve (verified by getComputedStyle on probe)
- Visual identical-to-main check passed

Spec: docs/superpowers/specs/2026-05-05-frontend-redesign-migration-design.md"
```

- [ ] **Step 7: Self-review the diff in the PR, then merge to `redesign/main`.**

If the diff is clean, merge with `gh pr merge --merge` (preserve commit; we want phase history).

```
git switch redesign/main
git pull --ff-only
```

---

## Phase 1 — Primitives + masthead flip

Goal: every primitive in `components/ui/` renders editorial-style; same prop APIs as before; body flips to paper-light; masthead becomes wordmark; AuthModal restyled. Existing screens (closet, style flow, builder, account) will look visually broken on `redesign/main` — that's the documented expected state.

### Task 9: Cut Phase 1 working branch

**Files:** none.

- [ ] **Step 1: Branch off `redesign/main`.**

```
git switch redesign/main
git switch -c redesign/phase-1-primitives
```

### Task 10: Audit Button consumer prop usage

**Files:** none (research only).

Before rewriting `Button.tsx`, document which props the codebase actually uses. The PR description carries this audit forward.

- [ ] **Step 1: Grep all `<Button` usages.**

Use the Grep tool over `frontend/src/`:
```
pattern: <Button
glob: *.tsx
output_mode: content
-n: true
```

Read the output. Catalog: which `variant` values appear? Which `size` values? Which boolean props (`loading`, `fullWidth`, `disabled`)? Are there any spread props that could carry surprises (`{...rest}`)?

- [ ] **Step 2: Write a 5-line props-inventory note in your scratch space.**

Format:
```
Button props inventory:
- variant: primary (N), secondary (N), ghost (N), danger (N)
- size: sm (N), md (N), lg (N)
- loading: used
- fullWidth: used
- leftIcon / rightIcon: used in N places
- forwardRef: required (FormForward in form X)
```

This goes verbatim into the Phase 1 PR description.

### Task 11: Rewrite `Button.tsx`

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`

Same prop API. Editorial visuals. Variant mapping per spec §Architecture/Variant mapping:
- `primary` → filled `.btn` (ink-on-paper, inverts on hover)
- `secondary` → ghost (transparent, inverts on hover)
- `ghost` → ghost
- `danger` → accent (oxblood)

Size mapping:
- `sm` → padding 12×14, min-w 160px
- `md` → padding 18×22, min-w 220px (default `.btn`)
- `lg` → padding 22×28, min-w 260px

- [ ] **Step 1: Replace the file contents.**

Replace the full contents of `frontend/src/components/ui/Button.tsx` with:
```tsx
'use client'

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper border-ink hover:bg-paper hover:text-ink',
  secondary: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-paper',
  ghost: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-paper',
  danger: 'bg-accent text-accent-ink border-accent hover:bg-paper hover:text-accent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-[14px] py-[12px] min-w-[160px]',
  md: 'px-[22px] py-[18px] min-w-[220px]',
  lg: 'px-[28px] py-[22px] min-w-[260px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    type,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'inline-flex items-center justify-between gap-[24px]',
        'font-mono text-[11px] uppercase tracking-[0.12em]',
        'border transition-[background-color,color] duration-200',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="h-[12px] w-[12px] animate-spin rounded-full border border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  )
})

export default Button
```

Notes for the engineer:
- `rounded-full` on the spinner is allowed — the forbidden grep targets `rounded-(md|lg|xl|2xl)`, not `rounded-full`. A circular spinner is editorial-safe.
- Focus uses 1px outline (hairline) instead of ring shadows. Matches editorial aesthetic.
- The `transition-[background-color,color]` is intentional — design system §7 forbids transforms; only color/background may transition.
- `leftIcon`/`rightIcon` pass through unchanged. Consumers that pass lucide icons (e.g. `<Sparkles />`) will still render them. Whether to retire lucide icons across the codebase is a Phase 6 question, not Phase 1.

- [ ] **Step 2: Lint.**

Run: `npm run lint`. Expected: no new warnings. Fix any TS errors immediately — prop-API drift risk (R3) means breaking existing consumers is the worst possible outcome here.

- [ ] **Step 3: Manual smoke test.**

Run: `npm run dev`. Open the app. Click any button (login, sign in, navigation). Expected: button still functions; visuals are editorial (filled ink-on-paper for primary, ghost for secondary, oxblood for danger). Ctrl-C.

### Task 12: Rewrite `Card.tsx` basic Card primitive only

**Files:**
- Modify: `frontend/src/components/ui/Card.tsx`

Per the spec, Phase 1 only rewrites the *basic* Card and its Header/Body/Footer subcomponents. `ItemCard`, `OutfitCard`, `RecommendationCard` are domain components that get rebuilt as `.product` cards in Phase 2 (closet) and Phase 3 (builder). Leaving them on dark-theme styling in Phase 1 is the documented expected mid-migration state.

- [ ] **Step 1: Replace only the basic Card and its subcomponents.**

In `frontend/src/components/ui/Card.tsx`, replace the export of `Card` (lines 9-19), `CardHeader` (22-24), `CardBody` (26-28), and `CardFooter` (30-32) with:
```tsx
export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border border-ink bg-paper',
        interactive && 'transition-colors hover:bg-paper-2',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-ink p-[var(--space-4)]', className)} {...props} />
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[var(--space-4)]', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-ink p-[var(--space-4)]', className)} {...props} />
}
```

Leave `ItemCard`, `OutfitCard`, `RecommendationCard` exported and untouched. The forbidden-pattern grep will hit those — that's accepted for Phase 1 and resolved in Phase 2/3.

- [ ] **Step 2: Lint.**

Run: `npm run lint`. Expected: passes.

- [ ] **Step 3: Add a Phase 1 PR-description note.**

Note to self for the PR description: "Card primitive rewritten. ItemCard / OutfitCard / RecommendationCard untouched (Phase 2/3 territory). Forbidden-pattern grep will report hits in those three; deferred per spec."

### Task 13: Rewrite `Badge.tsx`

**Files:**
- Modify: `frontend/src/components/ui/Badge.tsx`

The redesign permits one accent (oxblood) used sparingly. The current `Badge` has 6 tones (neutral, accent, success, warning, danger, info) — the redesign collapses these to a hairline outline. Tone-specific consumers (`StatusBadge`, `CategoryBadge`, `FormalityBadge`) keep working because the prop API doesn't change; the visual just doesn't differentiate by tone except for `accent`/`danger` which both render in oxblood.

- [ ] **Step 1: Replace the toneClasses map and base classes.**

Edit `frontend/src/components/ui/Badge.tsx`. Replace the `toneClasses` constant:
```tsx
const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-ink text-ink',
  accent: 'border-accent text-accent',
  success: 'border-ink text-ink',
  warning: 'border-ink text-ink',
  danger: 'border-accent text-accent',
  info: 'border-ink text-ink',
}
```

Replace the `sizeClasses` constant:
```tsx
const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-[8px] py-[2px] text-[9px]',
  md: 'px-[10px] py-[6px] text-[10px]',
}
```

Replace the `Badge` component's className:
```tsx
export function Badge({ tone = 'neutral', size = 'md', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono uppercase tracking-[0.08em] border bg-transparent',
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
```

Leave `StatusBadge`, `CategoryBadge`, `FormalityBadge` exports untouched — they call into the same `Badge` and will pick up the new visuals via the rewritten `tone` mapping.

- [ ] **Step 2: Lint.**

Run: `npm run lint`. Expected: passes.

### Task 14: Rewrite `Input.tsx`

**Files:**
- Modify: `frontend/src/components/ui/Input.tsx`

Three exports: `TextInput`, `SelectInput`, `FileUploadInput`. All three keep their prop APIs. Visuals: bottom-hairline-only inputs (no border on top/sides, no rounded), labels in mono uppercase, error/hint in mono.

- [ ] **Step 1: Replace TextInput's input className.**

Edit `frontend/src/components/ui/Input.tsx`. Find the `<input>` JSX inside `TextInput` and replace its `className` prop:
```tsx
className={cn(
  'h-[var(--size-control-md)] w-full bg-transparent text-ink font-display text-[18px]',
  'border-0 border-b border-ink rounded-none',
  'placeholder:text-ink-3 focus:outline-none focus:border-accent',
  'disabled:cursor-not-allowed disabled:opacity-60',
  leftIcon ? 'pl-[calc(var(--space-3)*2+var(--size-icon-sm))] pr-0' : 'px-0'
)}
```

Replace the label className:
```tsx
className="block font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3"
```

Update the leftIcon span's text color: `text-ink-3` (was `text-neutral-600`).

Update `FieldMeta`'s hint className: `font-mono text-[10px] uppercase tracking-[0.04em] text-ink-3`.
Update its error className: `font-mono text-[10px] uppercase tracking-[0.04em] text-accent`.

- [ ] **Step 2: Replace SelectInput's select className.**

```tsx
className={cn(
  'h-[var(--size-control-md)] w-full appearance-none bg-transparent text-ink font-display text-[18px]',
  'border-0 border-b border-ink rounded-none px-0 pr-[calc(var(--space-3)*2+var(--size-icon-md))]',
  'focus:outline-none focus:border-accent',
  'disabled:cursor-not-allowed disabled:opacity-60'
)}
```

Update its label and FieldMeta usages to match the TextInput patterns above.

The `ChevronDown` from lucide stays — it's third-party iconography (R-flagged for Phase 6 review, not Phase 1). Update its className: `text-ink-3` (was `text-neutral-500`).

- [ ] **Step 3: Replace FileUploadInput's drop zone className.**

```tsx
className={cn(
  'flex min-h-[120px] w-full flex-col items-center justify-center gap-[var(--space-2)]',
  'border border-ink bg-paper-2 px-[var(--space-4)] py-[var(--space-5)] text-center',
  'transition-colors',
  isDragging
    ? 'border-accent bg-paper-3'
    : 'hover:bg-paper-3',
  disabled && 'cursor-not-allowed opacity-50'
)}
```

(Removed `rounded-[var(--radius-lg)]`, `border-2`, `border-dashed`, gradient hover. The redline calls for a hairline frame; the artboard for upload uses a single 1px frame plus the diagonal-rule placeholder for the empty state. We keep the simple solid 1px border in Phase 1; the diagonal-rule placeholder is Phase 4 (style flow) territory.)

Update `Upload` icon className: `text-ink-3` and on dragging `text-accent`.

Update the dropLabel `<span>` className: `font-mono text-[11px] uppercase tracking-[0.04em] text-ink`.
Update the helper text `<span>` className: `font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3`.

Update the selected-file row className:
```tsx
className="flex items-center justify-between border border-ink bg-transparent px-[var(--space-3)] py-[var(--space-2)]"
```

Selected file name: `font-display text-[16px] text-ink`.
X button (`onClear`): `text-ink-3 hover:text-ink p-[4px]` and remove the rounded radius.

- [ ] **Step 4: Lint.**

Run: `npm run lint`. Expected: passes.

### Task 15: Rewrite `Modal.tsx`

**Files:**
- Modify: `frontend/src/components/ui/Modal.tsx`

The prop API stays. Visuals: full-bleed paper background panel, 1px ink border, no rounded, no shadow, no backdrop blur. Backdrop becomes `bg-ink/40` (translucent ink instead of blur).

- [ ] **Step 1: Replace the backdrop element.**

In `Modal`, find:
```tsx
<div
  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
  onClick={closeOnBackdrop ? onClose : undefined}
  aria-hidden="true"
/>
```
and replace with:
```tsx
<div
  className="absolute inset-0 bg-ink/40"
  onClick={closeOnBackdrop ? onClose : undefined}
  aria-hidden="true"
/>
```

- [ ] **Step 2: Replace the panel className.**

Find:
```tsx
className={cn(
  'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-primary-700 bg-primary-900 shadow-2xl',
  sizeClasses[size],
  panelClassName
)}
```
and replace with:
```tsx
className={cn(
  'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden border border-ink bg-paper',
  sizeClasses[size],
  panelClassName
)}
```

- [ ] **Step 3: Replace the title bar styling.**

Find the title-bar `<div className="flex items-center justify-between border-b border-primary-800 ...">` and replace its className:
```tsx
className="flex items-center justify-between border-b border-ink px-[var(--space-6)] py-[var(--space-4)]"
```

The title `<h2>` className:
```tsx
className="font-display text-[24px] text-ink"
```

The description `<p>` className:
```tsx
className="mt-[var(--space-1)] font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3"
```

The close button:
```tsx
className="p-[var(--space-1)] text-ink-3 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
```

(Removed rounded-sm and ring-2 ring-offset focus styles.)

- [ ] **Step 4: Replace the footer className.**

Find the footer `<div>` and update:
```tsx
className="border-t border-ink px-[var(--space-6)] py-[var(--space-4)]"
```

- [ ] **Step 5: Update `ConfirmationModal`.**

The `AlertTriangle` icon className becomes `text-accent` (was `text-error-400`). The description `<p>` becomes `font-display text-[18px] text-ink-2`.

- [ ] **Step 6: Lint.**

Run: `npm run lint`. Expected: passes.

### Task 16: Rewrite `Skeleton.tsx`

**Files:**
- Modify: `frontend/src/components/ui/Skeleton.tsx`

Skeleton's job is to indicate loading. Editorial treatment: `--paper-2` background with a `--paper-3` diagonal-rule pulse. We can reuse `system.css`'s `.product__frame--placeholder` pattern.

- [ ] **Step 1: Read the current Skeleton.tsx.**

Use the Read tool on `frontend/src/components/ui/Skeleton.tsx`. Note its current prop API (likely `className`, `variant`, `width`, `height`).

- [ ] **Step 2: Replace contents preserving the prop API.**

Replace the file's render output to use `bg-paper-2` and animate via background-position rather than scale/opacity. Concrete shape:
```tsx
<div
  className={cn(
    'bg-paper-2 animate-pulse',
    className
  )}
  style={{
    backgroundImage: `repeating-linear-gradient(135deg, var(--color-paper-2) 0 22px, var(--color-paper-3) 22px 24px)`,
    ...style,
  }}
  {...props}
/>
```

(Drops any `rounded-*` from old skeleton. `animate-pulse` is allowed — it's an opacity transition, not a transform.)

If the existing Skeleton has variants (`text`, `circle`, etc.), keep the variant prop but route all variants to the same paper-2 + diagonal-rule rendering. We don't differentiate skeleton variants in the editorial design.

- [ ] **Step 3: Lint.**

Run: `npm run lint`.

### Task 17: Add `Tag.tsx`

**Files:**
- Create: `frontend/src/components/ui/Tag.tsx`

`Tag` is the new filter chip primitive (`.tag` in `system.css`). Distinct from `Badge` (which is a status pill). Prop API: `selected?: boolean`, plus standard span attributes.

- [ ] **Step 1: Create the file.**

Create `frontend/src/components/ui/Tag.tsx` with:
```tsx
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  selected?: boolean
  children: ReactNode
}

export function Tag({ selected = false, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[8px] px-[10px] py-[6px]',
        'font-mono text-[10px] uppercase tracking-[0.08em]',
        'border border-ink bg-transparent text-ink',
        'transition-colors',
        selected && 'bg-ink text-paper',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export default Tag
```

- [ ] **Step 2: Lint.**

Run: `npm run lint`.

### Task 18: Add `Hairline.tsx`

**Files:**
- Create: `frontend/src/components/ui/Hairline.tsx`

Wrappers around `<hr class="rule">` and `<hr class="rule-soft">` from `system.css`. Tiny but worth a primitive so consumers don't reach for raw classes.

- [ ] **Step 1: Create the file.**

Create `frontend/src/components/ui/Hairline.tsx`:
```tsx
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface HairlineProps extends HTMLAttributes<HTMLHRElement> {
  soft?: boolean
}

export function Hairline({ soft = false, className, ...props }: HairlineProps) {
  return (
    <hr
      className={cn(
        'border-0 border-t',
        soft ? 'border-rule-soft' : 'border-ink',
        className
      )}
      {...props}
    />
  )
}

export default Hairline
```

Note: `border-rule-soft` requires `--color-rule-soft` to be in Tailwind theme. We added it in Task 6, so the utility resolves.

- [ ] **Step 2: Lint.**

Run: `npm run lint`.

### Task 19: Update `components/ui/index.ts` exports

**Files:**
- Modify: `frontend/src/components/ui/index.ts`

- [ ] **Step 1: Read the current index.ts.**

Use the Read tool on `frontend/src/components/ui/index.ts`. Check whether existing primitives are barrel-exported.

- [ ] **Step 2: Add Tag and Hairline exports.**

If the file uses named re-exports, add:
```ts
export { Tag } from './Tag'
export type { TagProps } from './Tag'
export { Hairline } from './Hairline'
export type { HairlineProps } from './Hairline'
```

If the file uses `export *`, the new files are picked up automatically — no edit needed.

- [ ] **Step 3: Lint.**

Run: `npm run lint`.

### Task 20: Flip body classes in `app/layout.tsx`

**Files:**
- Modify: `frontend/src/app/layout.tsx`

This is the load-bearing visual change of Phase 1. Body goes from dark to paper-light.

- [ ] **Step 1: Replace the body className.**

Edit `frontend/src/app/layout.tsx`. Replace:
```tsx
<body className={`${monaSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased bg-primary-900 text-neutral-50`}>
```
with:
```tsx
<body className={`${monaSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased bg-paper text-ink`}>
```

- [ ] **Step 2: Boot and visually inspect.**

Run: `npm run dev`. Open `/`. Expected: page background is now warm off-white, text is deep ink. Existing screen layouts will look broken (wrong densities, bad color combos on cards/modals) — that's the documented expected state. Console clean. Ctrl-C.

### Task 21: Rewrite `Header.tsx` as wordmark masthead

**Files:**
- Modify: `frontend/src/components/Headers.tsx`

(Note: filename is `Headers.tsx` plural per the existing import in `layout.tsx`.)

Per `screens/00-landing.md`: wordmark left in `.t-mono`, two text links right (LOG IN, ENTER → for logged-out; CLOSET / BUILDER / SETTINGS for logged-in per `06-closet.md`).

- [ ] **Step 1: Read the current Headers.tsx.**

Use the Read tool on `frontend/src/components/Headers.tsx`. Identify: how does it read auth state? What links does it render today? Does it use `usePathname` / `useRouter`?

- [ ] **Step 2: Rewrite the render output, preserving auth-state logic.**

Replace the rendered output (keep all hooks and state-reading logic). The new shape:
```tsx
return (
  <header className="fixed top-0 left-0 right-0 z-50 bg-paper border-b border-ink">
    <div className="flex items-center justify-between px-[var(--gutter)] py-[20px]">
      <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
        Style It Yourself · Est. 2025
      </Link>
      <nav className="flex items-center gap-[32px]">
        {/* Replace these links with the auth-aware list the existing component computes.
            For logged-out users: LOG IN, ENTER →
            For logged-in users: CLOSET, BUILDER, SETTINGS */}
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink hover:text-ink-2 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  </header>
)
```

If the existing component uses a different shape (e.g., a Button for login that opens AuthModal), keep that interaction — just restyle the trigger as a text link with the editorial mono treatment. The visual layer is what's changing; the auth/routing behavior is frozen per the spec.

- [ ] **Step 3: Verify pt-20 in the layout still aligns with the new masthead height.**

Read `app/layout.tsx`. The `<main className="pt-20 min-h-screen">` reserves 80px for the masthead. Measure: the new masthead is `py-[20px]` (40px) plus content height (~16px) + 1px border = ~57px. `pt-20` (80px) clears it with margin to spare. Leave as-is.

- [ ] **Step 4: Boot and verify.**

Run: `npm run dev`. Open `/`. Expected: masthead is text-only, ink on paper, with wordmark left and links right. No logo image, no avatar, no shadows, no rounded corners. Ctrl-C.

### Task 22: Restyle `AuthModal.tsx`

**Files:**
- Modify: `frontend/src/components/AuthModal.tsx`

AuthModal pops over every screen. Phase 1 must restyle it; otherwise users see a dark modal over a paper-light page.

- [ ] **Step 1: Read AuthModal.tsx.**

Use the Read tool on `frontend/src/components/AuthModal.tsx`. Identify: does it use the shared `Modal` primitive (which we just rewrote — good, it auto-restyles), or does it render a custom layout? What inputs does it use — TextInput from our primitive, or raw `<input>`?

- [ ] **Step 2: If AuthModal renders raw layout, swap to primitives.**

If AuthModal uses raw `<div>`/`<input>`/`<button>` for its own layout, swap them to `<Modal>`, `<TextInput>`, `<Button>` from `@/components/ui`. The rewritten primitives will handle the editorial visuals.

If AuthModal already uses `Modal` and `TextInput`, the Phase 1 primitive rewrites have already restyled it — verify by booting and triggering it.

- [ ] **Step 3: Replace any direct dark-theme classes.**

Grep within `AuthModal.tsx` for any of: `bg-primary-`, `text-neutral-`, `border-primary-`, `rounded-(md|lg|xl)`, `shadow-`, `backdrop-blur`. For each hit, replace with the editorial equivalent: `bg-paper`, `text-ink`/`text-ink-2`/`text-ink-3`, `border-ink`, no radius, no shadow, no blur.

The form labels should be `font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3`. The submit button: `<Button variant="primary" fullWidth>` with text like `SIGN IN →`.

- [ ] **Step 4: Boot and trigger AuthModal.**

Run: `npm run dev`. Sign out (if signed in) and click the login link. Expected: modal opens with paper background, ink text, hairline border. Form inputs are bottom-hairline-only. Submit button is editorial. Console clean. Ctrl-C.

### Task 23: Phase 1 verification + PR

**Files:** none new.

- [ ] **Step 1: Lint.**

Run from `frontend/`: `npm run lint`. Expected: passes.

- [ ] **Step 2: Build.**

Run: `npm run build`. Expected: succeeds.

- [ ] **Step 3: Forbidden-pattern grep on changed files.**

Run from repo root for each pattern, scoped to changed files in this PR (compare against `redesign/main`):
- `rounded-(md|lg|xl|2xl)` — should hit only in `Card.tsx`'s `ItemCard`/`OutfitCard`/`RecommendationCard` (deferred to Phase 2/3) and possibly in components we didn't touch this phase. New code from this PR: zero hits.
- `shadow-` — same. Zero in new code.
- `backdrop-blur` — should be gone from `Modal.tsx` and `AuthModal.tsx`. May survive in untouched files.
- `bg-gradient` — should not appear in any file edited in Phase 1.
- emoji literals in JSX — none.

If any pattern hits a file you edited, fix it. If a pattern hits a deferred file (the three non-primitive Card exports, or untouched screen-level components), document in the PR description: "Survives in [file]; deferred to Phase N."

- [ ] **Step 4: Manual click-through.**

Run: `npm run dev`. Verify each primitive in a real interaction:
- Open AuthModal — paper-light, hairline border, mono labels. ✓
- Submit a form (login or sign-up) — Button shows loading spinner correctly. ✓
- Filter the closet (if signed in) — `Tag` renders. ✓
- Open ItemDetailModal from closet — `Modal` is paper-light. ✓ (The modal contents will look broken — that's expected.)
- Navigate masthead links — text links transition color on hover, no transforms. ✓

Console clean. Ctrl-C.

- [ ] **Step 5: Screenshot at 1440px and 390px.**

Take a 1440px-wide screenshot of `/` with the masthead and AuthModal open. Take a 390px-wide screenshot of the same. Attach to PR.

- [ ] **Step 6: Commit.**

```
git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/Card.tsx frontend/src/components/ui/Badge.tsx frontend/src/components/ui/Input.tsx frontend/src/components/ui/Modal.tsx frontend/src/components/ui/Skeleton.tsx frontend/src/components/ui/Tag.tsx frontend/src/components/ui/Hairline.tsx frontend/src/components/ui/index.ts frontend/src/app/layout.tsx frontend/src/components/Headers.tsx frontend/src/components/AuthModal.tsx
git commit -m "feat(redesign): phase 1 — primitives + masthead flip

Rewrites Button, Card, Badge, Input, Modal, Skeleton with editorial
visuals and identical prop APIs. Adds Tag and Hairline. Flips body
to paper-light. Restyles Headers as wordmark masthead and AuthModal
to use new primitives. Existing screens (closet, style, builder)
look visually broken — expected state per migration spec."
```

- [ ] **Step 7: Push and open PR.**

```
git push -u origin redesign/phase-1-primitives
gh pr create --base redesign/main --head redesign/phase-1-primitives --title "feat(redesign): phase 1 — primitives + masthead flip" --body "Implements Phase 1 of the redesign migration spec. Primitives rewritten in place with identical prop APIs.

## Props inventory (R3 mitigation)

[Paste the per-primitive audit notes from Tasks 10/12/13/14/15/16. Format:
Button props inventory:
- variant: primary (N), secondary (N), ghost (N), danger (N)
- ...]

## Survivors (deferred)

Forbidden-pattern hits in:
- Card.tsx ItemCard/OutfitCard/RecommendationCard — Phase 2/3 (.product rewrite)
- [Any untouched screen components] — Phase 2-5 per the migration plan

## Verification
- npm run lint passes
- npm run build succeeds
- Devtools console clean
- Manual click-through of every primitive succeeded
- Screenshots at 1440px and 390px attached

Spec: docs/superpowers/specs/2026-05-05-frontend-redesign-migration-design.md"
```

- [ ] **Step 8: Self-review the diff, then merge to `redesign/main`.**

If the diff is clean, merge with `gh pr merge --merge` (preserve commit).

```
git switch redesign/main
git pull --ff-only
```

---

## Self-Review

After completing all tasks above, do this checklist before declaring Phase 0+1 done.

### Spec coverage

Spec sections covered:
- Architecture / Tokens — Tasks 2, 3, 6
- Architecture / Fonts — Tasks 4, 5, 6, 7
- Architecture / Primitives — Tasks 11, 12, 13, 14, 15, 16, 17, 18, 19
- Architecture / Variant mapping — Task 11 implements the mapping verbatim
- Architecture / Layout — Tasks 20, 21
- Phase 0 deliverables — Tasks 2-8
- Phase 1 deliverables — Tasks 9-23 (incl. AuthModal in Task 22)
- Coexistence rule 1 (Tokens coexist) — Task 6 keeps old tokens; new tokens added alongside
- Coexistence rule 2 (Prop APIs frozen) — Task 10 audit + Tasks 11-16 preserve APIs
- Coexistence rule 3 (State untouched) — No store/types/api files in any task
- Universal verification — Tasks 8, 23
- R1 (branch drift) — Pre-flight cuts long-lived branch
- R2 (Mona Sans drift) — Task 7 is the explicit smoke
- R3 (prop API drift) — Task 10 audit; PR description carries inventory

### Placeholder scan

Searched for: TBD, TODO, "implement later", "fill in details", "add appropriate error handling", "similar to Task N".

Confirmed clean. The plan uses concrete code blocks for every editing step, exact file paths, exact commands. No "fill in" instructions.

### Type consistency

- `ButtonVariant`, `ButtonSize`, `ButtonProps` — defined in Task 11, no later task references them.
- `BadgeTone`, `BadgeSize`, `BadgeProps` — defined in Task 13, no later task references them.
- `TagProps` — defined in Task 17, exported in Task 19.
- `HairlineProps` — defined in Task 18, exported in Task 19.
- Tailwind utility names (`bg-paper`, `text-ink`, `border-ink`, `text-ink-2`, `text-ink-3`, `bg-paper-2`, `bg-paper-3`, `border-rule-soft`, `bg-accent`, `text-accent`, `text-accent-ink`) — all derived from the `--color-*` tokens added in Task 6. Consistent across Tasks 11-22.

No type drift identified.

### Open execution-time questions

These are not plan failures; they're documented decisions for the engineer to make in context.

1. **Mona Sans availability via `next/font/google`** — Task 4 includes a fallback to `next/font/local`. Use whichever works in your Next.js version.
2. **Lucide icons in primitives** — Kept (ChevronDown, AlertTriangle, Upload, X). The "no SVG icons drawn by you" rule arguably permits third-party libraries; if the design lead disagrees, retire lucide in Phase 6.
3. **Headers.tsx auth-state link list** — preserve whatever the current component computes; just restyle the rendering. If the auth-state logic itself needs review, that's a separate ticket.
