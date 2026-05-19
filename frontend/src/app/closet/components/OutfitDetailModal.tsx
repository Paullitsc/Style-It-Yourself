'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type {
  OutfitSummary,
  OutfitResponse,
  ValidateOutfitResponse,
  ClothingItemResponse,
} from '@/types'
import { getOutfit, validateOutfit } from '@/lib/api'
import { ConfirmationModal, Modal } from '@/components/ui'
import { cn } from '@/lib/cn'
import ItemDetailModal from './ItemDetailModal'

interface OutfitDetailModalProps {
  outfit: OutfitSummary
  token: string
  onClose: () => void
  onDelete?: (outfitId: string) => Promise<void>
}

export default function OutfitDetailModal({
  outfit,
  token,
  onClose,
  onDelete,
}: OutfitDetailModalProps) {
  const [fullOutfit, setFullOutfit] = useState<OutfitResponse | null>(null)
  const [validation, setValidation] = useState<ValidateOutfitResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedItem, setSelectedItem] =
    useState<ClothingItemResponse | null>(null)

  useEffect(() => {
    async function fetchOutfitDetails() {
      setIsLoading(true)
      setError(null)
      try {
        const outfitData = await getOutfit(outfit.id, token)
        setFullOutfit(outfitData)

        if (outfitData.items.length > 0) {
          const baseItem = outfitData.items[0]
          const otherItems = outfitData.items.slice(1)
          try {
            const validationResult = await validateOutfit(otherItems, baseItem)
            setValidation(validationResult)
          } catch {
            setValidation({
              is_complete: true,
              cohesion_score: 0,
              verdict: 'Validation unavailable.',
              warnings: [],
              color_strip: outfitData.items.map((item) => item.color.hex),
            })
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load outfit details',
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchOutfitDetails()
  }, [outfit.id, token])

  const formattedDate = (() => {
    try {
      return new Date(outfit.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return outfit.created_at
    }
  })()

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(outfit.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete outfit:', error)
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        size="xl"
        footer={
          <div className="flex items-center justify-between gap-6">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
            >
              Close
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent pb-[2px] border-b border-transparent hover:border-accent transition-colors"
              >
                Delete outfit
              </button>
            )}
          </div>
        }
      >
        {isLoading && <LoadingBody />}
        {error && !isLoading && <ErrorBody error={error} />}

        {!isLoading && !error && fullOutfit && (
          <div className="flex flex-col gap-10">
            {/* HEAD — image + key metadata */}
            <div className="grid grid-cols-[1fr_1fr] max-md:grid-cols-1 gap-10">
              {/* IMAGE */}
              <div className="relative aspect-[4/5] border border-ink overflow-hidden bg-paper-2">
                {fullOutfit.generated_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fullOutfit.generated_image_url}
                    alt={outfit.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 product__frame--placeholder" />
                )}
              </div>

              {/* INFO */}
              <div className="flex flex-col">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
                  Outfit
                </div>

                <h2 className="font-display font-normal text-[clamp(40px,4.5vw,64px)] leading-[0.95] tracking-[-0.02em] m-0">
                  <em className="italic">{outfit.name}</em>
                  <span className="italic text-ink-3">.</span>
                </h2>

                <hr className="border-t border-ink mt-6 mb-6" />

                <dl className="flex flex-col gap-5">
                  {validation && (
                    <MetaRow label="Cohesion">
                      <span className="inline-flex items-baseline gap-2">
                        <span className="font-display text-[40px] leading-none tracking-[-0.01em]">
                          {validation.cohesion_score}
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                          / 100
                        </span>
                      </span>
                    </MetaRow>
                  )}

                  <MetaRow label="Pieces">
                    <span className="font-display text-[20px] leading-none">
                      {fullOutfit.items.length}
                    </span>
                  </MetaRow>

                  <MetaRow label="Created">
                    <span className="font-display text-[20px] leading-none">
                      {formattedDate}
                    </span>
                  </MetaRow>

                  {validation && validation.verdict && (
                    <MetaRow label="Verdict">
                      <span className="font-display italic text-[20px] leading-[1.35] text-ink-2">
                        {validation.verdict}
                      </span>
                    </MetaRow>
                  )}
                </dl>
              </div>
            </div>

            {/* PIECES */}
            {fullOutfit.items.length > 0 && (
              <section>
                <SectionHeader
                  title="Pieces"
                  count={`${fullOutfit.items.length} in this look`}
                />
                <div className="grid grid-cols-4 max-md:grid-cols-2 gap-4">
                  {fullOutfit.items.map((item, idx) => (
                    <PieceTile
                      key={item.id}
                      item={item}
                      isBase={idx === 0}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* COLOR PALETTE */}
            {validation &&
              validation.color_strip &&
              validation.color_strip.length > 0 && (
                <section>
                  <SectionHeader title="Color palette" />
                  <div className="flex h-12 border border-ink overflow-hidden">
                    {validation.color_strip.map((hex, i) => (
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
              )}

            {/* NOTES / WARNINGS */}
            {validation && validation.warnings.length > 0 && (
              <section>
                <SectionHeader title="Notes" />
                <ul className="flex flex-col gap-3">
                  {validation.warnings.map((warning, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-3 font-display italic text-[18px] leading-[1.35] text-ink-2"
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
              </section>
            )}
          </div>
        )}
      </Modal>

      {onDelete && (
        <ConfirmationModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleDelete}
          isConfirming={isDeleting}
          title="Delete outfit"
          description={`Remove ${outfit.name} from your saved looks? Pieces stay in your closet.`}
          confirmLabel="Delete"
          tone="danger"
        />
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface MetaRowProps {
  label: string
  children: ReactNode
}

function MetaRow({ label, children }: MetaRowProps) {
  return (
    <div className="grid grid-cols-[120px_1fr] max-md:grid-cols-1 gap-4 items-baseline">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {label}
      </dt>
      <dd className="m-0">{children}</dd>
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  count?: string
}

function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <header className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline pb-[14px] mb-5 border-b border-ink">
      <span className="font-display text-[24px] leading-none tracking-[-0.015em]">
        {title}
      </span>
      {count && (
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          {count}
        </span>
      )}
      <span className="h-px bg-ink" aria-hidden="true" />
    </header>
  )
}

interface PieceTileProps {
  item: ClothingItemResponse
  isBase: boolean
  onClick: () => void
}

function PieceTile({ item, isBase, onClick }: PieceTileProps) {
  const displayName = item.color?.name
    ? `${item.color.name} ${item.category.l2}`
    : item.category.l2

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
      aria-label={`Open details for ${displayName}`}
    >
      <div className="relative aspect-square border border-ink overflow-hidden bg-paper-2 transition-transform duration-200 group-hover:-translate-y-[2px]">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 product__frame--placeholder" />
        )}
        {isBase && (
          <span className="absolute top-2 left-2 bg-ink text-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]">
            Base
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2 mt-2">
        <span className="font-display text-[15px] leading-tight truncate">
          {item.category.l2}
        </span>
        <i
          className="inline-block w-[10px] h-[10px] border border-ink shrink-0"
          style={{ backgroundColor: item.color.hex }}
          aria-hidden="true"
        />
      </div>
    </button>
  )
}

function LoadingBody() {
  return (
    <div
      className="flex flex-col gap-10"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="grid grid-cols-[1fr_1fr] max-md:grid-cols-1 gap-10">
        <div className="aspect-[4/5] border border-ink bg-paper-2 product__frame--placeholder" />
        <div className="flex flex-col gap-4">
          <div className="h-3 w-1/3 bg-paper-2" />
          <div className="h-12 w-3/4 bg-paper-2" />
          <hr className="border-t border-ink" />
          <div className="h-4 w-1/2 bg-paper-2" />
          <div className="h-4 w-1/3 bg-paper-2" />
          <div className="h-4 w-2/3 bg-paper-2" />
        </div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        Loading outfit…
      </p>
    </div>
  )
}

function ErrorBody({ error }: { error: string }) {
  return (
    <div className="py-12 text-center">
      <p className={cn('font-mono text-[11px] uppercase tracking-[0.14em] text-accent mb-3')}>
        Failed to load outfit
      </p>
      <p className="font-display italic text-[18px] text-ink-2">{error}</p>
    </div>
  )
}
