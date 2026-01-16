'use client'

import { X, Star, Sparkles, ExternalLink } from 'lucide-react'
import type { ClothingItemCreate } from '@/types'
import { FORMALITY_LEVELS } from '@/types'

interface ItemDetailModalProps {
  item: ClothingItemCreate
  isBase?: boolean
  tryOnUrl?: string | null
  onClose: () => void
  onViewTryOn?: () => void
  onTryOn?: () => void  // For initiating new try-on
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
      <div className="relative bg-primary-900 border border-primary-700 rounded-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold uppercase tracking-widest text-white">
              {item.category.l2}
            </h2>
            {isBase && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-500 text-[9px] uppercase font-bold rounded text-primary-900">
                <Star size={10} className="fill-current" />
                Base
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div 
              className="w-32 h-40 rounded-lg overflow-hidden border-2 flex-shrink-0"
              style={{ borderColor: item.color.hex }}
            >
              <img
                src={item.image_url}
                alt={item.category.l2}
                className="w-full h-full object-contain bg-primary-800"
              />
            </div>

            {/* Details */}
            <div className="flex-1 space-y-3">
              {/* Category */}
              <div>
                <p className="text-[9px] uppercase tracking-wider text-neutral-500">Category</p>
                <p className="text-sm text-white">{item.category.l1} → {item.category.l2}</p>
              </div>

              {/* Color */}
              <div>
                <p className="text-[9px] uppercase tracking-wider text-neutral-500">Color</p>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-5 h-5 rounded-full border border-primary-600"
                    style={{ backgroundColor: item.color.hex }}
                  />
                  <span className="text-sm text-white">{item.color.name}</span>
                  <span className="text-xs text-neutral-500 font-mono">{item.color.hex}</span>
                </div>
              </div>

              {/* Formality */}
              <div>
                <p className="text-[9px] uppercase tracking-wider text-neutral-500">Formality</p>
                <p className="text-sm text-white">{formalityLabel}</p>
              </div>

              {/* Ownership */}
              <div>
                <p className="text-[9px] uppercase tracking-wider text-neutral-500">Ownership</p>
                <p className="text-sm text-white capitalize">{item.ownership}</p>
              </div>
            </div>
          </div>

          {/* Aesthetics */}
          {item.aesthetics.length > 0 && (
            <div className="mt-4">
              <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-2">Aesthetics</p>
              <div className="flex flex-wrap gap-1.5">
                {item.aesthetics.map((tag) => (
                  <span 
                    key={tag}
                    className="px-2 py-1 text-[10px] uppercase tracking-wider bg-accent-500/20 text-accent-500 border border-accent-500/30 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Optional Details */}
          {(item.brand || item.price || item.source_url) && (
            <div className="mt-4 pt-4 border-t border-primary-800">
              <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-2">Details</p>
              <div className="space-y-2">
                {item.brand && (
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Brand</span>
                    <span className="text-sm text-white">{item.brand}</span>
                  </div>
                )}
                {item.price && (
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Price</span>
                    <span className="text-sm text-white">${item.price}</span>
                  </div>
                )}
                {item.source_url && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-500">Source</span>
                    <a 
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent-500 hover:underline flex items-center gap-1"
                    >
                      Link <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Try-On Button */}
          {tryOnUrl && onViewTryOn ? (
            <button
              onClick={onViewTryOn}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 
                bg-accent-500/20 text-accent-500 border border-accent-500/30 
                hover:bg-accent-500 hover:text-primary-900
                text-xs font-bold uppercase tracking-widest transition-all rounded"
            >
              <Sparkles size={14} />
              View Try-On
            </button>
          ) : onTryOn ? (
            <button
              onClick={onTryOn}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 
                bg-transparent text-accent-500 border border-accent-500 
                hover:bg-accent-500 hover:text-primary-900
                text-xs font-bold uppercase tracking-widest transition-all rounded"
            >
              <Sparkles size={14} />
              Try On
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}