/** Domain constants mirrored from backend `utils/constants.py`. */

export const CATEGORY_TAXONOMY: Record<string, string[]> = {
  Tops: ['T-Shirts', 'Polos', 'Casual Shirts', 'Dress Shirts', 'Sweaters', 'Hoodies', 'Blazers'],
  Bottoms: ['Jeans', 'Chinos', 'Dress Pants', 'Shorts', 'Joggers', 'Skirts'],
  Shoes: ['Sneakers', 'Loafers', 'Oxfords', 'Boots', 'Sandals', 'Heels'],
  Accessories: ['Watches', 'Belts', 'Bags', 'Hats', 'Scarves', 'Jewelry', 'Sunglasses'],
  Outerwear: ['Jackets', 'Coats', 'Vests'],
  'Full Body': ['Dresses', 'Suits'],
}

export const CATEGORY_L1 = Object.keys(CATEGORY_TAXONOMY)

export const FORMALITY_LABELS: Record<number, string> = {
  1: 'Casual',
  2: 'Smart Casual',
  3: 'Business Casual',
  4: 'Formal',
  5: 'Black Tie',
}

export const AESTHETIC_TAGS: string[] = [
  'Minimalist',
  'Streetwear',
  'Classic',
  'Preppy',
  'Bohemian',
  'Athleisure',
  'Vintage',
  'Edgy',
]

export const MAX_AESTHETICS = 3

/**
 * Display-only mirror of backend `EVENT_CONTEXTS` (utils/constants.py).
 * Scoring (formality band, palette matching) happens server-side — the
 * extension only needs id/label/swatches to render the pin picker. An id
 * sent to /api/extension/match-product that this list drifts out of sync
 * with degrades gracefully (see event_context.get_event).
 */
export interface EventOption {
  id: string
  label: string
  swatches: string[]
}

export const EVENT_CONTEXTS: EventOption[] = [
  { id: 'job-interview', label: 'Job Interview', swatches: ['#0B1C2D', '#808080', '#FFFFFF', '#000000'] },
  { id: 'wedding-guest', label: 'Wedding Guest', swatches: ['#0B1C2D', '#6E2142', '#9CAF88', '#7A99AC'] },
  { id: 'first-date', label: 'First Date', swatches: ['#000000', '#6E2142', '#1F2A44', '#808080'] },
  { id: 'night-out', label: 'Night Out', swatches: ['#000000', '#4B1D8C', '#7A1F3D', '#C0C0C0'] },
  { id: 'casual-weekend', label: 'Casual Weekend', swatches: ['#3B5998', '#FFFFFF', '#C3B091', '#808080'] },
]
