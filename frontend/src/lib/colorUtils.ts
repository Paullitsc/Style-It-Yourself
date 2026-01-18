/**
 * Color utility functions
 * Handles RGB/HSL/Hex conversions and color naming
 */

import type { HSL, Color } from '@/types'

// =============================================================================
// NEUTRAL COLOR DATA (from backend constants)
// =============================================================================

export const NEUTRAL_COLOR_DATA: Record<string, { hex: string; hsl: HSL }> = {
  black:  { hex: "#000000", hsl: { h: 0, s: 0, l: 0 } },
  white:  { hex: "#FFFFFF", hsl: { h: 0, s: 0, l: 100 } },
  gray:   { hex: "#808080", hsl: { h: 0, s: 0, l: 50 } },
  grey:   { hex: "#808080", hsl: { h: 0, s: 0, l: 50 } },
  navy:   { hex: "#0B1C2D", hsl: { h: 210, s: 61, l: 11 } },
  beige:  { hex: "#F5F5DC", hsl: { h: 60, s: 56, l: 91 } },
  cream:  { hex: "#FFFDD0", hsl: { h: 57, s: 100, l: 91 } },
  tan:    { hex: "#D2B48C", hsl: { h: 34, s: 44, l: 69 } },
  khaki:  { hex: "#C3B091", hsl: { h: 37, s: 29, l: 67 } },
}

// Extended color names for non-neutral colors
const COLOR_NAMES: Array<{ name: string; hue: [number, number]; satMin: number }> = [
  { name: "Red", hue: [0, 15], satMin: 20 },
  { name: "Red", hue: [345, 360], satMin: 20 },
  { name: "Orange", hue: [15, 45], satMin: 20 },
  { name: "Yellow", hue: [45, 65], satMin: 20 },
  { name: "Lime", hue: [65, 80], satMin: 20 },
  { name: "Green", hue: [80, 160], satMin: 20 },
  { name: "Teal", hue: [160, 190], satMin: 20 },
  { name: "Cyan", hue: [190, 210], satMin: 20 },
  { name: "Blue", hue: [210, 250], satMin: 20 },
  { name: "Indigo", hue: [250, 270], satMin: 20 },
  { name: "Purple", hue: [270, 290], satMin: 20 },
  { name: "Magenta", hue: [290, 320], satMin: 20 },
  { name: "Pink", hue: [320, 345], satMin: 20 },
]

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert RGB to Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Convert Hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    return { r: 0, g: 0, b: 0 }
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

/**
 * Convert HSL to Hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

/**
 * Convert Hex to HSL
 */
export function hexToHsl(hex: string): HSL {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

// =============================================================================
// COLOR DISTANCE & MATCHING
// =============================================================================

/**
 * Calculate color distance in HSL space (weighted)
 */
function colorDistance(hsl1: HSL, hsl2: HSL): number {
  // Hue is circular, so we need to handle wrap-around
  let hueDiff = Math.abs(hsl1.h - hsl2.h)
  if (hueDiff > 180) hueDiff = 360 - hueDiff
  
  const satDiff = Math.abs(hsl1.s - hsl2.s)
  const lightDiff = Math.abs(hsl1.l - hsl2.l)
  
  // Weight: lightness most important for neutrals, then saturation, then hue
  return (hueDiff * 0.5) + (satDiff * 1.5) + (lightDiff * 2)
}

/**
 * Check if a color is close to a neutral
 */
export function findClosestNeutral(hsl: HSL): { name: string; distance: number } | null {
  let closest: { name: string; distance: number } | null = null
  
  for (const [name, data] of Object.entries(NEUTRAL_COLOR_DATA)) {
    if (name === 'grey') continue // Skip duplicate
    
    const distance = colorDistance(hsl, data.hsl)
    
    // Threshold for considering it a neutral match
    // Lower lightness difference tolerance for better matching
    if (distance < 40 && (!closest || distance < closest.distance)) {
      closest = { name, distance }
    }
  }
  
  return closest
}

/**
 * Check if a color is neutral based on saturation and lightness
 */
export function isNeutralColor(hsl: HSL): boolean {
  // Very low saturation = neutral (gray scale)
  if (hsl.s < 15) return true
  
  // Check if it matches a known neutral
  const closestNeutral = findClosestNeutral(hsl)
  return closestNeutral !== null && closestNeutral.distance < 30
}

// =============================================================================
// COLOR NAMING
// =============================================================================

/**
 * Get a fashion-friendly color name
 * Priority: Neutral colors first, then hue-based names with modifiers
 */
export function getColorName(hsl: HSL): { name: string; isNeutral: boolean } {
  // First, check if it's a neutral
  const closestNeutral = findClosestNeutral(hsl)
  if (closestNeutral && closestNeutral.distance < 30) {
    return { 
      name: closestNeutral.name.charAt(0).toUpperCase() + closestNeutral.name.slice(1), 
      isNeutral: true 
    }
  }
  
  // Check for gray-scale (very low saturation)
  if (hsl.s < 10) {
    if (hsl.l < 20) return { name: "Black", isNeutral: true }
    if (hsl.l > 85) return { name: "White", isNeutral: true }
    return { name: "Gray", isNeutral: true }
  }
  
  // Find hue-based name
  let baseName = "Gray"
  for (const color of COLOR_NAMES) {
    if (hsl.h >= color.hue[0] && hsl.h < color.hue[1] && hsl.s >= color.satMin) {
      baseName = color.name
      break
    }
  }
  
  // Add lightness modifier
  let modifier = ""
  if (hsl.l < 25) {
    modifier = "Dark "
  } else if (hsl.l < 40) {
    modifier = "Deep "
  } else if (hsl.l > 75) {
    modifier = "Light "
  } else if (hsl.l > 60) {
    modifier = "Pale "
  }
  
  // Add saturation modifier for muted colors
  if (hsl.s < 30 && hsl.s >= 10) {
    modifier = "Muted " + modifier
  }
  
  return { 
    name: (modifier + baseName).trim(), 
    isNeutral: false 
  }
}

// =============================================================================
// BRIGHTNESS ADJUSTMENT
// =============================================================================

/**
 * Adjust brightness (lightness) of a color
 * @param hex - Original hex color
 * @param lightness - New lightness value (0-100)
 */
export function adjustBrightness(hex: string, lightness: number): string {
  const hsl = hexToHsl(hex)
  return hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(100, lightness)))
}

/**
 * Build a complete Color object from hex
 */
export function buildColorFromHex(hex: string): Color {
  const hsl = hexToHsl(hex)
  const { name, isNeutral } = getColorName(hsl)
  
  return {
    hex: hex.toUpperCase(),
    hsl,
    name,
    is_neutral: isNeutral,
  }
}