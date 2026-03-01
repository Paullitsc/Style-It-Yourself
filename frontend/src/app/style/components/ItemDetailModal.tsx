'use client'

import { ExternalLink, Sparkles, Tag, DollarSign, Shirt } from 'lucide-react'
import type { ClothingItemCreate } from '@/types'
import { FORMALITY_LEVELS } from '@/types'
import { Badge, Button, Modal } from '@/components/ui'

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
  const formalityLabel = FORMALITY_LEVELS[item.formality as keyof typeof FORMALITY_LEVELS] || item.formality

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={item.category.l2}
      size="md"
      footer={
        <>
          {tryOnUrl && onViewTryOn ? (
            <Button
              onClick={onViewTryOn}
              variant="secondary"
              fullWidth
              leftIcon={<Sparkles size={16} aria-hidden="true" />}
            >
              View Try-On Result
            </Button>
          ) : onTryOn ? (
            <Button onClick={onTryOn} fullWidth leftIcon={<Sparkles size={16} aria-hidden="true" />}>
              Try On Item
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-[var(--space-6)]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800">
          {item.image_url ? (
            <img src={item.image_url} alt="Item" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-600">
              <Shirt size={48} strokeWidth={1} aria-hidden="true" />
            </div>
          )}

          <div className="absolute bottom-[var(--space-3)] right-[var(--space-3)] flex items-center gap-[var(--space-2)] rounded-full border border-primary-700 bg-primary-900/90 px-[var(--space-3)] py-[var(--space-1)] shadow-sm backdrop-blur">
            <div
              className="h-3 w-3 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: item.color.hex }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">{item.color.name}</span>
          </div>

          {isBase && <Badge className="absolute right-[var(--space-3)] top-[var(--space-3)]">Base Item</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-[var(--space-6)]">
          <div>
            <p className="mb-[var(--space-1)] text-[10px] font-bold uppercase tracking-widest text-neutral-500">Formality</p>
            <p className="text-sm font-medium text-white">{formalityLabel}</p>
          </div>
          <div>
            <p className="mb-[var(--space-1)] text-[10px] font-bold uppercase tracking-widest text-neutral-500">Category</p>
            <p className="text-sm font-medium text-white">
              {item.category.l1} / {item.category.l2}
            </p>
          </div>
        </div>

        {item.aesthetics.length > 0 && (
          <div>
            <p className="mb-[var(--space-2)] text-[10px] font-bold uppercase tracking-widest text-neutral-500">Aesthetics</p>
            <div className="flex flex-wrap gap-[var(--space-2)]">
              {item.aesthetics.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(item.brand || item.price || item.source_url) && (
          <div className="space-y-[var(--space-3)] border-t border-primary-800 pt-[var(--space-4)]">
            {item.brand && (
              <div className="flex items-center gap-[var(--space-3)] text-sm text-neutral-300">
                <Tag size={14} className="text-neutral-500" aria-hidden="true" />
                <span>{item.brand}</span>
              </div>
            )}
            {item.price !== null && item.price !== undefined && (
              <div className="flex items-center gap-[var(--space-3)] text-sm text-neutral-300">
                <DollarSign size={14} className="text-neutral-500" aria-hidden="true" />
                <span>${item.price.toFixed(2)}</span>
              </div>
            )}
            {item.source_url && (
              <div className="flex items-center gap-[var(--space-3)] text-sm">
                <ExternalLink size={14} className="text-neutral-500" aria-hidden="true" />
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-accent-500 hover:text-accent-400 hover:underline"
                >
                  View Source
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
