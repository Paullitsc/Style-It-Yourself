'use client'

import { useCallback, useState } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { CATEGORY_TAXONOMY } from '@/types'
import { TextInput } from '@/components/ui'
import { cn } from '@/lib/cn'
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
    brand,
    size,
    price,
    sourceUrl,
    setCategory,
    clearCategory,
    setFormality,
    toggleAesthetic,
    setOwnership,
    setBrand,
    setSize,
    setPrice,
    setSourceUrl,
    setStep,
    isMetadataValid,
  } = useStyleStore()

  const [showOptional, setShowOptional] = useState(false)

  const handleBack = useCallback(() => setStep('upload'), [setStep])
  const handleNext = useCallback(
    () => isMetadataValid() && setStep('colors'),
    [isMetadataValid, setStep],
  )

  const optionalCount = [brand, size, price, sourceUrl].filter(Boolean).length

  return (
    <div className="py-12 max-md:py-8">
      <section className="text-center mb-10 max-md:mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-4">
          Step 02
        </p>
        <h2 className="m-0 font-display font-normal text-[clamp(48px,6vw,88px)] leading-[0.95] tracking-[-0.02em]">
          Tell us <em className="italic text-ink-3">about</em>
          <br />
          this piece.
        </h2>
      </section>

      <div className="grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-12 max-md:gap-8 max-w-[920px] mx-auto items-start">
        {/* Image preview */}
        <div className="max-md:max-w-[240px] max-md:mx-auto">
          <div className="aspect-[4/5] border border-ink overflow-hidden bg-paper-2 lg:sticky lg:top-28">
            {croppedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={croppedImage.croppedUrl}
                alt="Your clothing item"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-8">
          <CategorySelector
            l1Options={Object.keys(CATEGORY_TAXONOMY)}
            l2Options={
              category?.l1 ? CATEGORY_TAXONOMY[category.l1] : []
            }
            selectedL1={category?.l1}
            selectedL2={category?.l2}
            onSelectL1={(l1) =>
              category?.l1 === l1 ? clearCategory() : setCategory(l1, '')
            }
            onSelectL2={(l2) => category?.l1 && setCategory(category.l1, l2)}
          />

          <FormalitySlider value={formality} onChange={setFormality} />

          <AestheticsSelector selected={aesthetics} onToggle={toggleAesthetic} />

          {/* Ownership */}
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Ownership <span className="text-accent ml-1">*</span>
              </label>
            </div>
            <div className="flex gap-6">
              <OwnershipPill
                active={ownership === 'owned'}
                onClick={() => setOwnership('owned')}
              >
                I own this
              </OwnershipPill>
              <OwnershipPill
                active={ownership === 'wishlist'}
                onClick={() => setOwnership('wishlist')}
              >
                Wishlist
              </OwnershipPill>
            </div>
          </div>

          {/* Optional details */}
          <div className="border-t border-rule-soft pt-7">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink transition-colors"
              aria-expanded={showOptional}
            >
              <span aria-hidden="true">{showOptional ? '−' : '+'}</span>
              Optional details
              {optionalCount > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                  {optionalCount} added
                </span>
              )}
            </button>

            {showOptional && (
              <div className="mt-6 flex flex-col gap-5">
                <TextInput
                  label="Brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Uniqlo, Aimé Leon Dore"
                />
                <TextInput
                  label="Size"
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="e.g. M, 32, 10.5"
                />
                <TextInput
                  label="Price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <TextInput
                  label="Source URL"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center gap-6 mt-14 max-w-[920px] mx-auto">
        <button
          type="button"
          onClick={handleBack}
          className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!isMetadataValid()}
          className={cn(
            'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
            'border border-ink bg-ink text-paper',
            'font-mono text-[11px] uppercase tracking-[0.12em]',
            'transition-colors',
            'hover:bg-paper hover:text-ink',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
          )}
        >
          <span>Next step</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}

interface OwnershipPillProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function OwnershipPill({ active, onClick, children }: OwnershipPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'pb-[2px] border-b transition-colors duration-200',
        'font-mono text-[11px] uppercase tracking-[0.12em]',
        active
          ? 'border-ink text-ink font-bold'
          : 'border-transparent text-ink-3 font-normal hover:text-ink hover:border-ink',
      )}
    >
      {children}
    </button>
  )
}
