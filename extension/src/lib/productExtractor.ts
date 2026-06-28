/**
 * Layered product extraction, run in the page context by the content script.
 *
 * Precedence (most reliable first):
 *   1. JSON-LD `Product` schema
 *   2. Open Graph / product meta tags
 *   3. Common ecommerce DOM selectors
 *   4. Largest visible images fallback
 *   5. Current page URL as source_url
 *
 * Each layer contributes a LIST of candidate image URLs; they are merged in
 * precedence order, absolutized, deduped, ranked (junk last), and capped so the
 * popup can offer an image picker. `image` is kept as `images[0]` for
 * back-compat. Everything is defensive — any individual layer may throw or
 * return junk on a random page, so each is wrapped and merged by precedence.
 */
import type { RawProduct } from './types'

interface PartialProduct {
  title?: string | null
  images?: string[]
  price?: number | null
  brand?: string | null
}

const MAX_CANDIDATES = 8

export function extractProduct(): RawProduct {
  const url = window.location.href

  const jsonLd = safe(extractFromJsonLd)
  const og = safe(extractFromMetaTags)
  const dom = safe(extractFromSelectors)

  const title = jsonLd.title || og.title || dom.title || document.title || null
  const price = firstNumber([jsonLd.price, og.price, dom.price])
  const brand = jsonLd.brand || og.brand || dom.brand || null

  // Merge image candidates in precedence order, absolutize, dedupe, rank, cap.
  const candidates = [
    ...(jsonLd.images ?? []),
    ...(og.images ?? []),
    ...(dom.images ?? []),
    ...largeImages(),
  ]
    .map(absolutize)
    .filter((u): u is string => !!u)

  const images = rankImages(dedupeImages(candidates)).slice(0, MAX_CANDIDATES)

  return {
    title: clean(title),
    images,
    image: images[0] ?? null,
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
        images: collectImages(product.image),
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

/** Flatten every image URL from a JSON-LD `image` value (string / array / ImageObject). */
function collectImages(image: unknown): string[] {
  if (!image) return []
  if (typeof image === 'string') return [image]
  if (Array.isArray(image)) return image.flatMap(collectImages)
  if (typeof image === 'object') {
    const obj = image as JsonObject
    if (typeof obj.url === 'string') return [obj.url]
    if (Array.isArray(obj['@list'])) return collectImages(obj['@list'])
  }
  return []
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
    images: [
      ...metaAll('og:image:secure_url'),
      ...metaAll('og:image'),
      ...metaAll('twitter:image'),
    ],
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

function metaAll(property: string): string[] {
  const sel = `meta[property="${property}"], meta[name="${property}"]`
  return Array.from(document.querySelectorAll(sel))
    .map((el) => el.getAttribute('content') || '')
    .filter(Boolean)
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
    images: imgsFrom(IMAGE_SELECTORS),
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

function imgsFrom(selectors: string[]): string[] {
  const out: string[] = []
  for (const selector of selectors) {
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const url = bestImgUrl(el)
      if (url) out.push(url)
    }
  }
  return out
}

function bestImgUrl(el: Element): string | null {
  // <img>: prefer the rendered currentSrc, then the largest srcset variant,
  // then src/data-src. Non-img (e.g. meta[itemprop=image]): content/src.
  if (el instanceof HTMLImageElement) {
    const fromSrcset = largestFromSrcset(el.getAttribute('srcset'))
    return validImg(
      el.currentSrc ||
        fromSrcset ||
        el.getAttribute('src') ||
        el.getAttribute('data-src') ||
        '',
    )
  }
  return validImg(
    el.getAttribute('content') ||
      el.getAttribute('src') ||
      el.getAttribute('data-src') ||
      '',
  )
}

function validImg(src: string): string | null {
  if (!src) return null
  if (src.startsWith('data:') || src.startsWith('blob:')) return null
  return src
}

function largestFromSrcset(srcset: string | null): string | null {
  if (!srcset) return null
  // "url1 320w, url2 640w" or "url1 1x, url2 2x" — pick the largest descriptor.
  let best: { url: string; size: number } | null = null
  for (const part of srcset.split(',')) {
    const [url, descriptor] = part.trim().split(/\s+/)
    if (!url) continue
    const size = descriptor ? parseFloat(descriptor) : 1
    const n = Number.isFinite(size) ? size : 1
    if (!best || n > best.size) best = { url, size: n }
  }
  return best?.url ?? null
}

// ---------------------------------------------------------------------------
// Layer 4 — largest visible images fallback
// ---------------------------------------------------------------------------

function largeImages(): string[] {
  const scored: { src: string; area: number }[] = []
  for (const img of Array.from(document.images)) {
    const src = img.currentSrc || img.src
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue
    const rect = img.getBoundingClientRect()
    if (rect.width < 80 || rect.height < 80) continue
    const nW = img.naturalWidth
    const nH = img.naturalHeight
    // Skip clearly-small intrinsic images; for not-yet-loaded lazy images (no
    // intrinsic size) only trust the layout box if it is itself large, so a
    // placeholder-sized box can't outrank a real full-res photo.
    if (nW && nW < 200) continue
    if (nH && nH < 200) continue
    if (!nW && !nH && (rect.width < 200 || rect.height < 200)) continue
    const w = nW || rect.width
    const h = nH || rect.height
    scored.push({ src, area: w * h })
  }
  scored.sort((a, b) => b.area - a.area)
  return scored.map((s) => s.src)
}

// ---------------------------------------------------------------------------
// candidate merging
// ---------------------------------------------------------------------------

const JUNK_PATH = /(logo|icon|sprite|thumb|placeholder|favicon|spinner|loading)/i

function normalizeForDedupe(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    // Collapse common CDN resize/crop params so resolution variants merge.
    for (const p of ['w', 'width', 'h', 'height', 'q', 'quality', 'crop', 'fit', 'dpr', 'sw', 'sh']) {
      u.searchParams.delete(p)
    }
    return u.origin + u.pathname + u.search
  } catch {
    return url
  }
}

function dedupeImages(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of urls) {
    const key = normalizeForDedupe(url)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url)
  }
  return out
}

/** Stable ranking: keep precedence order, push likely-junk URLs to the back. */
function rankImages(urls: string[]): string[] {
  const good = urls.filter((u) => !JUNK_PATH.test(u))
  const suspect = urls.filter((u) => JUNK_PATH.test(u))
  return [...good, ...suspect]
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
