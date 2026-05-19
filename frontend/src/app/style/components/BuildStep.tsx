'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  useStyleStore,
  REQUIRED_CATEGORIES,
  OPTIONAL_CATEGORIES,
} from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import OutfitSlot from './OutfitSlot'
import TryOnModal from './TryOnModal'
import ItemDetailModal from './ItemDetailModal'
import SuggestionPanel from './shared/SuggestionPanel'
import AddItemPanel from './AddItemPanel'
import { cn } from '@/lib/cn'
import type {
  ClothingItemCreate,
  ClothingItemResponse,
  CategoryRecommendation,
  RecommendedColor,
} from '@/types'

export default function BuildStep() {
  const { session } = useAuth()

  const {
    getBaseItem,
    category: baseCategory,
    croppedImage: baseCroppedImage,
    recommendations,
    outfitItems,
    addingCategory,
    getFilledCategories,
    isOutfitComplete,
    getTryOnForCategory,
    setTryOnResult,
    startAddingItem,
    cancelAddingItem,
    removeOutfitItem,
    addClosetItemToOutfit,
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

  const [selectedSuggestedColor, setSelectedSuggestedColor] =
    useState<RecommendedColor | null>(null)

  const baseItem = getBaseItem()
  const filledCategories = getFilledCategories()
  const outfitComplete = isOutfitComplete()

  const getItemForCategory = useCallback(
    (categoryL1: string): ClothingItemCreate | null => {
      if (baseCategory?.l1 === categoryL1) return baseItem
      const found = outfitItems.find((oi) => oi.item.category.l1 === categoryL1)
      return found ? found.item : null
    },
    [baseCategory, baseItem, outfitItems],
  )

  const getImageBlobForCategory = useCallback(
    (categoryL1: string): Blob | null => {
      if (baseCategory?.l1 === categoryL1 && baseCroppedImage) {
        return baseCroppedImage.croppedBlob
      }
      const found = outfitItems.find((oi) => oi.item.category.l1 === categoryL1)
      return found ? found.imageBlob : null
    },
    [baseCategory, baseCroppedImage, outfitItems],
  )

  const getRecommendationForCategory = useCallback(
    (categoryL1: string): CategoryRecommendation | null =>
      recommendations.find((rec) => rec.category_l1 === categoryL1) || null,
    [recommendations],
  )

  const { requiredCategories, optionalCategories } = useMemo(() => {
    const baseCat = baseCategory?.l1
    let required = [...REQUIRED_CATEGORIES]
    let optional = [...OPTIONAL_CATEGORIES]

    if (baseCat && REQUIRED_CATEGORIES.includes(baseCat)) {
      required = [baseCat, ...REQUIRED_CATEGORIES.filter((c) => c !== baseCat)]
      optional = OPTIONAL_CATEGORIES.filter((c) => c !== baseCat)
    } else if (baseCat && OPTIONAL_CATEGORIES.includes(baseCat)) {
      optional = [baseCat, ...OPTIONAL_CATEGORIES.filter((c) => c !== baseCat)]
    }

    return { requiredCategories: required, optionalCategories: optional }
  }, [baseCategory])

  const handleSlotClick = useCallback(
    (categoryL1: string) => {
      if (filledCategories.includes(categoryL1)) return
      setSelectedSuggestedColor(null)
      startAddingItem(categoryL1)
    },
    [filledCategories, startAddingItem],
  )

  const handleItemClick = useCallback(
    (categoryL1: string) => {
      const item = getItemForCategory(categoryL1)
      if (item) {
        setViewingItem({
          categoryL1,
          item,
          isBase: baseCategory?.l1 === categoryL1,
        })
      }
    },
    [getItemForCategory, baseCategory],
  )

  const handleTryOnClick = useCallback(
    (categoryL1: string) => {
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
    },
    [getItemForCategory, getTryOnForCategory, getImageBlobForCategory],
  )

  const handleSuggestedColorClick = useCallback(
    (color: RecommendedColor) => setSelectedSuggestedColor(color),
    [],
  )

  const handleQuickAdd = useCallback(
    (item: ClothingItemResponse) => {
      if (!addingCategory) return
      addClosetItemToOutfit(item)
      setSelectedSuggestedColor(null)
      cancelAddingItem()
    },
    [addingCategory, addClosetItemToOutfit, cancelAddingItem],
  )

  const handleCloseAddPanel = useCallback(() => {
    setSelectedSuggestedColor(null)
    cancelAddingItem()
  }, [cancelAddingItem])

  const handleBack = useCallback(() => setStep('colors'), [setStep])
  const handleReviewOutfit = useCallback(() => setStep('summary'), [setStep])

  const filledRequiredCount = REQUIRED_CATEGORIES.filter((cat) =>
    filledCategories.includes(cat),
  ).length

  const isPanelOpen = addingCategory !== null

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-ink bg-paper sticky top-0 z-20">
        <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 py-5 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
              Step 04 · Build
            </p>
            <h1 className="m-0 font-display font-normal text-[clamp(28px,3.5vw,40px)] leading-[0.95] tracking-[-0.015em]">
              Assemble the <em className="italic text-ink-3">outfit.</em>
            </h1>
          </div>

          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
              Required
            </p>
            <div className="flex items-baseline gap-1 justify-end">
              <span
                className={cn(
                  'font-display text-[32px] leading-none',
                  outfitComplete ? 'text-ink' : 'text-ink-2',
                )}
              >
                {filledRequiredCount}
              </span>
              <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-3">
                / {REQUIRED_CATEGORIES.length}
              </span>
            </div>
            {outfitComplete && (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent italic mt-1">
                <em>Complete.</em>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex">
        {/* Builder */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            isPanelOpen ? 'w-[45%]' : 'w-full',
          )}
        >
          <div className="max-w-[1100px] mx-auto px-10 max-md:px-6 py-10">
            <section className="mb-10">
              <header className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline pb-[14px] mb-6 border-b border-ink">
                <span className="font-display text-[22px] leading-none tracking-[-0.015em]">
                  Required
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                  Tops · Bottoms · Shoes
                </span>
                <span className="h-px bg-ink" aria-hidden="true" />
              </header>

              <div
                className={cn(
                  'grid gap-6',
                  isPanelOpen
                    ? 'grid-cols-3 max-md:grid-cols-2'
                    : 'grid-cols-3 lg:grid-cols-4 max-md:grid-cols-2',
                )}
              >
                {requiredCategories.map((categoryL1) => {
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
                      onItemClick={
                        item ? () => handleItemClick(categoryL1) : undefined
                      }
                      onRemove={
                        !isBase && item
                          ? () => removeOutfitItem(categoryL1)
                          : undefined
                      }
                      onTryOnClick={
                        tryOn ? () => handleTryOnClick(categoryL1) : undefined
                      }
                      compact={isPanelOpen}
                    />
                  )
                })}
              </div>
            </section>

            <section className="mb-10">
              <header className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline pb-[14px] mb-6 border-b border-rule-soft">
                <span className="font-display text-[22px] leading-none tracking-[-0.015em] text-ink-2">
                  Optional
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                  Layers · accessories
                </span>
                <span className="h-px bg-rule-soft" aria-hidden="true" />
              </header>

              <div className="grid gap-6 grid-cols-3 lg:grid-cols-4 max-md:grid-cols-2">
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
                      onItemClick={
                        item ? () => handleItemClick(categoryL1) : undefined
                      }
                      onRemove={
                        !isBase && item
                          ? () => removeOutfitItem(categoryL1)
                          : undefined
                      }
                      onTryOnClick={
                        tryOn ? () => handleTryOnClick(categoryL1) : undefined
                      }
                      compact={isPanelOpen}
                    />
                  )
                })}
              </div>
            </section>

            {!isPanelOpen && (
              <>
                <div className="border-t border-rule-soft my-8" />
                <div className="text-center py-8">
                  {outfitComplete ? (
                    <>
                      <h3 className="font-display text-[clamp(28px,3vw,36px)] leading-tight tracking-[-0.015em] mb-2">
                        Outfit <em className="italic text-ink-3">complete.</em>
                      </h3>
                      <p className="font-display italic text-[18px] text-ink-2 max-w-[40ch] mx-auto">
                        Review it for the cohesion score and save it to your
                        closet.
                      </p>
                    </>
                  ) : (
                    <p className="font-display italic text-[18px] text-ink-2 max-w-[42ch] mx-auto">
                      Add Tops, Bottoms, and Shoes to complete the look.
                    </p>
                  )}
                </div>

                {/* Bottom navigation */}
                <div className="border-t border-ink mt-8 pt-7 flex justify-between items-center gap-6 flex-wrap">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={handleReviewOutfit}
                    disabled={!outfitComplete}
                    className={cn(
                      'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
                      'border border-ink bg-ink text-paper',
                      'font-mono text-[11px] uppercase tracking-[0.12em]',
                      'transition-colors hover:bg-paper hover:text-ink',
                      'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
                    )}
                  >
                    <span>Review outfit</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Split panel (suggestion + add) */}
        {isPanelOpen && (
          <div className="w-[55%] border-l border-ink flex">
            <div className="w-[45%] border-r border-ink bg-paper-2">
              <SuggestionPanel
                recommendation={getRecommendationForCategory(addingCategory!)}
                categoryL1={addingCategory!}
                onColorClick={handleSuggestedColorClick}
                onQuickAdd={handleQuickAdd}
              />
            </div>
            <div className="w-[55%] bg-paper">
              <AddItemPanel
                categoryL1={addingCategory!}
                recommendation={getRecommendationForCategory(addingCategory!)}
                onClose={handleCloseAddPanel}
                suggestedColor={selectedSuggestedColor}
              />
            </div>
          </div>
        )}
      </div>

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

      {viewingItem && (
        <ItemDetailModal
          item={viewingItem.item}
          isBase={viewingItem.isBase}
          tryOnUrl={getTryOnForCategory(viewingItem.categoryL1)?.imageUrl}
          onClose={() => setViewingItem(null)}
          onViewTryOn={
            getTryOnForCategory(viewingItem.categoryL1)
              ? () => {
                  const tryOn = getTryOnForCategory(viewingItem.categoryL1)
                  const imageBlob = getImageBlobForCategory(
                    viewingItem.categoryL1,
                  )
                  const imageUrl = viewingItem.item.image_url
                  if (
                    tryOn &&
                    imageBlob &&
                    imageUrl &&
                    typeof imageUrl === 'string'
                  ) {
                    setViewingItem(null)
                    setViewingTryOn({
                      categoryL1: viewingItem.categoryL1,
                      item: viewingItem.item,
                      imageUrl,
                      imageBlob,
                      tryOnUrl: tryOn.imageUrl,
                    })
                  }
                }
              : undefined
          }
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
