'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { extractDominantColors } from '@/lib/colorExtractor'
import { buildColorFromHex } from '@/lib/colorUtils'
import { getRecommendations } from '@/lib/api'
import ColorSelector from './shared/ColorSelector'
import ColorPickerModal from './shared/ColorPickerModal' // Ensure you moved this file
import TryOnModal from './TryOnModal'
import AuthModal from '@/components/AuthModal'

export default function ColorStep() {
  const { user, session } = useAuth()
  
  const {
    croppedImage,
    detectedColors,
    selectedColorIndex,
    adjustedColor,
    category,
    formality,
    aesthetics,
    isLoadingRecommendations,
    error,
    setDetectedColors,
    selectColor,
    setAdjustedColor,
    setRecommendations,
    setLoadingRecommendations,
    setStep,
    setError,
    setTryOnResult,
  } = useStyleStore()

  const [isExtracting, setIsExtracting] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Extract colors on mount
  useEffect(() => {
    if (croppedImage && detectedColors.length === 0) {
      extractColors()
    }
  }, [croppedImage])

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

  // Handle Try On Me click
  const handleTryOnClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowTryOnModal(true)
  }, [user])

  // Handle try-on completion - save result to store
  const handleTryOnComplete = useCallback((resultUrl: string) => {
    if (category?.l1) {
      console.log('[ColorStep] Try-on completed, saving result for category:', category.l1)
      setTryOnResult(category.l1, resultUrl)
    }
  }, [category, setTryOnResult])

  // Navigation
  const handleBack = useCallback(() => {
    setStep('metadata')
  }, [setStep])

  const handleConfirm = useCallback(async () => {
    if (!adjustedColor || !category) return

    setError(null)
    setLoadingRecommendations(true)
    
    try {
      // Call API to get recommendations
      const response = await getRecommendations({
        base_color: adjustedColor,
        base_formality: formality,
        base_aesthetics: aesthetics,
        base_category: category,
        filled_categories: [category.l1], // Base item category is already filled
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
        <div className="w-full lg:w-[400px]">
          <ColorSelector
            detectedColors={detectedColors.map(color => ({
              hex: color.hex,
              hsl: color.hsl,
              name: color.name,
              is_neutral: color.isNeutral,
            }))}
            selectedColorIndex={selectedColorIndex}
            adjustedColor={adjustedColor}
            onSelectDetected={selectColor}
            onUpdateAdjusted={setAdjustedColor}
            onOpenPicker={() => setShowColorPicker(true)}
            isExtracting={isExtracting}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-md mx-auto mt-6 p-4 bg-error-500/10 border border-error-500/30 rounded-lg">
          <p className="text-sm text-error-400 text-center">{error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-center items-center gap-4 mt-12">
        <button
          onClick={handleBack}
          disabled={isLoadingRecommendations}
          className="flex items-center gap-2 px-6 py-3 text-neutral-400 hover:text-white disabled:opacity-50 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {/* Try On Me Button */}
        <button
          onClick={handleTryOnClick}
          disabled={isLoadingRecommendations || !adjustedColor || !croppedImage}
          className={`
            flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest
            border transition-all duration-200
            ${!isLoadingRecommendations && adjustedColor && croppedImage
              ? 'bg-transparent text-accent-500 border-accent-500 hover:bg-accent-500 hover:text-primary-900' 
              : 'bg-transparent text-neutral-600 border-primary-700 cursor-not-allowed'
            }
          `}
        >
          <Sparkles size={14} />
          Try On Me
        </button>
        
        <button
          onClick={handleConfirm}
          disabled={!adjustedColor || isLoadingRecommendations}
          className="group flex items-center gap-3 px-8 py-3 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-all"
        >
          {isLoadingRecommendations ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Confirm & Continue
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && adjustedColor && (
        <ColorPickerModal
          initialColor={adjustedColor.hex}
          onSelect={(hex) => {
            const color = buildColorFromHex(hex)
            setAdjustedColor(color)
            setShowColorPicker(false)
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {/* Try On Modal */}
      {showTryOnModal && adjustedColor && category && croppedImage && session?.access_token && (
        <TryOnModal
          item={{
            color: adjustedColor,
            category: category,
            formality: formality,
            aesthetics: aesthetics,
          }}
          itemImageUrl={croppedImage.croppedUrl}
          itemImageBlob={croppedImage.croppedBlob}
          token={session.access_token}
          onClose={() => setShowTryOnModal(false)}
          onTryOnComplete={handleTryOnComplete}
        />
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  )
}