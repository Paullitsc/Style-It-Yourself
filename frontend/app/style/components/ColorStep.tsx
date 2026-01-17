'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, ArrowRight, Sparkles, Plus, Copy, Check } from 'lucide-react'
import { extractDominantColors } from '@/lib/colorExtractor'
import { buildColorFromHex, hslToHex, hexToHsl } from '@/lib/colorUtils'
import { getRecommendations } from '@/lib/api'
import ColorPickerModal from './ColorPickerModal'

export default function ColorStep() {
  const { user } = useAuth()
  
  const {
    croppedImage,
    detectedColors,
    selectedColorIndex,
    adjustedColor,
    category,
    formality,
    aesthetics,
    setDetectedColors,
    selectColor,
    setAdjustedColor,
    setRecommendations,
    setLoadingRecommendations,
    setStep,
    setError,
  } = useStyleStore()

  const [isExtracting, setIsExtracting] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [hexInputValue, setHexInputValue] = useState('')
  const [copied, setCopied] = useState(false)

  // Extract colors on mount
  useEffect(() => {
    if (croppedImage && detectedColors.length === 0) {
      extractColors()
    }
  }, [croppedImage])

  // Sync hex input with adjusted color
  useEffect(() => {
    if (adjustedColor) {
      setHexInputValue(adjustedColor.hex)
    }
  }, [adjustedColor])

  const extractColors = async () => {
    if (!croppedImage) return

    setIsExtracting(true)
    try {
      const colors = await extractDominantColors(croppedImage.croppedBlob, 3)
      setDetectedColors(colors)
    } catch (error) {
      console.error('Error extracting colors:', error)
      setError('Failed to extract colors from image')
    } finally {
      setIsExtracting(false)
    }
  }

  // Handle color selection
  const handleColorSelect = useCallback((index: number) => {
    selectColor(index)
  }, [selectColor])

  // Handle brightness adjustment
  const handleBrightnessChange = useCallback((lightness: number) => {
    if (!adjustedColor) return
    
    const newHex = hslToHex(adjustedColor.hsl.h, adjustedColor.hsl.s, lightness)
    const newColor = buildColorFromHex(newHex)
    setAdjustedColor(newColor)
  }, [adjustedColor, setAdjustedColor])

  // Handle hex input
  const handleHexChange = useCallback((value: string) => {
    setHexInputValue(value)
    
    // Validate and update if valid hex
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const newColor = buildColorFromHex(value)
      setAdjustedColor(newColor)
    }
  }, [setAdjustedColor])

  // Handle copy hex
  const handleCopyHex = useCallback(() => {
    if (adjustedColor) {
      navigator.clipboard.writeText(adjustedColor.hex)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [adjustedColor])

  // Handle custom color from picker
  const handleCustomColor = useCallback((hex: string) => {
    const newColor = buildColorFromHex(hex)
    setAdjustedColor(newColor)
    setShowColorPicker(false)
  }, [setAdjustedColor])

  // Navigation
  const handleBack = useCallback(() => {
    setStep('metadata')
  }, [setStep])

  const handleConfirm = useCallback(async () => {
    if (!adjustedColor || !category) return

    setLoadingRecommendations(true)
    
    try {
      // Call API to get recommendations
      const response = await getRecommendations({
        base_color: adjustedColor,
        base_formality: formality,
        base_aesthetics: aesthetics,
        base_category: category,
      })
      
      setRecommendations(response.recommendations)
      setStep('build')
    } catch (error) {
      console.error('Error getting recommendations:', error)
      setError('Failed to get recommendations. Please try again.')
    } finally {
      setLoadingRecommendations(false)
    }
  }, [adjustedColor, category, formality, aesthetics, setRecommendations, setStep, setLoadingRecommendations, setError])

  return (
    <div className="py-8">
      {/* Title */}
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white mb-2">
          Confirm Color
        </h2>
        <p className="text-neutral-500 text-sm uppercase tracking-wide">
          Select the dominant color of this item
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start justify-center">
        
        {/* Left: Image Preview with color border */}
        <div className="w-full lg:w-auto flex justify-center lg:sticky lg:top-28">
          <div 
            className="w-64 h-80 rounded-lg overflow-hidden shadow-xl transition-all duration-300"
            style={{
              border: `3px solid ${adjustedColor?.hex || '#333'}`,
              boxShadow: adjustedColor 
                ? `0 0 30px ${adjustedColor.hex}40` 
                : 'none'
            }}
          >
            {croppedImage && (
              <img
                src={croppedImage.croppedUrl}
                alt="Your clothing item"
                className="w-full h-full object-contain bg-primary-800"
              />
            )}
          </div>
        </div>

        {/* Right: Color Controls */}
        <div className="w-full lg:w-[400px] space-y-8">
          
          {/* Detected Colors */}
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
                    onClick={() => handleColorSelect(index)}
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

          {/* Divider */}
          <div className="border-t border-primary-700" />

          {/* Brightness Adjustment */}
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
                
                {/* Custom Color Picker Button */}
                <button
                  onClick={() => setShowColorPicker(true)}
                  className="w-8 h-8 rounded-full bg-primary-700 hover:bg-primary-600 flex items-center justify-center transition-colors"
                  title="Pick custom color"
                >
                  <Plus size={14} className="text-neutral-400" />
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-primary-700" />

          {/* Hex Code */}
          {adjustedColor && (
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
                Hex Code
              </label>
              <div className="flex items-center gap-3">
                {/* Color Preview */}
                <div
                  className="w-10 h-10 rounded border border-primary-600"
                  style={{ backgroundColor: adjustedColor.hex }}
                />
                
                {/* Input */}
                <input
                  type="text"
                  value={hexInputValue}
                  onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
                  maxLength={7}
                  className="flex-1 px-4 py-3 bg-primary-800 border border-primary-700 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-accent-500 transition-colors"
                  placeholder="#000000"
                />
                
                {/* Copy Button */}
                <button
                  onClick={handleCopyHex}
                  className="px-4 py-3 bg-primary-800 border border-primary-700 text-neutral-400 hover:text-white hover:border-primary-600 transition-colors"
                >
                  {copied ? <Check size={16} className="text-success-500" /> : <Copy size={16} />}
                </button>
              </div>
              
              {/* Neutral Badge */}
              {adjustedColor.is_neutral && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary-800 rounded-full text-[10px] uppercase tracking-wider text-neutral-400 border border-primary-700">
                  <Check size={10} />
                  Neutral Color
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center items-center gap-4 mt-12">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-6 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {/* Try On Me Button - Disabled if not logged in */}
        <div className="relative group">
          <button
            disabled={!user}
            className={`
              flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest
              border transition-all duration-200
              ${user 
                ? 'bg-transparent text-accent-500 border-accent-500 hover:bg-accent-500 hover:text-primary-900' 
                : 'bg-transparent text-neutral-600 border-primary-700 cursor-not-allowed'
              }
            `}
          >
            <Sparkles size={14} />
            Try On Me
          </button>
          
          {/* Tooltip when disabled */}
          {!user && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-primary-800 border border-primary-700 text-neutral-400 text-[10px] uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Login required for AI Try-On
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary-700" />
            </div>
          )}
        </div>
        
        <button
          onClick={handleConfirm}
          disabled={!adjustedColor}
          className="group flex items-center gap-3 px-8 py-3 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-all"
        >
          Confirm & Continue
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && adjustedColor && (
        <ColorPickerModal
          initialColor={adjustedColor.hex}
          onSelect={handleCustomColor}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  )
}