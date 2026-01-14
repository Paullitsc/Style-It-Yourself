/**
 * Color extraction from images using ColorThief
 * Extracts dominant colors and converts to our Color type
 */

import ColorThief from 'colorthief'
import { rgbToHex, rgbToHsl, getColorName } from './colorUtils'
import type { HSL } from '@/types'

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractedColor {
  hex: string
  hsl: HSL
  name: string
  isNeutral: boolean
}

// =============================================================================
// EXTRACTION
// =============================================================================

/**
 * Extract dominant colors from an image
 * @param imageSource - Image element, URL, or Blob
 * @param count - Number of colors to extract (default 3)
 */
export async function extractDominantColors(
  imageSource: HTMLImageElement | string | Blob,
  count: number = 3
): Promise<ExtractedColor[]> {
  const img = await loadImage(imageSource)
  const colorThief = new ColorThief()
  
  // Get color palette
  const palette = colorThief.getPalette(img, count + 2) // Get extra in case of duplicates
  
  if (!palette || palette.length === 0) {
    throw new Error('Could not extract colors from image')
  }
  
  // Convert and dedupe colors
  const colors: ExtractedColor[] = []
  const seenHues = new Set<number>()
  
  for (const [r, g, b] of palette) {
    const hex = rgbToHex(r, g, b)
    const hsl = rgbToHsl(r, g, b)
    
    // Skip if we already have a very similar hue (within 20 degrees)
    const roundedHue = Math.round(hsl.h / 20) * 20
    if (seenHues.has(roundedHue) && colors.length > 0) {
      continue
    }
    seenHues.add(roundedHue)
    
    const { name, isNeutral } = getColorName(hsl)
    
    colors.push({
      hex,
      hsl,
      name,
      isNeutral,
    })
    
    if (colors.length >= count) break
  }
  
  // If we don't have enough colors (rare), pad with what we have
  while (colors.length < count && palette.length > 0) {
    const [r, g, b] = palette[colors.length % palette.length]
    const hex = rgbToHex(r, g, b)
    const hsl = rgbToHsl(r, g, b)
    const { name, isNeutral } = getColorName(hsl)
    
    colors.push({ hex, hsl, name, isNeutral })
  }
  
  return colors
}

/**
 * Get single dominant color from image
 */
export async function getDominantColor(
  imageSource: HTMLImageElement | string | Blob
): Promise<ExtractedColor> {
  const img = await loadImage(imageSource)
  const colorThief = new ColorThief()
  
  const [r, g, b] = colorThief.getColor(img)
  const hex = rgbToHex(r, g, b)
  const hsl = rgbToHsl(r, g, b)
  const { name, isNeutral } = getColorName(hsl)
  
  return { hex, hsl, name, isNeutral }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Load image from various sources
 */
async function loadImage(source: HTMLImageElement | string | Blob): Promise<HTMLImageElement> {
  // If already an image element and loaded
  if (source instanceof HTMLImageElement) {
    if (source.complete && source.naturalWidth > 0) {
      return source
    }
    return waitForImageLoad(source)
  }
  
  // If Blob, create object URL
  if (source instanceof Blob) {
    const url = URL.createObjectURL(source)
    try {
      return await loadImageFromUrl(url)
    } finally {
      // Don't revoke immediately - ColorThief needs the image
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }
  
  // If string URL
  return loadImageFromUrl(source)
}

/**
 * Load image from URL
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    
    img.src = url
  })
}

/**
 * Wait for existing image element to load
 */
function waitForImageLoad(img: HTMLImageElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve(img)
      return
    }
    
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load'))
  })
}