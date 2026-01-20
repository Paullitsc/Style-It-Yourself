'use client'

import { useState } from 'react'
import { X, ExternalLink, Tag, DollarSign, Shirt, Calendar, ShoppingBag, Trash2 } from 'lucide-react'
import type { ClothingItemResponse } from '@/types'
import { FORMALITY_LEVELS } from '@/types'

interface ItemDetailModalProps {
  item: ClothingItemResponse
  onClose: () => void
  onDelete?: (itemId: string) => Promise<void>
}

export default function ItemDetailModal({ item, onClose, onDelete }: ItemDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const formalityLabel = FORMALITY_LEVELS[item.formality as keyof typeof FORMALITY_LEVELS] || item.formality

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
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
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-primary-900 border border-primary-700 rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest text-white">
              {item.category.l2}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {item.category.l1}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 scrollbar-hide">
          {/* Image */}
          <div className="aspect-[3/4] bg-primary-800 rounded-lg overflow-hidden border border-primary-700 mb-6 relative">
            {item.image_url ? (
              <img src={item.image_url} alt={item.category.l2} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <Shirt size={48} strokeWidth={1} />
              </div>
            )}
            
            {/* Color Pill */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-primary-900/90 backdrop-blur px-3 py-1.5 rounded-full border border-primary-700 shadow-sm">
              <div 
                className="w-3 h-3 rounded-full ring-1 ring-white/20" 
                style={{ backgroundColor: item.color.hex }} 
              />
              <span className="text-[10px] uppercase font-bold text-white tracking-wider">
                {item.color.name}
              </span>
            </div>

            {/* Ownership Badge */}
            <div className={`absolute top-3 right-3 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
              item.ownership === 'owned' 
                ? 'bg-success-500/20 text-success-400 border border-success-500/30' 
                : 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
            }`}>
              {item.ownership === 'owned' ? 'Owned' : 'Wishlist'}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-1">
                Formality
              </label>
              <p className="text-sm font-medium text-white">{formalityLabel}</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-1">
                Color
              </label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border border-primary-600" 
                  style={{ backgroundColor: item.color.hex }} 
                />
                <p className="text-sm font-medium text-white capitalize">{item.color.name}</p>
                {item.color.is_neutral && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded uppercase">Neutral</span>
                )}
              </div>
            </div>
          </div>

          {/* Aesthetics */}
          {item.aesthetics.length > 0 && (
            <div className="mb-6">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                Aesthetics
              </label>
              <div className="flex flex-wrap gap-2">
                {item.aesthetics.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-primary-800 border border-primary-700 rounded text-[10px] uppercase tracking-wider text-neutral-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Optional Info */}
          <div className="pt-6 border-t border-primary-800 space-y-3">
            {item.brand && (
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <Tag size={14} className="text-neutral-500 flex-shrink-0" />
                <span>{item.brand}</span>
              </div>
            )}
            {item.price !== null && item.price !== undefined && (
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <DollarSign size={14} className="text-neutral-500 flex-shrink-0" />
                <span>${item.price.toFixed(2)}</span>
              </div>
            )}
            {item.source_url && (
              <div className="flex items-center gap-3 text-sm">
                <ExternalLink size={14} className="text-neutral-500 flex-shrink-0" />
                <a 
                  href={item.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent-500 hover:text-accent-400 hover:underline truncate"
                >
                  View Source
                </a>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <ShoppingBag size={14} className="text-neutral-500 flex-shrink-0" />
              <span className="capitalize">{item.ownership}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-400">
              <Calendar size={14} className="text-neutral-500 flex-shrink-0" />
              <span>Added {formatDate(item.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-primary-800 bg-primary-900 shrink-0">
          {showConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-300 text-center">
                Delete this item? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-primary-800 text-white hover:bg-primary-700
                    text-xs font-bold uppercase tracking-widest transition-all rounded-lg border border-primary-700
                    disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-error-500 text-white hover:bg-error-600
                    text-xs font-bold uppercase tracking-widest transition-all rounded-lg
                    disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-primary-800 text-white hover:bg-primary-700
                  text-xs font-bold uppercase tracking-widest transition-all rounded-lg border border-primary-700"
              >
                Close
              </button>
              {onDelete && (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="px-4 py-3 bg-primary-800 text-error-400 hover:bg-error-500/20 hover:text-error-300
                    text-xs font-bold uppercase tracking-widest transition-all rounded-lg border border-primary-700
                    hover:border-error-500/50"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}