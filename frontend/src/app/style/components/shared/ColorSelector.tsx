'use client'

import { useState, useEffect } from 'react'
import { Check, Plus, Copy } from 'lucide-react'
import { buildColorFromHex, hslToHex } from '@/lib/colorUtils'
import type { Color } from '@/types' // Corrected from ClothingColor

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
  isExtracting = false
}: ColorSelectorProps) {
  const [hexInput, setHexInput] = useState(adjustedColor?.hex || '')
  const [copied, setCopied] = useState(false)

  // Sync internal hex input when parent updates color
  useEffect(() => {
    if (adjustedColor) setHexInput(adjustedColor.hex)
  }, [adjustedColor])

  const handleBrightnessChange = (lightness: number) => {
    if (!adjustedColor) return
    const newHex = hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, lightness)
    const newColor = buildColorFromHex(newHex)
    onUpdateAdjusted(newColor)
  }

  const handleHexChange = (value: string) => {
    setHexInput(value)
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onUpdateAdjusted(buildColorFromHex(value))
    }
  }

  const handleCopyHex = () => {
    if (adjustedColor) {
      navigator.clipboard.writeText(adjustedColor.hex)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Detected Colors Grid */}
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-4">
          Detected Colors
        </label>
        
        {isExtracting ? (
          <div className="flex items-center gap-3 text-neutral-400">
            <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Analyzing image...</span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {detectedColors.map((color, index) => (
              <button
                key={index}
                onClick={() => onSelectDetected(index)}
                className="group flex flex-col items-center gap-2"
              >
                <div
                  className={`
                    w-16 h-16 rounded-full transition-all duration-200
                    ${selectedColorIndex === index 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-primary-900 scale-110' 
                      : 'hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: color.hex }}
                />
                <span className={`
                  text-[10px] uppercase tracking-wider transition-colors
                  ${selectedColorIndex === index ? 'text-white' : 'text-neutral-500'}
                `}>
                  {color.name}
                </span>
                {selectedColorIndex === index && (
                  <Check size={12} className="text-accent-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-primary-700" />

      {/* 2. Brightness Slider */}
      {adjustedColor && (
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-4">
            Adjust Brightness
          </label>
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase text-neutral-600">Darker</span>
            <input
              type="range"
              min={5}
              max={95}
              value={adjustedColor.hsl.l}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, 
                  ${hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, 5)}, 
                  ${hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, 50)}, 
                  ${hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, 95)}
                )`
              }}
            />
            <span className="text-[10px] uppercase text-neutral-600">Lighter</span>
            
            <button
              onClick={onOpenPicker}
              className="w-8 h-8 rounded-full bg-primary-700 hover:bg-primary-600 flex items-center justify-center transition-colors"
              title="Pick custom color"
            >
              <Plus size={14} className="text-neutral-400" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Hex Input */}
      {adjustedColor && (
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
            Hex Code
          </label>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded border border-primary-600"
              style={{ backgroundColor: adjustedColor.hex }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
              maxLength={7}
              className="flex-1 px-4 py-3 bg-primary-800 border border-primary-700 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-accent-500 transition-colors"
              placeholder="#000000"
            />
            <button
              onClick={handleCopyHex}
              className="px-4 py-3 bg-primary-800 border border-primary-700 text-neutral-400 hover:text-white hover:border-primary-600 transition-colors"
            >
              {copied ? <Check size={16} className="text-success-500" /> : <Copy size={16} />}
            </button>
          </div>
          
          {adjustedColor.is_neutral && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary-800 rounded-full text-[10px] uppercase tracking-wider text-neutral-400 border border-primary-700">
              <Check size={10} />
              Neutral Color
            </div>
          )}
        </div>
      )}
    </div>
  )
}