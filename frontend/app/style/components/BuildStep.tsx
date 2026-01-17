'use client'

import { useState, useCallback } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import { Plus, Sparkles, Check, ChevronRight } from 'lucide-react'
import type { CategoryRecommendation } from '@/types'

// Categories to show in side nav (excluding the base item's category)
const OUTFIT_CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear']

export default function BuildStep() {
  const { user } = useAuth()
  
  const {
    croppedImage,
    adjustedColor,
    category,
    formality,
    recommendations,
    isLoadingRecommendations,
  } = useStyleStore()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Filter out the base item's category from the nav
  const availableCategories = OUTFIT_CATEGORIES.filter(cat => cat !== category?.l1)

  // Get recommendation for selected category
  const selectedRecommendation = recommendations.find(
    rec => rec.category_l1 === selectedCategory
  )

  // Handle category click
  const handleCategoryClick = useCallback((cat: string) => {
    setSelectedCategory(cat === selectedCategory ? null : cat)
  }, [selectedCategory])

  // Get colors for a category from recommendations
  const getCategoryColors = (cat: string) => {
    const rec = recommendations.find(r => r.category_l1 === cat)
    return rec?.colors.slice(0, 3) || []
  }

  if (isLoadingRecommendations) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-400 text-sm uppercase tracking-wider">
            Generating recommendations...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)]">
      
      {/* LEFT: Category Side Nav */}
      <div className="w-64 border-r border-primary-800 py-6 pr-6">
        
        {/* Your Item (Base) */}
        <div className="mb-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-600 px-4">
            Your Item
          </span>
          <div className="mt-3 px-4 py-3 bg-primary-800/50 border-l-2 border-accent-500">
            <div className="flex items-center gap-3">
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded bg-primary-700 overflow-hidden flex-shrink-0">
                {croppedImage && (
                  <img
                    src={croppedImage.croppedUrl}
                    alt="Base item"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">
                  {category?.l2 || category?.l1}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-3 h-3 rounded-full border border-primary-600"
                    style={{ backgroundColor: adjustedColor?.hex }}
                  />
                  <span className="text-[10px] text-neutral-500 truncate">
                    {adjustedColor?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-primary-800 mx-4 mb-6" />

        {/* Category Nav Items */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-600 px-4 mb-3 block">
            Add Items
          </span>
          
          {availableCategories.map((cat) => {
            const colors = getCategoryColors(cat)
            const isSelected = selectedCategory === cat
            const hasRecommendation = recommendations.some(r => r.category_l1 === cat)
            
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`
                  w-full px-4 py-3 flex items-center justify-between
                  transition-all duration-200 text-left
                  ${isSelected 
                    ? 'bg-primary-800 border-l-2 border-accent-500' 
                    : 'hover:bg-primary-800/50 border-l-2 border-transparent'
                  }
                `}
              >
                <div>
                  <span className={`
                    text-xs font-bold uppercase tracking-wider
                    ${isSelected ? 'text-white' : 'text-neutral-400'}
                  `}>
                    {cat}
                  </span>
                  
                  {/* Color dots preview */}
                  {hasRecommendation && colors.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <ChevronRight 
                  size={14} 
                  className={`
                    transition-transform
                    ${isSelected ? 'rotate-90 text-accent-500' : 'text-neutral-600'}
                  `}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT: Main Content Area */}
      <div className="flex-1 p-8">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-2">
            Build Your Outfit
          </h2>
          <p className="text-neutral-500 text-sm">
            Click a category on the left to see matching recommendations
          </p>
        </div>

        {selectedCategory && selectedRecommendation ? (
          // Show recommendation details
          <div className="max-w-2xl animate-in fade-in slide-in-from-right-4 duration-300">
            <RecommendationPanel recommendation={selectedRecommendation} />
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-20 h-20 rounded-full bg-primary-800 flex items-center justify-center mb-6">
              <Plus size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-widest text-neutral-400 mb-2">
              Select a Category
            </h3>
            <p className="text-neutral-600 text-sm max-w-sm">
              Choose a category from the sidebar to see color and style recommendations that complement your base item
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// RECOMMENDATION PANEL
// =============================================================================

function RecommendationPanel({ recommendation }: { recommendation: CategoryRecommendation }) {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      {/* Category Title */}
      <div>
        <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-1">
          {recommendation.category_l1}
        </h3>
        <p className="text-neutral-500 text-sm">
          {recommendation.example}
        </p>
      </div>

      {/* Colors That Work */}
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-4">
          Colors That Work
        </label>
        <div className="flex flex-wrap gap-3">
          {recommendation.colors.map((color, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div
                className="w-14 h-14 rounded-full border-2 border-primary-700 shadow-lg"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                {color.name}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-primary-500 bg-primary-800 px-2 py-0.5 rounded-full">
                {color.harmony_type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Styles */}
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
          Suggested Styles
        </label>
        <div className="flex flex-wrap gap-2">
          {recommendation.suggested_l2.map((style) => (
            <span
              key={style}
              className="px-3 py-1.5 bg-primary-800 border border-primary-700 text-neutral-300 text-xs uppercase tracking-wider"
            >
              {style}
            </span>
          ))}
        </div>
      </div>

      {/* Formality Range */}
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
          Formality Range
        </label>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-primary-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-600 to-accent-400"
              style={{
                marginLeft: `${(recommendation.formality_range.min - 1) * 25}%`,
                width: `${(recommendation.formality_range.max - recommendation.formality_range.min + 1) * 25}%`,
              }}
            />
          </div>
          <span className="text-xs text-neutral-400 w-16 text-right">
            {recommendation.formality_range.min} - {recommendation.formality_range.max}
          </span>
        </div>
      </div>

      {/* Aesthetics */}
      {recommendation.aesthetics.length > 0 && (
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
            Matching Aesthetics
          </label>
          <div className="flex flex-wrap gap-2">
            {recommendation.aesthetics.map((aesthetic) => (
              <span
                key={aesthetic}
                className="px-3 py-1.5 bg-accent-500/10 border border-accent-500/30 text-accent-500 text-xs uppercase tracking-wider"
              >
                {aesthetic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Button */}
      <div className="pt-4 border-t border-primary-800">
        <button className="group flex items-center gap-3 px-6 py-3 bg-white text-primary-900 hover:bg-neutral-200 text-xs font-bold uppercase tracking-widest transition-all">
          <Plus size={14} />
          Add {recommendation.category_l1}
        </button>
        
        <p className="mt-3 text-[10px] text-neutral-600">
          Upload an image to add this item to your outfit
        </p>
      </div>
    </div>
  )
}