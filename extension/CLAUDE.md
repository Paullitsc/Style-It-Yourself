# Extension Guide

Read the root [`CLAUDE.md`](../CLAUDE.md) first. This file covers the Chrome
MV3 extension, which lives deliberately OUTSIDE the npm workspace with its own
lockfile.

## Build and run

- `npm install && npm run build` outputs everything Chrome needs to `dist/`
  (gitignored); `npm run watch` rebuilds on save, then hit the reload arrow on
  the extension card in `chrome://extensions`. Load via Developer mode → Load
  unpacked → select `extension/dist`.
- Config is injected at build time by `build.mjs` with this precedence:
  built-in localhost defaults → `../frontend/.env.local` (`NEXT_PUBLIC_*`
  mapped to `SIY_*`) → `./.env` (`SIY_*`, gitignored) → `process.env`. Only
  the public anon key is ever bundled; never the service key.

## Mirrors (change together)

- `src/lib/color.ts` hand-mirrors `frontend/src/lib/colorUtils.ts` (and the
  backend's `color_harmony.py`): neutral list, earth-tone naming rules, and
  HSL math must stay in sync across all three.
- `src/lib/types.ts` mirrors the backend Pydantic schemas it consumes.

## Popup constraints

- The popup body is 360px wide and capped at 580px tall (Chrome guillotines
  popups at 600px): the masthead is pinned and `.body` scrolls internally.
  Everything inside `.body` and the masthead carries `flex-shrink: 0` — in a
  capped flex column, children otherwise compress to fit and images collapse
  into slivers. Scroll, never shrink.
- The main product image is placeholder-first: a hatch shows until the image
  actually loads (product pages lazy-load and rewrite srcsets, so the first
  extracted URL can race the popup); a failed load keeps the hatch and the
  filmstrip picks a replacement.
- Chrome owns popup position and zoom; neither can be styled.

## Auth handshake

- The popup's Connect button opens the web app's `/extension/connect` page
  with `?extId=<chrome.runtime.id>`; the page sends the Supabase session via
  `chrome.runtime.sendMessage` (`externally_connectable` allows localhost:3000
  and the production domain). The session lives in `chrome.storage.local` and
  refreshes itself.
- The backend allows extension origins through `CORS_ORIGIN_REGEX`
  (`chrome-extension://.*` in dev; pin to the real ID in production).
