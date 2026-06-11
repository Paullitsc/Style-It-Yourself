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
