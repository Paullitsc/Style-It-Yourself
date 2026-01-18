'use client'

import { X, ExternalLink, Sparkles, Tag, DollarSign, Shirt } from 'lucide-react'
import type { ClothingItemCreate } from '@/types'
import { FORMALITY_LEVELS } from '@/types'

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
            {isBase && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-500 bg-accent-500/10 px-2 py-0.5 rounded-full">
                Base Item
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 scrollbar-hide">
          {/* Image */}
          <div className="aspect-[3/4] bg-primary-800 rounded-lg overflow-hidden border border-primary-700 mb-6 relative">
            {item.image_url ? (
              <img src={item.image_url} alt="Item" className="w-full h-full object-contain" />
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
                Category
              </label>
              <p className="text-sm font-medium text-white">{item.category.l1} / {item.category.l2}</p>
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
          {(item.brand || item.price || item.source_url) && (
            <div className="pt-6 border-t border-primary-800 space-y-3">
              {item.brand && (
                <div className="flex items-center gap-3 text-sm text-neutral-300">
                  <Tag size={14} className="text-neutral-500" />
                  <span>{item.brand}</span>
                </div>
              )}
              {item.price && (
                <div className="flex items-center gap-3 text-sm text-neutral-300">
                  <DollarSign size={14} className="text-neutral-500" />
                  <span>${item.price.toFixed(2)}</span>
                </div>
              )}
              {item.source_url && (
                <div className="flex items-center gap-3 text-sm">
                  <ExternalLink size={14} className="text-neutral-500" />
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
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-primary-800 bg-primary-900 shrink-0">
          {tryOnUrl && onViewTryOn ? (
            <button
              onClick={onViewTryOn}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 
                bg-accent-500/10 text-accent-500 border border-accent-500/50
                hover:bg-accent-500 hover:text-primary-900
                text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
            >
              <Sparkles size={16} />
              View Try-On Result
            </button>
          ) : onTryOn ? (
            <button
              onClick={onTryOn}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 
                bg-white text-primary-900 hover:bg-neutral-200
                text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
            >
              <Sparkles size={16} />
              Try On Item
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}