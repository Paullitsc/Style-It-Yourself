# Style It Yourself — Chrome Extension

A Manifest V3 extension that captures product context from any store page and
talks to the **same backend** as the web app. It does not reimplement any
styling logic — it normalizes scraped data into the existing `ClothingItem`
shape and calls the backend, which owns all closet writes, storage,
compatibility, recommendations, and matching.

## Two flows

1. **Add to closet** — detects the product image, title, price, and brand,
   asks the backend to suggest color / category / formality / aesthetics, lets
   you confirm, then imports it. The item appears in `/closet` immediately.
2. **Check match** — treats the current product as a candidate and shows which
   of your saved pieces pair with it, grouped by category, with warnings and a
   cohesion-style summary.

## Architecture

| File | Responsibility |
|------|----------------|
| `src/contentScript.ts` | Passive listener; runs the extractor on request. |
| `src/lib/productExtractor.ts` | Layered scrape: JSON-LD → Open Graph → DOM selectors → largest image. |
| `src/background.ts` | Auth handoff (`onMessageExternal`) → persists the Supabase session. |
| `src/popup/*` | React UI for both flows. |
| `src/lib/api.ts` | Wrapper for `/api/extension/*` with bearer auth. |
| `src/lib/auth.ts` | Reads the stored session, refreshes the access token. |
| `src/lib/storage.ts` | `chrome.storage.local` access. |

The backend endpoints used:

- `POST /api/extension/analyze-product` — suggest metadata (fetches the image
  server-side for color analysis).
- `POST /api/extension/import-item` — fetch the remote image, store it in
  Supabase, create the item.
- `POST /api/extension/match-product` — closet matches + warnings + summary.

## Auth handoff

The extension never sees a password. The popup's **Connect** button opens the
web app at `/extension/connect?extId=<extension id>`. If you are signed in,
that page calls `chrome.runtime.sendMessage(extId, { type: 'SIY_CONNECT',
session })`. The background worker verifies the sender origin and stores the
Supabase session in `chrome.storage.local`. API calls then send
`Authorization: Bearer <access_token>` (refreshed automatically on expiry).

`externally_connectable.matches` in `manifest.json` must list your web app
origin (defaults to `http://localhost:3000`).

## Build

```bash
npm install
npm run build      # outputs dist/
npm run watch      # rebuild on change
npm run typecheck  # tsc --noEmit
```

Configuration is injected at build time (defaults target local dev). The
Supabase ANON key is a public client key — safe to bundle. **Never** put the
service-role key here.

```bash
SIY_API_BASE_URL=https://api.example.com \
SIY_WEB_APP_URL=https://app.styleityourself.app \
SIY_SUPABASE_URL=https://xxxx.supabase.co \
SIY_SUPABASE_ANON_KEY=eyJ... \
npm run build
```

## Load in Chrome

1. `npm run build`
2. Visit `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the `extension/dist` folder.
4. Pin the extension, open any product page, click the icon, and **Connect**.

## Notes

- No secrets are bundled (only the public anon key + public URLs).
- The content script is passive and injected on demand for already-open tabs.
- API calls reach the backend via CORS (the backend allows `chrome-extension://*`
  through `CORS_ORIGIN_REGEX`). `host_permissions` lists the local API by default;
  if your API is on another origin, either add it there or rely on that CORS rule.
- Remote images are fetched and validated **server-side** (SSRF-guarded), so the
  browser never has to deal with cross-origin canvas/CORS issues.
