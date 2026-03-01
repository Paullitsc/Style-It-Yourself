'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { hexToHsl, hslToHex } from '@/lib/colorUtils'
import { Button, Modal } from '@/components/ui'

interface ColorPickerModalProps {
  initialColor: string
  onSelect: (hex: string) => void
  onClose: () => void
}

export default function ColorPickerModal({ initialColor, onSelect, onClose }: ColorPickerModalProps) {
  const initialHsl = hexToHsl(initialColor) || { h: 0, s: 0, l: 50 }

  const [hue, setHue] = useState(initialHsl.h)
  const [saturation, setSaturation] = useState(initialHsl.s)
  const [lightness, setLightness] = useState(initialHsl.l)

  const satLightRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const currentHex = hslToHex(hue, saturation, lightness)

  const handleSatLightChange = useCallback((event: React.MouseEvent | MouseEvent) => {
    if (!satLightRef.current) return

    const rect = satLightRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))

    setSaturation(Math.round(x * 100))
    setLightness(Math.round((1 - y) * 100))
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) handleSatLightChange(event)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

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
      title="Pick Color"
      size="sm"
      footer={
        <div className="flex justify-end gap-[var(--space-3)]">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSelect(currentHex)}>Select Color</Button>
        </div>
      }
    >
      <div className="space-y-[var(--space-6)]">
        <div
          ref={satLightRef}
          onMouseDown={(event) => {
            setIsDragging(true)
            handleSatLightChange(event)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              setSaturation((value) => Math.max(0, value - 2))
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              setSaturation((value) => Math.min(100, value + 2))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setLightness((value) => Math.min(100, value + 2))
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setLightness((value) => Math.max(0, value - 2))
            }
          }}
          tabIndex={0}
          role="application"
          aria-label="Saturation and lightness selector"
          className="relative h-64 w-full cursor-crosshair rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          style={{
            background: `
              linear-gradient(to top, #000, transparent),
              linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))
            `,
          }}
        >
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
            style={{
              left: `${saturation}%`,
              top: `${100 - lightness}%`,
              backgroundColor: currentHex,
            }}
          />
        </div>

        <div>
          <label className="mb-[var(--space-2)] block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Hue
          </label>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(event) => setHue(Number(event.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-full"
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
            aria-label="Hue slider"
          />
        </div>

        <div className="flex items-center gap-[var(--space-4)]">
          <div
            className="h-16 w-16 rounded-[var(--radius-md)] border border-primary-600"
            style={{ backgroundColor: currentHex }}
            aria-hidden="true"
          />
          <div className="flex-1">
            <label className="mb-[var(--space-1)] block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Hex Value
            </label>
            <div className="rounded-[var(--radius-md)] border border-primary-700 bg-primary-800 px-[var(--space-4)] py-[var(--space-2)] font-mono text-sm tracking-wider text-white">
              {currentHex}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
