'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { hexToHsl, hslToHex } from '@/lib/colorUtils'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/cn'

interface ColorPickerModalProps {
  initialColor: string
  onSelect: (hex: string) => void
  onClose: () => void
}

export default function ColorPickerModal({
  initialColor,
  onSelect,
  onClose,
}: ColorPickerModalProps) {
  const initialHsl = hexToHsl(initialColor) || { h: 0, s: 0, l: 50 }

  const [hue, setHue] = useState(initialHsl.h)
  const [saturation, setSaturation] = useState(initialHsl.s)
  const [lightness, setLightness] = useState(initialHsl.l)

  const satLightRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const currentHex = hslToHex(hue, saturation, lightness)

  const handleSatLightChange = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      if (!satLightRef.current) return
      const rect = satLightRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      setSaturation(Math.round(x * 100))
      setLightness(Math.round((1 - y) * 100))
    },
    [],
  )

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) handleSatLightChange(event)
    }
    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleSatLightChange])

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Pick a color"
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSelect(currentHex)}
            className={cn(
              'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
              'border border-ink bg-ink text-paper',
              'font-mono text-[11px] uppercase tracking-[0.12em]',
              'transition-colors hover:bg-paper hover:text-ink',
            )}
          >
            <span>Select color</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* 2D saturation/lightness picker */}
        <div
          ref={satLightRef}
          onMouseDown={(event) => {
            setIsDragging(true)
            handleSatLightChange(event)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              setSaturation((v) => Math.max(0, v - 2))
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              setSaturation((v) => Math.min(100, v + 2))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setLightness((v) => Math.min(100, v + 2))
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setLightness((v) => Math.max(0, v - 2))
            }
          }}
          tabIndex={0}
          role="application"
          aria-label="Saturation and lightness selector"
          className="relative h-64 w-full cursor-crosshair border border-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
          style={{
            background: `
              linear-gradient(to top, #000, transparent),
              linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))
            `,
          }}
        >
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 border-2 border-paper"
            style={{
              left: `${saturation}%`,
              top: `${100 - lightness}%`,
              backgroundColor: currentHex,
            }}
            aria-hidden="true"
          />
        </div>

        {/* Hue */}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
            Hue
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(event) => setHue(Number(event.target.value))}
            aria-label="Hue"
            className={cn(
              'h-3 w-full cursor-pointer appearance-none',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
              '[&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:border-0',
              '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
              '[&::-moz-range-thumb]:bg-ink [&::-moz-range-thumb]:border-0',
            )}
            style={{
              background: `linear-gradient(to right,
                hsl(0, 100%, 50%),
                hsl(60, 100%, 50%),
                hsl(120, 100%, 50%),
                hsl(180, 100%, 50%),
                hsl(240, 100%, 50%),
                hsl(300, 100%, 50%),
                hsl(360, 100%, 50%)
              )`,
            }}
          />
        </div>

        {/* Preview + hex */}
        <div className="flex items-center gap-4">
          <i
            className="inline-block w-[56px] h-[56px] border border-ink"
            style={{ backgroundColor: currentHex }}
            aria-hidden="true"
          />
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2">
              Hex
            </div>
            <div className="font-mono text-[16px] tracking-[0.06em] text-ink border-b border-ink pb-1">
              {currentHex}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
