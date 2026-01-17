'use client'

import { useCallback, useMemo, useState } from 'react'
import { useStyleStore, REQUIRED_CATEGORIES, OPTIONAL_CATEGORIES } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import OutfitSlot from './OutfitSlot'
import AddItemModal from './AddItemModal'
import TryOnModal from './TryOnModal'
import ItemDetailModal from './ItemDetailModal'
import type { ClothingItemCreate, CategoryRecommendation } from '@/types'

export default function BuildStep() {
  const { session } = useAuth()
  
  const {
    // Base item
    getBaseItem,
    category: baseCategory,
    croppedImage: baseCroppedImage,
    recommendations,
    // Outfit
    outfitItems,
    addingCategory,
    getFilledCategories,
    isOutfitComplete,
    tryOnResults,
    getTryOnForCategory,
    setTryOnResult,
    // Actions
    startAddingItem,
    cancelAddingItem,
    removeOutfitItem,
    setStep,
  } = useStyleStore()

  const [viewingTryOn, setViewingTryOn] = useState<{
    categoryL1: string
    item: ClothingItemCreate
    imageUrl: string
    imageBlob: Blob
    tryOnUrl: string
  } | null>(null)

  const [viewingItem, setViewingItem] = useState<{
    categoryL1: string
    item: ClothingItemCreate
    isBase: boolean
  } | null>(null)

  const [tryingOnFromDetail, setTryingOnFromDetail] = useState<{
    categoryL1: string
    item: ClothingItemCreate
    imageUrl: string
    imageBlob: Blob
  } | null>(null)

  const baseItem = getBaseItem()
  const filledCategories = getFilledCategories()
  const outfitComplete = isOutfitComplete()

  // Get item for a category (either base or from outfitItems)
  const getItemForCategory = useCallback((categoryL1: string): ClothingItemCreate | null => {
    if (baseCategory?.l1 === categoryL1) {
      return baseItem
    }
    const found = outfitItems.find(oi => oi.item.category.l1 === categoryL1)
    return found ? found.item : null
  }, [baseCategory, baseItem, outfitItems])

  // Get image blob for a category
  const getImageBlobForCategory = useCallback((categoryL1: string): Blob | null => {
    if (baseCategory?.l1 === categoryL1 && baseCroppedImage) {
      return baseCroppedImage.croppedBlob
    }
    const found = outfitItems.find(oi => oi.item.category.l1 === categoryL1)
    return found ? found.imageBlob : null
  }, [baseCategory, baseCroppedImage, outfitItems])

  // Get recommendation for a category
  const getRecommendationForCategory = useCallback((categoryL1: string): CategoryRecommendation | null => {
    return recommendations.find(rec => rec.category_l1 === categoryL1) || null
  }, [recommendations])

  // Separate required and optional categories, with base first in required
  const { requiredCategories, optionalCategories } = useMemo(() => {
    const baseCat = baseCategory?.l1
    
    // Required: base first (if it's required), then others
    let required = [...REQUIRED_CATEGORIES]
    if (baseCat && REQUIRED_CATEGORIES.includes(baseCat)) {
      required = [baseCat, ...REQUIRED_CATEGORIES.filter(c => c !== baseCat)]
    }
    
    // Optional: filter out base if it happens to be in optional (shouldn't happen but safe)
    const optional = OPTIONAL_CATEGORIES.filter(c => c !== baseCat)
    
    return { requiredCategories: required, optionalCategories: optional }
  }, [baseCategory])

  // Handle slot click (empty slot)
  const handleSlotClick = useCallback((categoryL1: string) => {
    if (filledCategories.includes(categoryL1)) {
      return
    }
    startAddingItem(categoryL1)
  }, [filledCategories, startAddingItem])

  // Handle item click (filled slot) - view details
  const handleItemClick = useCallback((categoryL1: string) => {
    const item = getItemForCategory(categoryL1)
    if (item) {
      setViewingItem({
        categoryL1,
        item,
        isBase: baseCategory?.l1 === categoryL1,
      })
    }
  }, [getItemForCategory, baseCategory])

  // Handle try-on badge click - open viewOnly modal
  const handleTryOnClick = useCallback((categoryL1: string) => {
    const item = getItemForCategory(categoryL1)
    const tryOn = getTryOnForCategory(categoryL1)
    const imageBlob = getImageBlobForCategory(categoryL1)
    
    if (item && tryOn && imageBlob && item.image_url) {
      setViewingTryOn({
        categoryL1,
        item,
        imageUrl: item.image_url,
        imageBlob,
        tryOnUrl: tryOn.imageUrl,
      })
    }
  }, [getItemForCategory, getTryOnForCategory, getImageBlobForCategory])

  // Handle back to colors
  const handleBack = useCallback(() => {
    setStep('colors')
  }, [setStep])

  // Handle review outfit
  const handleReviewOutfit = useCallback(() => {
    setStep('summary')
  }, [setStep])

  // Count filled required categories
  const filledRequiredCount = REQUIRED_CATEGORIES.filter(cat => 
    filledCategories.includes(cat)
  ).length

  return (
    <div className="min-h-[calc(100vh-80px)] bg-primary-900">
      {/* Compact Header - 80px sticky */}
      <div className="h-20 border-b border-primary-800 bg-primary-900/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-full flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-widest text-white">
              Build Your Outfit
            </h1>
            <p className="text-neutral-500 text-xs mt-0.5">
              Click empty slots to add items
            </p>
          </div>
          
          {/* Progress */}
          <div className="text-right">
            <div className="text-sm text-neutral-400">
              <span className="text-white font-bold text-lg">{filledRequiredCount}</span>
              <span className="mx-1 text-neutral-600">/</span>
              <span>{REQUIRED_CATEGORIES.length}</span>
              <span className="ml-2 text-[10px] uppercase tracking-wider text-neutral-500">Required</span>
            </div>
            {outfitComplete && (
              <p className="text-success-500 text-[10px] uppercase tracking-wider mt-0.5 flex items-center justify-end gap-1">
                <Sparkles size={10} />
                Complete
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        
        {/* Required Items Section */}
        <div className="mb-10">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-4">
            Required Items
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {requiredCategories.map((categoryL1) => {
              const item = getItemForCategory(categoryL1)
              const isBase = baseCategory?.l1 === categoryL1
              const isSelected = addingCategory === categoryL1
              const tryOn = getTryOnForCategory(categoryL1)
              
              if (isBase) {
                console.log(`[BuildStep] Base item [${categoryL1}] tryOn:`, tryOn)
              }
              
              return (
                <OutfitSlot
                  key={categoryL1}
                  categoryL1={categoryL1}
                  item={item}
                  isBase={isBase}
                  isSelected={isSelected}
                  tryOnUrl={tryOn?.imageUrl}
                  onClick={() => handleSlotClick(categoryL1)}
                  onItemClick={item ? () => handleItemClick(categoryL1) : undefined}
                  onRemove={!isBase && item ? () => removeOutfitItem(categoryL1) : undefined}
                  onTryOnClick={tryOn ? () => handleTryOnClick(categoryL1) : undefined}
                />
              )
            })}
          </div>
        </div>

        {/* Optional Items Section */}
        <div className="mb-10">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-4">
            Optional Items
          </h2>
          <div className="flex gap-6">
            {optionalCategories.map((categoryL1) => {
              const item = getItemForCategory(categoryL1)
              const isBase = baseCategory?.l1 === categoryL1
              const isSelected = addingCategory === categoryL1
              const tryOn = getTryOnForCategory(categoryL1)
              
              return (
                <OutfitSlot
                  key={categoryL1}
                  categoryL1={categoryL1}
                  item={item}
                  isBase={isBase}
                  isSelected={isSelected}
                  tryOnUrl={tryOn?.imageUrl}
                  onClick={() => handleSlotClick(categoryL1)}
                  onItemClick={item ? () => handleItemClick(categoryL1) : undefined}
                  onRemove={!isBase && item ? () => removeOutfitItem(categoryL1) : undefined}
                  onTryOnClick={tryOn ? () => handleTryOnClick(categoryL1) : undefined}
                />
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-primary-800 my-8" />

        {/* Status / CTA */}
        <div className="text-center py-8">
          {outfitComplete ? (
            <>
              <div className="w-14 h-14 rounded-full bg-success-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-success-500" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-widest text-white mb-2">
                Outfit Complete
              </h3>
              <p className="text-neutral-500 text-sm max-w-md mx-auto mb-6">
                Review your outfit to see the cohesion score and save it to your closet.
              </p>
              <button
                onClick={handleReviewOutfit}
                className="group inline-flex items-center gap-3 px-8 py-3 bg-white text-primary-900 hover:bg-neutral-200 text-xs font-bold uppercase tracking-widest transition-all"
              >
                Review Outfit
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </>
          ) : (
            <>
              <p className="text-neutral-500 text-sm">
                Add <span className="text-white font-medium">Tops, Bottoms, and Shoes</span> to complete your outfit.
              </p>
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-primary-800 mt-8 pt-6">
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-5 py-2.5 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <button
              onClick={handleReviewOutfit}
              disabled={!outfitComplete}
              className="group flex items-center gap-3 px-6 py-2.5 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-all"
            >
              Review
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {addingCategory && (
        <AddItemModal
          categoryL1={addingCategory}
          recommendation={getRecommendationForCategory(addingCategory)}
          onCancel={cancelAddingItem}
        />
      )}

      {/* View-only Try-On Modal */}
      {viewingTryOn && session?.access_token && (
        <TryOnModal
          item={{
            color: viewingTryOn.item.color,
            category: viewingTryOn.item.category,
            formality: viewingTryOn.item.formality,
            aesthetics: viewingTryOn.item.aesthetics,
          }}
          itemImageUrl={viewingTryOn.imageUrl}
          itemImageBlob={viewingTryOn.imageBlob}
          token={session.access_token}
          onClose={() => setViewingTryOn(null)}
          viewOnly={true}
          existingTryOnUrl={viewingTryOn.tryOnUrl}
        />
      )}

      {/* Item Detail Modal */}
      {viewingItem && (
        <ItemDetailModal
          item={viewingItem.item}
          isBase={viewingItem.isBase}
          tryOnUrl={getTryOnForCategory(viewingItem.categoryL1)?.imageUrl}
          onClose={() => setViewingItem(null)}
          onViewTryOn={getTryOnForCategory(viewingItem.categoryL1) ? () => {
            const tryOn = getTryOnForCategory(viewingItem.categoryL1)
            const imageBlob = getImageBlobForCategory(viewingItem.categoryL1)
            const imageUrl = viewingItem.item.image_url
            if (tryOn && imageBlob && imageUrl && typeof imageUrl === 'string') {
              setViewingItem(null)
              setViewingTryOn({
                categoryL1: viewingItem.categoryL1,
                item: viewingItem.item,
                imageUrl,
                imageBlob,
                tryOnUrl: tryOn.imageUrl,
              })
            }
          } : undefined}
         onTryOn={() => {
          const imageBlob = getImageBlobForCategory(viewingItem.categoryL1)
          const imageUrl = viewingItem.item.image_url
          if (imageBlob && imageUrl && typeof imageUrl === 'string') {
            setViewingItem(null)
            setTryingOnFromDetail({
              categoryL1: viewingItem.categoryL1,
              item: viewingItem.item,
              imageUrl,
              imageBlob,
            })
          }
        }}
        />
      )}

      {/* Try-On Modal (from detail) */}
      {tryingOnFromDetail && session?.access_token && (
        <TryOnModal
          item={{
            color: tryingOnFromDetail.item.color,
            category: tryingOnFromDetail.item.category,
            formality: tryingOnFromDetail.item.formality,
            aesthetics: tryingOnFromDetail.item.aesthetics,
          }}
          itemImageUrl={tryingOnFromDetail.imageUrl}
          itemImageBlob={tryingOnFromDetail.imageBlob}
          token={session.access_token}
          onClose={() => setTryingOnFromDetail(null)}
          onTryOnComplete={(resultUrl) => {
            setTryOnResult(tryingOnFromDetail.categoryL1, resultUrl)
          }}
        />
      )}
    </div>
  )
}