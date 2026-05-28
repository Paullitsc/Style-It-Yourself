'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import { validateOutfit, saveOutfitWithItems } from '@/lib/api'
import type { ValidateOutfitResponse } from '@/types'
import AuthModal from '@/components/AuthModal'
import TryOnOutfitModal from './TryonOutfitModal'
import { cn } from '@/lib/cn'

export default function SummaryStep() {
  const router = useRouter()
  const { user, session } = useAuth()

  const {
    getBaseItem,
    getAllOutfitItems,
    getAllOutfitItemsWithBlobs,
    setStep,
    reset,
  } = useStyleStore()

  const [validation, setValidation] = useState<ValidateOutfitResponse | null>(
    null,
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<string>('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [outfitName, setOutfitName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [generatedTryOnUrl, setGeneratedTryOnUrl] = useState<string | null>(null)

  const baseItem = getBaseItem()
  const allItems = getAllOutfitItems()
  const allItemsWithBlobs = getAllOutfitItemsWithBlobs()

  const hasValidated = useRef(false)

  useEffect(() => {
    if (hasValidated.current) return

    async function validate() {
      if (!baseItem || allItems.length === 0) return
      hasValidated.current = true
      setIsValidating(true)
      try {
        const result = await validateOutfit(allItems, baseItem)
        setValidation(result)
      } catch (error) {
        // Don't fake a score-of-0 response — distinguish "validation failed"
        // from "outfit is bad". Leave validation null and surface the error.
        setValidationError(
          error instanceof Error
            ? error.message
            : 'Could not reach the validation service.',
        )
      } finally {
        setIsValidating(false)
      }
    }

    validate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBack = useCallback(() => setStep('build'), [setStep])

  const handleSaveClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowNameInput(true)
  }, [user])

  const handleTryOnClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowTryOnModal(true)
  }, [user])

  const handleSaveOutfit = useCallback(async () => {
    if (
      !user ||
      !session?.access_token ||
      !baseItem ||
      allItemsWithBlobs.length === 0
    )
      return

    const name =
      outfitName.trim() || `Outfit ${new Date().toLocaleDateString()}`

    setIsSaving(true)
    setSaveError(null)
    setSaveProgress('Starting…')

    try {
      await saveOutfitWithItems(
        name,
        allItemsWithBlobs,
        session.access_token,
        (_current, _total, status) => setSaveProgress(status),
        generatedTryOnUrl || undefined,
      )
      reset()
      router.push('/closet')
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save outfit',
      )
    } finally {
      setIsSaving(false)
      setSaveProgress('')
    }
  }, [
    user,
    session,
    baseItem,
    allItemsWithBlobs,
    outfitName,
    reset,
    router,
    generatedTryOnUrl,
  ])

  return (
    <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 pt-10 pb-24">
      <section className="border-b border-ink pb-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
          Review
        </p>
        <h1 className="m-0 font-display font-normal text-[clamp(48px,7vw,108px)] leading-[0.95] tracking-[-0.025em]">
          Your <em className="italic text-ink-3">outfit,</em>
          <br />
          assembled.
        </h1>
        <p className="mt-4 max-w-[40ch] font-display italic text-[20px] leading-[1.35] text-ink-2">
          Check the cohesion, name it, and save it to your closet.
        </p>
      </section>

      <div className="grid grid-cols-[1fr_1fr] max-md:grid-cols-1 gap-12 pt-10">
        {/* Items + palette */}
        <div className="flex flex-col gap-10">
          <section>
            <header className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline pb-[14px] mb-5 border-b border-ink">
              <span className="font-display text-[24px] leading-none tracking-[-0.015em]">
                Pieces
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                {allItems.length} in this look
              </span>
              <span className="h-px bg-ink" aria-hidden="true" />
            </header>

            <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2">
              {allItems.map((item, index) => (
                <article key={index} className="flex flex-col gap-2">
                  <div className="relative aspect-square border border-ink overflow-hidden bg-paper-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.category.l2 || item.category.l1}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute top-2 left-2 bg-ink text-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]">
                        Base
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-[15px] leading-tight truncate">
                      {item.category.l2}
                    </span>
                    <i
                      className="inline-block w-[10px] h-[10px] border border-ink shrink-0"
                      style={{ backgroundColor: item.color.hex }}
                      aria-hidden="true"
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          {(() => {
            // Use the validated color strip when available; otherwise fall
            // back to item colors directly so the palette still renders even
            // if validation failed. Both sources should produce the same
            // sequence under normal operation — the fallback only matters
            // when the validation API was unreachable.
            const colorStrip =
              validation?.color_strip && validation.color_strip.length > 0
                ? validation.color_strip
                : allItems.map((item) => item.color.hex)
            if (colorStrip.length === 0) return null
            return (
              <section>
                <header className="grid grid-cols-[auto_1fr] gap-4 items-baseline pb-[14px] mb-5 border-b border-ink">
                  <span className="font-display text-[24px] leading-none tracking-[-0.015em]">
                    Palette
                  </span>
                  <span className="h-px bg-ink" aria-hidden="true" />
                </header>
                <div className="flex h-12 border border-ink overflow-hidden">
                  {colorStrip.map((hex, i) => (
                    <div
                      key={`${hex}-${i}`}
                      className="flex-1"
                      style={{ backgroundColor: hex }}
                      title={hex.toUpperCase()}
                      aria-label={`Color ${i + 1}: ${hex.toUpperCase()}`}
                    />
                  ))}
                </div>
              </section>
            )
          })()}
        </div>

        {/* Analysis + actions */}
        <div className="flex flex-col gap-10">
          <section>
            <header className="grid grid-cols-[auto_1fr] gap-4 items-baseline pb-[14px] mb-5 border-b border-ink">
              <span className="font-display text-[24px] leading-none tracking-[-0.015em]">
                Cohesion
              </span>
              <span className="h-px bg-ink" aria-hidden="true" />
            </header>

            {isValidating ? (
              <div className="font-display italic text-[18px] text-ink-2">
                Analyzing outfit…
              </div>
            ) : validationError ? (
              <div className="flex flex-col gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                  Validation unavailable
                </p>
                <p className="font-display italic text-[18px] leading-[1.35] text-ink-2 max-w-[42ch]">
                  {validationError}
                </p>
                <p className="font-display italic text-[14px] text-ink-3 max-w-[42ch]">
                  You can still save or try this outfit on — we just
                  couldn&apos;t check it this time.
                </p>
              </div>
            ) : validation ? (
              <div className="flex flex-col gap-6">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[72px] leading-none tracking-[-0.02em]">
                    {validation.cohesion_score}
                  </span>
                  <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-3">
                    / 100
                  </span>
                </div>

                <p className="font-display italic text-[20px] leading-[1.35] text-ink-2 max-w-[42ch]">
                  {validation.verdict}
                </p>

                {validation.warnings.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
                      Notes
                    </p>
                    <ul className="flex flex-col gap-2">
                      {validation.warnings.map((warning, i) => (
                        <li
                          key={i}
                          className="flex items-baseline gap-3 font-display italic text-[16px] leading-[1.4] text-ink-2"
                        >
                          <span
                            className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent shrink-0"
                            aria-hidden="true"
                          >
                            ※
                          </span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="font-display italic text-[18px] text-ink-2">
                No validation data.
              </p>
            )}
          </section>

          {/* Save section */}
          {showNameInput ? (
            <section className="border-t border-rule-soft pt-7 flex flex-col gap-5">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3 block">
                  Name this outfit
                </label>
                <input
                  type="text"
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  placeholder="e.g. Casual Friday, Summer Look…"
                  disabled={isSaving}
                  className="w-full bg-transparent font-display italic text-[20px] text-ink border-b border-ink py-2 placeholder:not-italic placeholder:font-mono placeholder:text-[12px] placeholder:tracking-[0.04em] placeholder:text-ink-3 focus:outline-none disabled:opacity-50"
                />
              </div>

              {saveError && (
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
                  {saveError}
                </p>
              )}

              {isSaving && saveProgress && (
                <p className="font-display italic text-[16px] text-ink-2">
                  {saveProgress}
                </p>
              )}

              <div className="flex items-center justify-between gap-6">
                <button
                  type="button"
                  onClick={() => setShowNameInput(false)}
                  disabled={isSaving}
                  className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOutfit}
                  disabled={isSaving}
                  className={cn(
                    'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
                    'border border-ink bg-ink text-paper',
                    'font-mono text-[11px] uppercase tracking-[0.12em]',
                    'transition-colors hover:bg-paper hover:text-ink',
                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
                  )}
                >
                  <span>{isSaving ? 'Saving…' : 'Save to closet'}</span>
                  {!isSaving && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </section>
          ) : (
            <section className="border-t border-rule-soft pt-7 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSaveClick}
                className={cn(
                  'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
                  'border border-ink bg-ink text-paper',
                  'font-mono text-[11px] uppercase tracking-[0.12em]',
                  'transition-colors hover:bg-paper hover:text-ink',
                )}
              >
                <span>
                  Save to closet
                  {!user && (
                    <span className="ml-2 text-ink-3 normal-case font-normal italic">
                      (login required)
                    </span>
                  )}
                </span>
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                onClick={handleTryOnClick}
                className={cn(
                  'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
                  'border border-ink bg-paper text-ink',
                  'font-mono text-[11px] uppercase tracking-[0.12em]',
                  'transition-colors hover:bg-ink hover:text-paper',
                )}
              >
                <span>
                  Try on outfit
                  {!user && (
                    <span className="ml-2 text-ink-3 normal-case font-normal italic">
                      (login required)
                    </span>
                  )}
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            </section>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="border-t border-ink mt-12 pt-7">
        <button
          type="button"
          onClick={handleBack}
          className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
        >
          ← Back to build
        </button>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {showTryOnModal && session?.access_token && (
        <TryOnOutfitModal
          items={allItemsWithBlobs}
          token={session.access_token}
          onClose={() => setShowTryOnModal(false)}
          onComplete={(url: string) => setGeneratedTryOnUrl(url)}
        />
      )}
    </div>
  )
}
