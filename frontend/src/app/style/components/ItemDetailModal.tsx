'use client'

import type { ReactNode } from 'react'
import type { ClothingItemCreate } from '@/types'
import { FORMALITY_LEVELS } from '@/types'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/cn'

interface ItemDetailModalProps {
  item: ClothingItemCreate
  isBase?: boolean
  tryOnUrl?: string | null
  onClose: () => void
  onViewTryOn?: () => void
  onTryOn?: () => void
}

export default function ItemDetailModal({
  item,
  isBase = false,
  tryOnUrl,
  onClose,
  onViewTryOn,
  onTryOn,
}: ItemDetailModalProps) {
  const formalityLabel =
    FORMALITY_LEVELS[item.formality as keyof typeof FORMALITY_LEVELS] ||
    item.formality

  const displayName = item.color?.name
    ? `${item.color.name} ${item.category.l2}`
    : item.category.l2

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
          >
            Close
          </button>
          {tryOnUrl && onViewTryOn ? (
            <button
              type="button"
              onClick={onViewTryOn}
              className={cn(
                'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
                'border border-ink bg-ink text-paper',
                'font-mono text-[11px] uppercase tracking-[0.12em]',
                'transition-colors hover:bg-paper hover:text-ink',
              )}
            >
              <span>View try-on</span>
              <span aria-hidden="true">↗</span>
            </button>
          ) : onTryOn ? (
            <button
              type="button"
              onClick={onTryOn}
              className={cn(
                'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
                'border border-ink bg-ink text-paper',
                'font-mono text-[11px] uppercase tracking-[0.12em]',
                'transition-colors hover:bg-paper hover:text-ink',
              )}
            >
              <span>Try it on</span>
              <span aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      }
    >
      <div className="grid grid-cols-[1fr_1fr] max-md:grid-cols-1 gap-10">
        {/* Image */}
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
          {isBase && (
            <span className="absolute top-3 left-3 bg-ink text-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]">
              Base
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
            {item.category.l1} · {item.category.l2}
          </div>

          <h2 className="font-display font-normal text-[clamp(40px,4.5vw,56px)] leading-[0.95] tracking-[-0.02em] m-0">
            {item.color?.name && (
              <em className="italic text-ink-3">{item.color.name}</em>
            )}
            {item.color?.name ? <br /> : null}
            {item.category.l2.toLowerCase()}
            <span className="italic text-ink-3">.</span>
          </h2>

          <hr className="border-t border-ink mt-6 mb-6" />

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
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  {item.color.hex.toUpperCase()}
                </span>
              </span>
            </MetaRow>

            <MetaRow label="Formality">
              <span className="font-display text-[20px] leading-none">
                {formalityLabel}
              </span>
            </MetaRow>

            {item.aesthetics.length > 0 && (
              <MetaRow label="Aesthetics">
                <span className="font-display text-[18px] leading-tight">
                  {item.aesthetics.map((tag, i) => (
                    <span key={tag}>
                      {i > 0 && <span className="text-ink-3"> · </span>}
                      <em className="italic">{tag}</em>
                    </span>
                  ))}
                </span>
              </MetaRow>
            )}

            {item.brand && (
              <MetaRow label="Brand">
                <span className="font-display text-[18px] leading-none">
                  {item.brand}
                </span>
              </MetaRow>
            )}

            {item.price !== null && item.price !== undefined && (
              <MetaRow label="Price">
                <span className="font-display text-[18px] leading-none">
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
                  className="font-display italic text-[18px] leading-none underline decoration-ink-3 underline-offset-4 hover:decoration-ink"
                >
                  View original →
                </a>
              </MetaRow>
            )}
          </dl>
        </div>
      </div>
    </Modal>
  )
}

interface MetaRowProps {
  label: string
  children: ReactNode
}

function MetaRow({ label, children }: MetaRowProps) {
  return (
    <div className="grid grid-cols-[110px_1fr] max-md:grid-cols-1 gap-4 items-baseline">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {label}
      </dt>
      <dd className="m-0">{children}</dd>
    </div>
  )
}
