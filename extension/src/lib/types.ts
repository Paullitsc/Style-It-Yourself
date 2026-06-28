/**
 * Extension-side types. Kept intentionally small and mirrored from the
 * backend Pydantic schemas / frontend `src/types/index.ts`. For MVP this
 * duplication is acceptable (see assignment); a shared generated client would
 * be the eventual upgrade.
 */

export interface HSL {
  h: number
  s: number
  l: number
}

export interface Color {
  hex: string
  hsl: HSL
  name: string
  is_neutral: boolean
}

export interface Category {
  l1: string
  l2: string
}

export type Ownership = 'owned' | 'wishlist'

/** Raw product context scraped from the current page. */
export interface RawProduct {
  title: string | null
  /** Ranked candidate image URLs (best-first); may be empty. */
  images: string[]
  /** Back-compat alias = images[0] ?? null. */
  image: string | null
  price: number | null
  brand: string | null
  url: string
}

/** POST /api/extension/analyze-product response. */
export interface AnalyzeResponse {
  color: Color | null
  category: Category
  formality: number
  aesthetics: string[]
  brand: string | null
  price: number | null
  title: string | null
  image_url: string | null
  preview_image: string | null
  source_url: string
  source_platform: string | null
}

/** POST /api/extension/import-item request. */
export interface ImportItemRequest {
  color: Color
  category: Category
  formality: number
  aesthetics: string[]
  image_url: string
  brand?: string | null
  price?: number | null
  source_url?: string | null
  ownership: Ownership
  title?: string | null
}

export interface ClothingItemResponse {
  id: string
  image_url: string
  color: Color
  category: Category
  formality: number
  aesthetics: string[]
  brand?: string | null
  ownership: string
}

export interface ClosetMatchGroup {
  category_l1: string
  items: ClothingItemResponse[]
  other_items: ClothingItemResponse[]
}

/** POST /api/extension/match-product response. */
export interface MatchResponse {
  candidate_category: string
  matches_by_category: ClosetMatchGroup[]
  suggested_pairings: string[]
  warnings: string[]
  cohesion_score: number
  verdict: string
  summary: string
  total_closet_items: number
}

/** Persisted Supabase session (subset we need). */
export interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number // unix seconds
  user: { id: string; email: string | null }
}

// ---- runtime messages ----

export interface ExtractProductMessage {
  type: 'EXTRACT_PRODUCT'
}

export interface ExtractProductResult {
  ok: boolean
  product?: RawProduct
  error?: string
}

export interface ConnectMessage {
  type: 'SIY_CONNECT'
  session: unknown
}
