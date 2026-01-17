'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { hexToHsl, hslToHex } from '@/lib/colorUtils'

interface ColorPickerModalProps {
  initialColor: string
  onSelect: (hex: string) => void
  onClose: () => void
}

export default function ColorPickerModal({ initialColor, onSelect, onClose }: ColorPickerModalProps) {
  // Safe default if initialColor is invalid
  const initialHsl = hexToHsl(initialColor) || { h: 0, s: 0, l: 50 }
  
  const [hue, setHue] = useState(initialHsl.h)
  const [saturation, setSaturation] = useState(initialHsl.s)
  const [lightness, setLightness] = useState(initialHsl.l)
  
  const satLightRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const currentHex = hslToHex(hue, saturation, lightness)

  // Handle saturation/lightness picker
  const handleSatLightChange = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!satLightRef.current) return
    
    const rect = satLightRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    
    setSaturation(Math.round(x * 100))
    setLightness(Math.round((1 - y) * 100))
  }, [])

  // Mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSatLightChange(e)
      }
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
    <div className="fixed inset-0 bg-primary-900/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-primary-900 w-full max-w-md mx-4 border border-primary-700 shadow-2xl animate-in fade-in zoom-in duration-200 rounded-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-800">
          <h3 className="text-lg font-bold uppercase tracking-widest text-white">
            Pick Color
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Picker Area */}
        <div className="p-6 space-y-6">
          
          {/* Saturation/Lightness Square */}
          <div
            ref={satLightRef}
            onMouseDown={(e) => {
              setIsDragging(true)
              handleSatLightChange(e)
            }}
            className="relative w-full h-64 rounded cursor-crosshair"
            style={{
              background: `
                linear-gradient(to top, #000, transparent),
                linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))
              `
            }}
          >
            {/* Indicator */}
            <div
              className="absolute w-4 h-4 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-lg"
              style={{
                left: `${saturation}%`,
                top: `${100 - lightness}%`,
                backgroundColor: currentHex,
              }}
            />
          </div>

          {/* Hue Slider */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
              Hue
            </label>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, 
                  hsl(0, 100%, 50%), 
                  hsl(60, 100%, 50%), 
                  hsl(120, 100%, 50%), 
                  hsl(180, 100%, 50%), 
                  hsl(240, 100%, 50%), 
                  hsl(300, 100%, 50%), 
                  hsl(360, 100%, 50%)
                )`
              }}
            />
          </div>

          {/* Preview & Hex */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded border border-primary-600"
              style={{ backgroundColor: currentHex }}
            />
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-1">
                Hex Value
              </label>
              <div className="px-4 py-2 bg-primary-800 border border-primary-700 text-white font-mono text-sm tracking-wider">
                {currentHex}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-primary-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(currentHex)}
            className="px-6 py-2.5 bg-white text-primary-900 hover:bg-neutral-200 text-xs font-bold uppercase tracking-widest transition-all"
          >
            Select Color
          </button>
        </div>
      </div>
    </div>
  )
}