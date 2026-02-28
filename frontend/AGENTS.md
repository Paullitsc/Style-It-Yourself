# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains Next.js App Router routes (`page.tsx`, `layout.tsx`) and feature areas like `style/`, `closet/`, and `account/`.
- `src/app/**/components/` holds route-specific UI; `src/components/` holds shared components (auth, nav, guards).
- `src/lib/` includes integration and helper modules (`api.ts`, `supabase.ts`, color utilities).
- `src/store/` contains Zustand state (`styleStore.ts`), and `src/types/` contains shared TypeScript contracts aligned with backend schemas.
- `public/` stores static assets. Root configs include `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, and `Dockerfile`.

## Build, Test, and Development Commands
- `npm ci` installs dependencies from `package-lock.json`.
- `npm run dev` starts the local dev server on `http://localhost:3000`.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint with Next.js + TypeScript rules.
- Optional Docker flow: `docker build -t siy-frontend .` (pass required `NEXT_PUBLIC_*` values at build/run time).

## Coding Style & Naming Conventions
- Use TypeScript with strict typing (`tsconfig.json` has `strict: true`).
- Use the `@/*` alias for imports from `src/` when practical.
- Follow existing formatting: 2-space indentation and semicolon-free style.
- Name React component files in `PascalCase` (example: `AuthModal.tsx`).
- Use `camelCase` for utilities, store functions, and variables (example: `colorUtils.ts`, `useStyleStore`).
- Keep route directory names lowercase to match URL segments.
- Use Tailwind classes and theme tokens defined in `src/app/global.css`.

## Testing Guidelines
- No automated test runner is configured currently.
- Before opening a PR, run `npm run lint` and manually verify core flows (`/`, `/style`, `/closet`, auth modal/login).
- If you add tests, use `*.test.ts` or `*.test.tsx` naming and place tests near related code or under `src/__tests__/`.

## Commit & Pull Request Guidelines
- Prefer short, specific, imperative commit subjects (example: `fix duplicate item validation`).
- Avoid vague commit messages such as `nit` or `test fixes`.
- PRs should include: summary of changes, how to verify, linked issue (if available), and screenshots/GIFs for UI changes.
- Call out environment/config updates explicitly (for example `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_API_URL`).
