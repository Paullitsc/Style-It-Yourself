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
