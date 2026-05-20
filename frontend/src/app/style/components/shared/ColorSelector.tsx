'use client'

import { useState, useEffect } from 'react'
import { buildColorFromHex, hslToHex } from '@/lib/colorUtils'
import type { Color } from '@/types'
import { cn } from '@/lib/cn'

interface ColorSelectorProps {
  detectedColors: Color[]
  selectedColorIndex: number
  adjustedColor: Color | null
  onSelectDetected: (index: number) => void
  onUpdateAdjusted: (color: Color) => void
  onOpenPicker: () => void
  isExtracting?: boolean
}

export default function ColorSelector({
  detectedColors,
  selectedColorIndex,
  adjustedColor,
  onSelectDetected,
  onUpdateAdjusted,
  onOpenPicker,
  isExtracting = false,
}: ColorSelectorProps) {
  const [hexInput, setHexInput] = useState(adjustedColor?.hex || '')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (adjustedColor) setHexInput(adjustedColor.hex)
  }, [adjustedColor])

  const handleBrightnessChange = (lightness: number) => {
    if (!adjustedColor) return
    const newHex = hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, lightness)
    onUpdateAdjusted(buildColorFromHex(newHex))
  }

  const handleHexChange = (value: string) => {
    setHexInput(value)
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onUpdateAdjusted(buildColorFromHex(value))
    }
  }

  const handleCopyHex = async () => {
    if (!adjustedColor) return
    try {
      await navigator.clipboard.writeText(adjustedColor.hex)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Detected colors */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-4">
          Detected colors
        </div>

        {isExtracting ? (
          <div className="font-display italic text-[16px] text-ink-2">
            Analyzing image…
          </div>
        ) : (
          <div className="flex items-start gap-6">
            {detectedColors.map((color, index) => {
              const isActive = selectedColorIndex === index
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectDetected(index)}
                  aria-pressed={isActive}
                  className="group flex flex-col items-center gap-2"
                >
                  <span
                    className={cn(
                      'inline-block w-[56px] h-[56px] border transition-all',
                      isActive
                        ? 'border-ink border-2'
                        : 'border-ink/40 group-hover:border-ink',
                    )}
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'font-mono text-[10px] uppercase tracking-[0.08em] pb-[2px] border-b transition-colors',
                      isActive
                        ? 'text-ink font-bold border-ink'
                        : 'text-ink-3 font-normal border-transparent group-hover:text-ink group-hover:border-ink',
                    )}
                  >
                    {color.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <hr className="border-t border-rule-soft" />

      {/* Brightness */}
      {adjustedColor && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-4">
            Adjust brightness
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 shrink-0">
              Darker
            </span>
            <input
              type="range"
              min={5}
              max={95}
              value={adjustedColor.hsl.l}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              aria-label="Brightness"
              className={cn(
                'flex-1 h-2 appearance-none cursor-pointer',
                '[&::-webkit-slider-thumb]:appearance-none',
                '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
                '[&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:border-0',
                '[&::-webkit-slider-thumb]:cursor-grab',
                '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
                '[&::-moz-range-thumb]:bg-ink [&::-moz-range-thumb]:border-0',
              )}
              style={{
                background: `linear-gradient(to right,
                  ${hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, 5)},
                  ${hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, 50)},
                  ${hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, 95)})`,
              }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 shrink-0">
              Lighter
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenPicker}
            className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 pb-[2px] border-b border-transparent hover:border-ink hover:text-ink transition-colors"
          >
            + Pick a custom color
          </button>
        </div>
      )}

      {adjustedColor && <hr className="border-t border-rule-soft" />}

      {/* Hex */}
      {adjustedColor && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
            Hex
          </div>
          <div className="flex items-center gap-3">
            <i
              className="inline-block w-[36px] h-[36px] border border-ink"
              style={{ backgroundColor: adjustedColor.hex }}
              aria-hidden="true"
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
              maxLength={7}
              className="flex-1 bg-transparent font-mono text-[14px] tracking-[0.06em] text-ink border-b border-ink py-2 focus:outline-none"
              placeholder="#000000"
              aria-label="Hex color code"
            />
            <button
              type="button"
              onClick={handleCopyHex}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 pb-[2px] border-b border-transparent hover:border-ink hover:text-ink transition-colors"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {adjustedColor.is_neutral && (
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
              <em className="italic">Neutral.</em>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
