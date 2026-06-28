/** Minimal color helpers for the popup's confirmation palette. */
import type { Color, HSL } from './types'

const NEUTRAL_NAMES = new Set([
  'black',
  'white',
  'gray',
  'grey',
  'navy',
  'beige',
  'cream',
  'tan',
  'khaki',
])

export function hexToHsl(hex: string): HSL {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function colorFromHex(hex: string, name: string): Color {
  return {
    hex: hex.toUpperCase(),
    hsl: hexToHsl(hex),
    name,
    is_neutral: NEUTRAL_NAMES.has(name.toLowerCase()),
  }
}

/** A compact confirmation palette covering neutrals + primary fashion hues. */
export const COLOR_PALETTE: Color[] = [
  ['#000000', 'black'],
  ['#FFFFFF', 'white'],
  ['#808080', 'gray'],
  ['#0B1C2D', 'navy'],
  ['#D2B48C', 'tan'],
  ['#F5F5DC', 'beige'],
  ['#7B3F3F', 'red'],
  ['#2E5A88', 'blue'],
  ['#3F6F4F', 'green'],
  ['#C9A227', 'yellow'],
  ['#5B4B8A', 'purple'],
  ['#B5651D', 'orange'],
].map(([hex, name]) => colorFromHex(hex, name))

// ---------------------------------------------------------------------------
// Hue-based naming — hand-mirrored from frontend/src/lib/colorUtils.ts so an
// eyedropped pixel is named consistently with the web app's in-app picker.
// (Backend auto-detection uses color_harmony — a different namer — so the
// initial suggested color and an eyedropped value can use different names.)
// ---------------------------------------------------------------------------

const NEUTRAL_COLOR_DATA: Record<string, HSL> = {
  black: { h: 0, s: 0, l: 0 },
  white: { h: 0, s: 0, l: 100 },
  gray: { h: 0, s: 0, l: 50 },
  navy: { h: 210, s: 61, l: 11 },
  beige: { h: 60, s: 56, l: 91 },
  cream: { h: 57, s: 100, l: 91 },
  tan: { h: 34, s: 44, l: 69 },
  khaki: { h: 37, s: 29, l: 67 },
}

const COLOR_NAMES: Array<{ name: string; hue: [number, number]; satMin: number }> = [
  { name: 'Red', hue: [0, 15], satMin: 20 },
  { name: 'Red', hue: [345, 360], satMin: 20 },
  { name: 'Orange', hue: [15, 45], satMin: 20 },
  { name: 'Yellow', hue: [45, 65], satMin: 20 },
  { name: 'Lime', hue: [65, 80], satMin: 20 },
  { name: 'Green', hue: [80, 160], satMin: 20 },
  { name: 'Teal', hue: [160, 190], satMin: 20 },
  { name: 'Cyan', hue: [190, 210], satMin: 20 },
  { name: 'Blue', hue: [210, 250], satMin: 20 },
  { name: 'Indigo', hue: [250, 270], satMin: 20 },
  { name: 'Purple', hue: [270, 290], satMin: 20 },
  { name: 'Magenta', hue: [290, 320], satMin: 20 },
  { name: 'Pink', hue: [320, 345], satMin: 20 },
]

function rgbToHsl(r: number, g: number, b: number): HSL {
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
      default:
        h = ((r - g) / d + 4) / 6
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const h = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return h.length === 1 ? '0' + h : h
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function colorDistance(a: HSL, b: HSL): number {
  let hueDiff = Math.abs(a.h - b.h)
  if (hueDiff > 180) hueDiff = 360 - hueDiff
  return hueDiff * 0.5 + Math.abs(a.s - b.s) * 1.5 + Math.abs(a.l - b.l) * 2
}

function findClosestNeutral(hsl: HSL): { name: string; distance: number } | null {
  let closest: { name: string; distance: number } | null = null
  for (const [name, data] of Object.entries(NEUTRAL_COLOR_DATA)) {
    const distance = colorDistance(hsl, data)
    if (distance < 40 && (!closest || distance < closest.distance)) {
      closest = { name, distance }
    }
  }
  return closest
}

export function getColorName(hsl: HSL): { name: string; isNeutral: boolean } {
  const closest = findClosestNeutral(hsl)
  if (closest && closest.distance < 30) {
    return {
      name: closest.name.charAt(0).toUpperCase() + closest.name.slice(1),
      isNeutral: true,
    }
  }
  if (hsl.s < 10) {
    if (hsl.l < 20) return { name: 'Black', isNeutral: true }
    if (hsl.l > 85) return { name: 'White', isNeutral: true }
    return { name: 'Gray', isNeutral: true }
  }
  let baseName = 'Gray'
  for (const c of COLOR_NAMES) {
    if (hsl.h >= c.hue[0] && hsl.h < c.hue[1] && hsl.s >= c.satMin) {
      baseName = c.name
      break
    }
  }
  let modifier = ''
  if (hsl.l < 25) modifier = 'Dark '
  else if (hsl.l < 40) modifier = 'Deep '
  else if (hsl.l > 75) modifier = 'Light '
  else if (hsl.l > 60) modifier = 'Pale '
  if (hsl.s < 30 && hsl.s >= 10) modifier = 'Muted ' + modifier
  return { name: (modifier + baseName).trim(), isNeutral: false }
}

/** Build a full Color from a sampled RGB pixel (eyedropper). */
export function colorFromRgb(r: number, g: number, b: number): Color {
  const hsl = rgbToHsl(r, g, b)
  const { name, isNeutral } = getColorName(hsl)
  return { hex: rgbToHex(r, g, b), hsl, name, is_neutral: isNeutral }
}

/** Build a full Color from a hex string (manual fallback input). */
export function buildColorFromHex(hex: string): Color {
  const hsl = hexToHsl(hex)
  const { name, isNeutral } = getColorName(hsl)
  return { hex: hex.toUpperCase(), hsl, name, is_neutral: isNeutral }
}
