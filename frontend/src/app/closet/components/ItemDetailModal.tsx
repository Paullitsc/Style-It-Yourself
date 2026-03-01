'use client'

import { useState } from 'react'
import { ExternalLink, Tag, DollarSign, Shirt, Calendar, ShoppingBag, Trash2 } from 'lucide-react'
import type { ClothingItemResponse } from '@/types'
import {
  Badge,
  Button,
  CategoryBadge,
  ConfirmationModal,
  FormalityBadge,
  Modal,
  StatusBadge,
} from '@/components/ui'

interface ItemDetailModalProps {
  item: ClothingItemResponse
  onClose: () => void
  onDelete?: (itemId: string) => Promise<void>
}

export default function ItemDetailModal({ item, onClose, onDelete }: ItemDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
        title={item.category.l2}
        description={item.category.l1}
        size="md"
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
        <div className="space-y-[var(--space-6)]">
          <div className="relative mb-[var(--space-2)] aspect-[3/4] overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800">
            {item.image_url ? (
              <img src={item.image_url} alt={item.category.l2} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-600">
                <Shirt size={48} strokeWidth={1} aria-hidden="true" />
              </div>
            )}

            <div className="absolute right-[var(--space-3)] top-[var(--space-3)]">
              <StatusBadge status={item.ownership} />
            </div>

            <div className="absolute bottom-[var(--space-3)] right-[var(--space-3)] rounded-full border border-primary-700 bg-primary-900/90 px-[var(--space-3)] py-[var(--space-1)] backdrop-blur">
              <div className="flex items-center gap-[var(--space-2)]">
                <div
                  className="h-3 w-3 rounded-full border border-primary-700"
                  style={{ backgroundColor: item.color.hex }}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">{item.color.name}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-[var(--space-2)]">
            <FormalityBadge level={item.formality} />
            <CategoryBadge category={item.category.l1} />
            {item.color.is_neutral && <Badge tone="neutral">Neutral</Badge>}
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

          <div className="space-y-[var(--space-3)] border-t border-primary-800 pt-[var(--space-4)]">
            {item.brand && (
              <div className="flex items-center gap-[var(--space-3)] text-sm text-neutral-300">
                <Tag size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
                <span>{item.brand}</span>
              </div>
            )}
            {item.price !== null && item.price !== undefined && (
              <div className="flex items-center gap-[var(--space-3)] text-sm text-neutral-300">
                <DollarSign size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
                <span>${item.price.toFixed(2)}</span>
              </div>
            )}
            {item.source_url && (
              <div className="flex items-center gap-[var(--space-3)] text-sm">
                <ExternalLink size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
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
            <div className="flex items-center gap-[var(--space-3)] text-sm text-neutral-300">
              <ShoppingBag size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
              <span className="capitalize">{item.ownership}</span>
            </div>
            <div className="flex items-center gap-[var(--space-3)] text-sm text-neutral-400">
              <Calendar size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
              <span>Added {formatDate(item.created_at)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {onDelete && (
        <ConfirmationModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleDelete}
          isConfirming={isDeleting}
          title="Delete Item"
          description="Delete this item? This cannot be undone."
          confirmLabel="Delete"
          tone="danger"
        />
      )}
    </>
  )
}
