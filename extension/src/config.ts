/**
 * Build-time configuration. These identifiers are replaced by esbuild `define`
 * (see build.mjs) with values from env vars, defaulting to local dev. The
 * Supabase ANON key is a public client key — safe to ship. The service-role key
 * must NEVER appear in extension code.
 */
declare const __SIY_API_BASE_URL__: string
declare const __SIY_WEB_APP_URL__: string
declare const __SIY_SUPABASE_URL__: string
declare const __SIY_SUPABASE_ANON_KEY__: string

export const API_BASE_URL = __SIY_API_BASE_URL__
export const WEB_APP_URL = __SIY_WEB_APP_URL__
export const SUPABASE_URL = __SIY_SUPABASE_URL__
export const SUPABASE_ANON_KEY = __SIY_SUPABASE_ANON_KEY__

/** Route on the web app that performs the auth handoff. */
export const CONNECT_PATH = '/extension/connect'

/** chrome.storage.local key for the persisted Supabase session. */
export const SESSION_KEY = 'siy_session'

/** chrome.storage.local key for the pinned shopping-intent event. */
export const PINNED_EVENT_KEY = 'siy_pinned_event'

/**
 * A pin is a same-shopping-trip signal, not a durable preference — without
 * an expiry, a Saturday wedding pin would silently keep down-ranking
 * matches the following Wednesday. 24h covers one shopping session.
 */
export const PINNED_EVENT_TTL_MS = 24 * 60 * 60 * 1000
