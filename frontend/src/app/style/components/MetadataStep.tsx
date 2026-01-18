'use client'

import { useCallback, useState } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { ArrowLeft, ArrowRight, ChevronDown, Tag, DollarSign, Link as LinkIcon } from 'lucide-react'
import { CATEGORY_TAXONOMY } from '@/types'
import CategorySelector from './shared/CategorySelector'
import FormalitySlider from './shared/FormalitySlider'
import AestheticsSelector from './shared/AestheticsSelector'

export default function MetadataStep() {
  const {
    croppedImage,
    category,
    formality,
    aesthetics,
    ownership,
    brand, price, sourceUrl,
    setCategory, clearCategory,
    setFormality, toggleAesthetic, setOwnership,
    setBrand, setPrice, setSourceUrl,
    setStep, isMetadataValid,
  } = useStyleStore()

  const [showOptional, setShowOptional] = useState(false)

  // Navigation
  const handleBack = useCallback(() => setStep('upload'), [setStep])
  const handleNext = useCallback(() => isMetadataValid() && setStep('colors'), [isMetadataValid, setStep])

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
          
          <CategorySelector 
            l1Options={Object.keys(CATEGORY_TAXONOMY)}
            l2Options={category?.l1 ? CATEGORY_TAXONOMY[category.l1] : []}
            selectedL1={category?.l1}
            selectedL2={category?.l2}
            onSelectL1={(l1) => category?.l1 === l1 ? clearCategory() : setCategory(l1, '')}
            onSelectL2={(l2) => category?.l1 && setCategory(category.l1, l2)}
          />

          <FormalitySlider 
            value={formality} 
            onChange={setFormality} 
          />

          <AestheticsSelector 
            selected={aesthetics} 
            onToggle={toggleAesthetic} 
          />

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

          {/* Optional Details Toggle */}
          <div className="border-t border-primary-800 pt-6">
            <button
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ChevronDown 
                size={16} 
                className={`transition-transform duration-200 ${showOptional ? 'rotate-180' : ''}`}
              />
              <span className="text-xs font-bold uppercase tracking-widest">
                Optional Details
              </span>
              {(brand || price || sourceUrl) && (
                <span className="ml-2 px-2 py-0.5 bg-accent-500/20 text-accent-500 text-[9px] uppercase rounded-full">
                  {[brand, price, sourceUrl].filter(Boolean).length} added
                </span>
              )}
            </button>

            {/* Optional Fields */}
            {showOptional && (
              <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                
                {/* Brand */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                    Brand
                  </label>
                  <div className="relative">
                    <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Nike, Zara, Uniqlo"
                      className="w-full pl-11 pr-4 py-3 bg-primary-800 border border-primary-700 text-white text-sm
                        placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                    Price
                  </label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-11 pr-4 py-3 bg-primary-800 border border-primary-700 text-white text-sm
                        placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Source URL */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                    Source URL
                  </label>
                  <div className="relative">
                    <LinkIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-11 pr-4 py-3 bg-primary-800 border border-primary-700 text-white text-sm
                        placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}
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