'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ClothingItemResponse } from '@/types'
import { ConfirmationModal, Modal } from '@/components/ui'
import { cn } from '@/lib/cn'

const FORMALITY_LABELS: Record<number, string> = {
  1: 'Casual',
  2: 'Smart-casual',
  3: 'Business',
  4: 'Formal',
  5: 'Black tie',
}

interface ItemDetailModalProps {
  item: ClothingItemResponse
  onClose: () => void
  onDelete?: (itemId: string) => Promise<void>
}

export default function ItemDetailModal({
  item,
  onClose,
  onDelete,
}: ItemDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const displayName = item.color?.name
    ? `${item.color.name} ${item.category.l2}`
    : item.category.l2

  const formattedDate = (() => {
    try {
      return new Date(item.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return item.created_at
    }
  })()

  const formality = item.formality ?? 0

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(item.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete item:', error)
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
          <div className="flex items-center justify-between gap-4">
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
                Delete piece
              </button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-[1fr_1fr] max-md:grid-cols-1 gap-10">
          {/* IMAGE */}
          <div className="relative aspect-[4/5] border border-ink overflow-hidden bg-paper-2">
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
            {item.ownership === 'wishlist' && (
              <span className="absolute top-3 right-3 bg-accent text-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]">
                Wishlist
              </span>
            )}
          </div>

          {/* INFO */}
          <div className="flex flex-col">
            {/* Eyebrow */}
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
              {item.category.l1} · {item.category.l2}
            </div>

            {/* Display name */}
            <h2 className="font-display font-normal text-[clamp(40px,4.5vw,64px)] leading-[0.95] tracking-[-0.02em] m-0 mb-2">
              {item.color?.name && (
                <em className="italic text-ink-3">{item.color.name}</em>
              )}
              {item.color?.name ? <br /> : null}
              {item.category.l2.toLowerCase()}
              <span className="italic text-ink-3">.</span>
            </h2>

            <hr className="border-t border-ink mt-6 mb-6" />

            {/* Metadata rows */}
            <dl className="flex flex-col gap-5">
              <MetaRow label="Color">
                <span className="inline-flex items-center gap-3">
                  <i
                    className="inline-block w-[18px] h-[18px] border border-ink"
                    style={{ backgroundColor: item.color.hex }}
                    aria-hidden="true"
                  />
                  <span className="font-display text-[20px] leading-none">
                    {item.color.name}
                    {item.color.is_neutral && (
                      <em className="italic text-ink-3"> · neutral</em>
                    )}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                    {item.color.hex.toUpperCase()}
                  </span>
                </span>
              </MetaRow>

              <MetaRow label="Formality">
                <span className="inline-flex items-center gap-3">
                  <span
                    className="flex gap-[3px]"
                    aria-label={`${formality} of 5`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <i
                        key={n}
                        className={cn(
                          'w-[10px] h-[10px] border border-ink',
                          n <= formality ? 'bg-ink' : 'bg-paper',
                        )}
                      />
                    ))}
                  </span>
                  <span className="font-display text-[20px] leading-none">
                    {FORMALITY_LABELS[formality] ?? '—'}
                  </span>
                </span>
              </MetaRow>

              {item.aesthetics.length > 0 && (
                <MetaRow label="Aesthetics">
                  <span className="font-display text-[20px] leading-tight">
                    {item.aesthetics.map((tag, i) => (
                      <span key={tag}>
                        {i > 0 && (
                          <span className="text-ink-3"> · </span>
                        )}
                        <em className="italic">{tag}</em>
                      </span>
                    ))}
                  </span>
                </MetaRow>
              )}

              {item.brand && (
                <MetaRow label="Brand">
                  <span className="font-display text-[20px] leading-none">
                    {item.brand}
                  </span>
                </MetaRow>
              )}

              {item.price !== null && item.price !== undefined && (
                <MetaRow label="Price">
                  <span className="font-display text-[20px] leading-none">
                    ${item.price.toFixed(2)}
                  </span>
                </MetaRow>
              )}

              {item.source_url && (
                <MetaRow label="Source">
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display italic text-[20px] leading-none underline decoration-ink-3 underline-offset-4 hover:decoration-ink"
                  >
                    View original →
                  </a>
                </MetaRow>
              )}

              <MetaRow label="Status">
                <span className="font-display text-[20px] leading-none capitalize">
                  {item.ownership}
                </span>
              </MetaRow>

              <MetaRow label="Added">
                <span className="font-display text-[20px] leading-none">
                  {formattedDate}
                </span>
              </MetaRow>
            </dl>
          </div>
        </div>
      </Modal>

      {onDelete && (
        <ConfirmationModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleDelete}
          isConfirming={isDeleting}
          title="Delete piece"
          description={`Remove ${displayName} from your closet? This can't be undone.`}
          confirmLabel="Delete"
          tone="danger"
        />
      )}
    </>
  )
}

interface MetaRowProps {
  label: string
  children: ReactNode
}

function MetaRow({ label, children }: MetaRowProps) {
  return (
    <div className="grid grid-cols-[120px_1fr] max-md:grid-cols-1 gap-4 items-baseline">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        — {label} —
      </dt>
      <dd className="m-0">{children}</dd>
    </div>
  )
}
