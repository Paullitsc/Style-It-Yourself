'use client'

import { useState, useEffect } from 'react'
import { Package, Calendar, AlertTriangle, Sparkles, Trash2 } from 'lucide-react'
import type { OutfitSummary, OutfitResponse, ValidateOutfitResponse } from '@/types'
import { getOutfit, validateOutfit } from '@/lib/api'
import { Badge, Button, ConfirmationModal, Modal, Skeleton } from '@/components/ui'

interface OutfitDetailModalProps {
  outfit: OutfitSummary
  token: string
  onClose: () => void
  onDelete?: (outfitId: string) => Promise<void>
}

export default function OutfitDetailModal({ outfit, token, onClose, onDelete }: OutfitDetailModalProps) {
  const [fullOutfit, setFullOutfit] = useState<OutfitResponse | null>(null)
  const [validation, setValidation] = useState<ValidateOutfitResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
          } catch (validationError) {
            console.error('Validation failed:', validationError)
            setValidation({
              is_complete: true,
              cohesion_score: 70,
              verdict: 'Validation unavailable',
              warnings: [],
              color_strip: outfitData.items.map((item) => item.color.hex),
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch outfit:', err)
        setError(err instanceof Error ? err.message : 'Failed to load outfit details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOutfitDetails()
  }, [outfit.id, token])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-500'
    if (score >= 60) return 'text-warning-500'
    return 'text-error-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-success-500'
    if (score >= 60) return 'bg-warning-500'
    return 'bg-error-500'
  }

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
        title={outfit.name}
        description={formatDate(outfit.created_at)}
        size="lg"
        footer={
          <div className="flex gap-[var(--space-3)]">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Close
            </Button>
            {onDelete && (
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => setShowConfirm(true)}
                leftIcon={<Trash2 size={14} aria-hidden="true" />}
              >
                Delete
              </Button>
            )}
          </div>
        }
      >
        {isLoading && (
          <div className="space-y-[var(--space-4)]" aria-live="polite" aria-busy="true">
            <div className="grid grid-cols-1 gap-[var(--space-4)] md:grid-cols-2">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="space-y-[var(--space-3)]">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
            <p className="text-sm uppercase tracking-wide text-neutral-500">Loading outfit details...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-[var(--space-12)] text-center">
            <AlertTriangle size={32} className="mb-[var(--space-4)] text-error-500" />
            <p className="mb-[var(--space-2)] font-medium text-white">Failed to load outfit</p>
            <p className="text-sm text-neutral-500">{error}</p>
          </div>
        )}

        {!isLoading && !error && fullOutfit && (
          <div className="space-y-[var(--space-6)]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800">
              {fullOutfit.generated_image_url ? (
                <img
                  src={fullOutfit.generated_image_url}
                  alt={outfit.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-neutral-600">
                  <Package size={48} strokeWidth={1} className="mb-[var(--space-2)]" aria-hidden="true" />
                  <span className="text-xs uppercase tracking-wider">No generated image</span>
                </div>
              )}

              <div className="absolute right-[var(--space-3)] top-[var(--space-3)]">
                <Badge tone="info">
                  {fullOutfit.items.length} {fullOutfit.items.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="mb-[var(--space-3)] text-xs font-bold uppercase tracking-widest text-neutral-500">
                Items in this outfit
              </h4>
              <div className="grid grid-cols-4 gap-[var(--space-3)]">
                {fullOutfit.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800"
                  >
                    <div className="relative aspect-square bg-primary-900">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.category.l2}
                          className="h-full w-full object-contain p-[var(--space-2)]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package size={20} className="text-neutral-600" aria-hidden="true" />
                        </div>
                      )}

                      <div
                        className="absolute bottom-1 left-1 h-3 w-3 rounded-full border border-primary-900"
                        style={{ backgroundColor: item.color.hex }}
                        aria-hidden="true"
                      />

                      {index === 0 && <Badge className="absolute right-1 top-1">Base</Badge>}
                    </div>
                    <div className="border-t border-primary-700 p-[var(--space-2)]">
                      <p className="truncate text-[10px] font-medium text-white">{item.category.l2}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {validation && (
              <div className="rounded-[var(--radius-xl)] border border-primary-700 bg-primary-800/50 p-[var(--space-5)]">
                <div className="mb-[var(--space-4)] text-center">
                  <p className="mb-[var(--space-2)] text-[10px] uppercase tracking-widest text-neutral-500">
                    Cohesion Score
                  </p>
                  <div className="flex items-center justify-center gap-[var(--space-3)]">
                    <span className={`text-4xl font-bold ${getScoreColor(validation.cohesion_score)}`}>
                      {validation.cohesion_score}
                    </span>
                    <span className="text-lg text-neutral-600">/100</span>
                  </div>
                  <div className="mx-auto mt-[var(--space-3)] h-1.5 max-w-xs overflow-hidden rounded-full bg-primary-700">
                    <div
                      className={`h-full transition-all duration-500 ${getScoreBgColor(validation.cohesion_score)}`}
                      style={{ width: `${validation.cohesion_score}%` }}
                    />
                  </div>
                </div>

                <div className="mb-[var(--space-4)] rounded-[var(--radius-md)] bg-primary-900/50 p-[var(--space-3)] text-center">
                  <Sparkles size={16} className="mx-auto mb-[var(--space-1)] text-accent-500" aria-hidden="true" />
                  <p className="text-sm font-medium text-white">{validation.verdict}</p>
                </div>

                {validation.color_strip && validation.color_strip.length > 0 && (
                  <div className="mb-[var(--space-4)]">
                    <p className="mb-[var(--space-2)] text-center text-[10px] uppercase tracking-widest text-neutral-500">
                      Color Palette
                    </p>
                    <div className="flex h-8 overflow-hidden rounded-[var(--radius-md)]">
                      {validation.color_strip.map((color, index) => (
                        <div key={index} className="flex-1" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="space-y-[var(--space-2)]">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">Notes</p>
                    {validation.warnings.map((warning, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-[var(--space-2)] rounded-[var(--radius-md)] border border-warning-500/20 bg-warning-500/10 p-[var(--space-2)]"
                      >
                        <AlertTriangle size={12} className="mt-[2px] shrink-0 text-warning-500" aria-hidden="true" />
                        <p className="text-xs text-neutral-300">{warning}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-[var(--space-2)] text-[11px] uppercase tracking-wide text-neutral-500">
              <Calendar size={12} aria-hidden="true" />
              Created {formatDate(outfit.created_at)}
            </div>
          </div>
        )}
      </Modal>

      {onDelete && (
        <ConfirmationModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleDelete}
          isConfirming={isDeleting}
          title="Delete Outfit"
          description="Delete this outfit? Items will remain in your closet."
          confirmLabel="Delete"
          tone="danger"
        />
      )}
    </>
  )
}
