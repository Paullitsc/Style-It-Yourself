/**
 * Layered product extraction, run in the page context by the content script.
 *
 * Precedence (most reliable first):
 *   1. JSON-LD `Product` schema
 *   2. Open Graph / product meta tags
 *   3. Common ecommerce DOM selectors
 *   4. Largest visible image fallback
 *   5. Current page URL as source_url
 *
 * Everything is defensive — any individual layer may throw or return junk on a
 * random page, so each is wrapped and merged by precedence.
 */
import type { RawProduct } from './types'

interface PartialProduct {
  title?: string | null
  image?: string | null
  price?: number | null
  brand?: string | null
}

export function extractProduct(): RawProduct {
  const url = window.location.href

  const jsonLd = safe(extractFromJsonLd)
  const og = safe(extractFromMetaTags)
  const dom = safe(extractFromSelectors)

  const title =
    jsonLd.title || og.title || dom.title || document.title || null
  const image = absolutize(
    jsonLd.image || og.image || dom.image || largestImage(),
  )
  const price = firstNumber([jsonLd.price, og.price, dom.price])
  const brand = jsonLd.brand || og.brand || dom.brand || null

  return {
    title: clean(title),
    image,
    price,
    brand: clean(brand),
    url,
  }
}

// ---------------------------------------------------------------------------
// Layer 1 — JSON-LD Product schema
// ---------------------------------------------------------------------------

function extractFromJsonLd(): PartialProduct {
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  )

  for (const script of scripts) {
    let parsed: unknown
    try {
      parsed = JSON.parse(script.textContent || '')
    } catch {
      continue
    }

    const product = findProductNode(parsed)
    if (product) {
      return {
        title: asString(product.name),
        image: pickImage(product.image),
        price: pickOfferPrice(product.offers),
        brand: pickBrand(product.brand),
      }
    }
  }
  return {}
}

type JsonObject = Record<string, unknown>

function findProductNode(node: unknown): JsonObject | null {
  if (!node || typeof node !== 'object') return null

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProductNode(child)
      if (found) return found
    }
    return null
  }

  const obj = node as JsonObject
  if ('@graph' in obj) {
    const found = findProductNode(obj['@graph'])
    if (found) return found
  }

  const type = obj['@type']
  const isProduct = Array.isArray(type)
    ? type.some((t) => String(t).toLowerCase() === 'product')
    : String(type ?? '').toLowerCase() === 'product'

  return isProduct ? obj : null
}

function pickImage(image: unknown): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return pickImage(image[0])
  if (typeof image === 'object') {
    return asString((image as JsonObject).url)
  }
  return null
}

function pickOfferPrice(offers: unknown): number | null {
  if (!offers) return null
  if (Array.isArray(offers)) {
    for (const offer of offers) {
      const p = pickOfferPrice(offer)
      if (p != null) return p
    }
    return null
  }
  if (typeof offers === 'object') {
    const o = offers as JsonObject
    const direct = toNumber(o.price)
    if (direct != null) return direct
    const spec = o.priceSpecification
    if (spec && typeof spec === 'object') {
      return toNumber((spec as JsonObject).price)
    }
  }
  return null
}

function pickBrand(brand: unknown): string | null {
  if (!brand) return null
  if (typeof brand === 'string') return brand
  if (Array.isArray(brand)) return pickBrand(brand[0])
  if (typeof brand === 'object') return asString((brand as JsonObject).name)
  return null
}

// ---------------------------------------------------------------------------
// Layer 2 — Open Graph / product meta tags
// ---------------------------------------------------------------------------

function extractFromMetaTags(): PartialProduct {
  return {
    title: meta('og:title') || meta('twitter:title'),
    image:
      meta('og:image:secure_url') ||
      meta('og:image') ||
      meta('twitter:image'),
    price: toNumber(
      meta('product:price:amount') ||
        meta('og:price:amount') ||
        meta('twitter:data1'),
    ),
    brand: meta('product:brand') || meta('og:brand'),
  }
}

function meta(property: string): string | null {
  const el =
    document.querySelector(`meta[property="${property}"]`) ||
    document.querySelector(`meta[name="${property}"]`)
  return el?.getAttribute('content') || null
}

// ---------------------------------------------------------------------------
// Layer 3 — common ecommerce selectors
// ---------------------------------------------------------------------------

const TITLE_SELECTORS = [
  '[itemprop="name"]',
  'h1[class*="product" i]',
  'h1[class*="title" i]',
  '.product-title',
  '.product-name',
  '#productTitle',
  'h1',
]

const PRICE_SELECTORS = [
  '[itemprop="price"]',
  '[data-testid*="price" i]',
  '[class*="price" i]',
  '.price',
  '#priceblock_ourprice',
]

const BRAND_SELECTORS = [
  '[itemprop="brand"]',
  '[class*="brand" i]',
  '.product-brand',
  '#bylineInfo',
]

const IMAGE_SELECTORS = [
  '[itemprop="image"]',
  'img[class*="product" i]',
  '.product-image img',
  '#landingImage',
  'main img',
]

function extractFromSelectors(): PartialProduct {
  return {
    title: textFrom(TITLE_SELECTORS),
    image: imgFrom(IMAGE_SELECTORS),
    price: toNumber(textFrom(PRICE_SELECTORS)),
    brand: textFrom(BRAND_SELECTORS),
  }
}

function textFrom(selectors: string[]): string | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (!el) continue
    const attrContent = el.getAttribute('content')
    const value = (attrContent || el.textContent || '').trim()
    if (value) return value
  }
  return null
}

function imgFrom(selectors: string[]): string | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (!el) continue
    const src =
      el.getAttribute('content') ||
      el.getAttribute('src') ||
      el.getAttribute('data-src') ||
      ''
    if (src && !src.startsWith('data:')) return src
  }
  return null
}

// ---------------------------------------------------------------------------
// Layer 4 — largest visible image fallback
// ---------------------------------------------------------------------------

function largestImage(): string | null {
  let best: { src: string; area: number } | null = null

  for (const img of Array.from(document.images)) {
    const src = img.currentSrc || img.src
    if (!src || src.startsWith('data:')) continue
    const rect = img.getBoundingClientRect()
    if (rect.width < 80 || rect.height < 80) continue
    const area = (img.naturalWidth || rect.width) * (img.naturalHeight || rect.height)
    if (!best || area > best.area) best = { src, area }
  }

  return best?.src ?? null
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function safe(fn: () => PartialProduct): PartialProduct {
  try {
    return fn() ?? {}
  } catch {
    return {}
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function toNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  // Strip currency symbols/thousands separators; keep the first decimal number.
  const match = String(value).replace(/[,\s](?=\d{3}\b)/g, '').match(/\d+(\.\d+)?/)
  if (!match) return null
  const n = parseFloat(match[0])
  return Number.isFinite(n) ? n : null
}

function firstNumber(values: Array<number | null | undefined>): number | null {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

function clean(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  return trimmed ? trimmed.slice(0, 200) : null
}

function absolutize(src: string | null): string | null {
  if (!src) return null
  try {
    return new URL(src, window.location.href).href
  } catch {
    return null
  }
}
