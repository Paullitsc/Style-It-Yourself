'use client'

import { useCallback } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { CATEGORY_TAXONOMY, FORMALITY_LEVELS, AESTHETIC_TAGS } from '@/types'

export default function MetadataStep() {
  const {
    croppedImage,
    category,
    formality,
    aesthetics,
    ownership,
    setCategory,
    clearCategory,
    setFormality,
    toggleAesthetic,
    setOwnership,
    setStep,
    isMetadataValid,
  } = useStyleStore()

  const categoryL1Options = Object.keys(CATEGORY_TAXONOMY)
  const categoryL2Options = category?.l1 ? CATEGORY_TAXONOMY[category.l1] || [] : []

  // Navigation
  const handleBack = useCallback(() => {
    setStep('upload')
  }, [setStep])

  const handleNext = useCallback(() => {
    if (isMetadataValid()) {
      setStep('colors')
    }
  }, [isMetadataValid, setStep])

  // Category selection
  const handleL1Select = useCallback((l1: string) => {
    if (category?.l1 === l1) {
      clearCategory()
    } else {
      setCategory(l1, '')
    }
  }, [category, setCategory, clearCategory])

  const handleL2Select = useCallback((l2: string) => {
    if (category?.l1) {
      setCategory(category.l1, l2)
    }
  }, [category, setCategory])

  return (
    <div className="py-8">
      {/* Title */}
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white mb-2">
          Describe Your Item
        </h2>
        <p className="text-neutral-500 text-sm uppercase tracking-wide">
          Tell us about this piece
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start justify-center">
        
        {/* Left: Image Preview */}
        <div className="w-full lg:w-auto flex justify-center lg:sticky lg:top-28">
          <div className="w-64 h-80 bg-primary-800 rounded-lg overflow-hidden border border-primary-700 shadow-xl">
            {croppedImage && (
              <img
                src={croppedImage.croppedUrl}
                alt="Your clothing item"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>

        {/* Right: Form */}
        <div className="w-full lg:w-[480px] space-y-8">
          
          {/* Category L1 */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
              Category <span className="text-accent-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categoryL1Options.map((l1) => (
                <button
                  key={l1}
                  onClick={() => handleL1Select(l1)}
                  className={`
                    px-4 py-2.5 text-xs font-medium uppercase tracking-wider
                    border transition-all duration-200
                    ${category?.l1 === l1
                      ? 'bg-white text-primary-900 border-white'
                      : 'bg-transparent text-neutral-400 border-primary-600 hover:border-neutral-400 hover:text-white'
                    }
                  `}
                >
                  {l1}
                </button>
              ))}
            </div>
          </div>

          {/* Category L2 */}
          {category?.l1 && categoryL2Options.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
                Sub-Category <span className="text-accent-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {categoryL2Options.map((l2) => (
                  <button
                    key={l2}
                    onClick={() => handleL2Select(l2)}
                    className={`
                      px-4 py-2.5 text-xs font-medium uppercase tracking-wider
                      border transition-all duration-200
                      ${category?.l2 === l2
                        ? 'bg-accent-500 text-primary-900 border-accent-500'
                        : 'bg-transparent text-neutral-400 border-primary-600 hover:border-accent-500/50 hover:text-accent-500'
                      }
                    `}
                  >
                    {l2}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formality */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
              Formality <span className="text-accent-500">*</span>
            </label>
            <div className="space-y-3">
              {/* Slider */}
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={formality}
                onChange={(e) => setFormality(Number(e.target.value))}
                className="w-full h-1.5 bg-primary-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-webkit-slider-thumb]:shadow-lg
                "
              />
              {/* Labels */}
              <div className="flex justify-between text-[10px] uppercase tracking-wider">
                {Object.entries(FORMALITY_LEVELS).map(([level, label]) => (
                  <span
                    key={level}
                    className={`
                      transition-colors
                      ${Number(level) === formality ? 'text-white font-bold' : 'text-neutral-600'}
                    `}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Aesthetics */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-1">
              Aesthetics
            </label>
            <p className="text-[10px] text-neutral-600 mb-3">Select up to 3 that match</p>
            <div className="flex flex-wrap gap-2">
              {AESTHETIC_TAGS.map((tag) => {
                const isSelected = aesthetics.includes(tag)
                const isDisabled = aesthetics.length >= 3 && !isSelected
                
                return (
                  <button
                    key={tag}
                    onClick={() => toggleAesthetic(tag)}
                    disabled={isDisabled}
                    className={`
                      px-3 py-2 text-xs font-medium uppercase tracking-wider
                      border transition-all duration-200
                      ${isSelected
                        ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                        : isDisabled
                          ? 'bg-transparent text-neutral-700 border-primary-700 cursor-not-allowed'
                          : 'bg-transparent text-neutral-500 border-primary-600 hover:border-neutral-500 hover:text-neutral-300'
                      }
                    `}
                  >
                    {isSelected && <Check size={10} className="inline mr-1.5" />}
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Ownership */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
              Ownership
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setOwnership('owned')}
                className={`
                  flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest
                  border transition-all duration-200
                  ${ownership === 'owned'
                    ? 'bg-white text-primary-900 border-white'
                    : 'bg-transparent text-neutral-400 border-primary-600 hover:border-neutral-400'
                  }
                `}
              >
                I Own This
              </button>
              <button
                onClick={() => setOwnership('wishlist')}
                className={`
                  flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest
                  border transition-all duration-200
                  ${ownership === 'wishlist'
                    ? 'bg-white text-primary-900 border-white'
                    : 'bg-transparent text-neutral-400 border-primary-600 hover:border-neutral-400'
                  }
                `}
              >
                Wishlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center gap-4 mt-12">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-6 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        
        <button
          onClick={handleNext}
          disabled={!isMetadataValid()}
          className="group flex items-center gap-3 px-8 py-3 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-all"
        >
          Next Step
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}