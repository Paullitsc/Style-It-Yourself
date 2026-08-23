'use client'

import { useMemo, useState } from 'react'
import type { PointerEvent } from 'react'
import {
  buildColorFromHex,
  getNeutralColors,
  hslToHex,
} from '@/lib/colorUtils'
import type { Color } from '@/types'
import Swatch from './Swatch'

// The wheel is 36 solid 10-degree segments with hard stops: quantized
// swatches, not a blended gradient, to stay inside the design system.
const SEGMENTS = 36
const WHEEL = `conic-gradient(${Array.from({ length: SEGMENTS }, (_, i) => {
  const start = (i * 360) / SEGMENTS
  const end = ((i + 1) * 360) / SEGMENTS
  return `hsl(${start + 180 / SEGMENTS} 62% 47%) ${start}deg ${end}deg`
}).join(', ')})`

// Ring cut: transparent center hole AND transparent outside edge, so the
// square div never shows corners and needs no border-radius.
const RING_MASK =
  'radial-gradient(closest-side, transparent 66%, #000 66.5% 99.5%, transparent 100%)'

// The veil hides everything the engine would reject. Arc positions are
// relative to the pointed hue (0deg = the pointer), so the stop list is
// static and only the gradient's `from` angle changes:
// 0±30 analogous, 120±15 and 240±15 triadic, 180±15 complementary.
const DIM = 'color-mix(in srgb, var(--paper-2) 88%, transparent)'
const VEIL_STOPS = [
  'transparent 0deg 30deg',
  `${DIM} 30deg 105deg`,
  'transparent 105deg 135deg',
  `${DIM} 135deg 165deg`,
  'transparent 165deg 195deg',
  `${DIM} 195deg 225deg`,
  'transparent 225deg 255deg',
  `${DIM} 255deg 330deg`,
  'transparent 330deg 360deg',
].join(', ')

const NEUTRALS = getNeutralColors()

// Same offsets the backend recommendation generator uses
// (get_analogous_hsl +/-30, get_complementary_hsl 180, get_triadic_hsl
// +/-120), rendered at the wheel's own saturation and lightness.
function colorAt(hue: number): Color {
  return buildColorFromHex(hslToHex(((hue % 360) + 360) % 360, 62, 47))
}

export default function ColorWheel() {
  const [hue, setHue] = useState(210)

  const readout = useMemo(
    () => ({
      base: colorAt(hue),
      analogous: [colorAt(hue - 30), colorAt(hue + 30)],
      complementary: [colorAt(hue + 180)],
      triadic: [colorAt(hue - 120), colorAt(hue + 120)],
    }),
    [hue]
  )

  const readHue = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    if (x === 0 && y === 0) return
    setHue(Math.round(((Math.atan2(y, x) * 180) / Math.PI + 450) % 360))
  }

  return (
    <div className="grid grid-cols-[auto_1fr] max-md:grid-cols-1 gap-x-20 gap-y-10 items-center">
      {/* WHEEL */}
      <div>
        <div
          role="img"
          aria-label={`Color wheel pointed at ${readout.base.name}, ${hue} degrees. The arcs that wear well with it stay lit; the rest is veiled.`}
          className="relative w-[320px] h-[320px] max-md:w-[260px] max-md:h-[260px] max-md:mx-auto cursor-crosshair touch-none select-none"
          onPointerMove={readHue}
          onPointerDown={readHue}
        >
          <div
            className="absolute inset-0"
            style={{ background: WHEEL, mask: RING_MASK, WebkitMask: RING_MASK }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `conic-gradient(from ${hue}deg, ${VEIL_STOPS})`,
              mask: RING_MASK,
              WebkitMask: RING_MASK,
            }}
          />
          {/* pointed-hue tick */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `rotate(${hue}deg)` }}
          >
            <div className="absolute left-1/2 top-[-1.5%] h-[21%] w-[2px] -translate-x-1/2 bg-ink" />
          </div>
        </div>
        <p className="mt-5 mb-0 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          Point anywhere on the wheel
        </p>
      </div>

      {/* READOUT */}
      <dl className="m-0 grid grid-cols-[130px_1fr] max-md:grid-cols-[104px_1fr] gap-y-5 gap-x-6 items-baseline font-mono text-[11px] uppercase tracking-[0.1em]">
        <dt className="text-ink-3">Pointed at</dt>
        <dd className="m-0">
          <Swatch color={readout.base} />
        </dd>

        <dt className="text-ink-3">Analogous</dt>
        <dd className="m-0 flex flex-wrap gap-x-8 gap-y-2">
          {readout.analogous.map((color) => (
            <Swatch key={color.hex} color={color} />
          ))}
        </dd>

        <dt className="text-ink-3">Complementary</dt>
        <dd className="m-0 flex flex-wrap gap-x-8 gap-y-2">
          {readout.complementary.map((color) => (
            <Swatch key={color.hex} color={color} />
          ))}
        </dd>

        <dt className="text-ink-3">Triadic</dt>
        <dd className="m-0 flex flex-wrap gap-x-8 gap-y-2">
          {readout.triadic.map((color) => (
            <Swatch key={color.hex} color={color} />
          ))}
        </dd>

        <dt className="text-ink-3">Neutral</dt>
        <dd className="m-0 flex items-center flex-wrap gap-[6px]">
          {NEUTRALS.map((color) => (
            <span
              key={color.hex}
              title={color.name}
              className="w-[13px] h-[13px] rounded-[2px] border border-rule-soft"
              style={{ backgroundColor: color.hex }}
            />
          ))}
          <span className="ml-3 text-ink-3">Always compatible</span>
        </dd>
      </dl>
    </div>
  )
}
