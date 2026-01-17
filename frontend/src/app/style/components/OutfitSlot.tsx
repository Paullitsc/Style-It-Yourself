'use client'

import { useState, useCallback } from 'react'
import { Plus, X, Star, Sparkles } from 'lucide-react'
import type { ClothingItemCreate } from '@/types'
import { REQUIRED_CATEGORIES } from '@/store/styleStore'

interface OutfitSlotProps {
  categoryL1: string
  item: ClothingItemCreate | null
  isBase?: boolean
  isSelected?: boolean
  tryOnUrl?: string | null
  onClick?: () => void
  onItemClick?: () => void  // Click on filled item to view details
  onRemove?: () => void
  onTryOnClick?: () => void
}

export default function OutfitSlot({
  categoryL1,
  item,
  isBase = false,
  isSelected = false,
  tryOnUrl = null,
  onClick,
  onItemClick,
  onRemove,
  onTryOnClick,
}: OutfitSlotProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const isRequired = REQUIRED_CATEGORIES.includes(categoryL1)
  const isFilled = item !== null
  const hasTryOn = !!tryOnUrl

  const handleSlotClick = useCallback(() => {
    if (isFilled && onItemClick) {
      onItemClick()
    } else if (!isFilled && onClick) {
      onClick()
    }
  }, [isFilled, onClick, onItemClick])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove?.()
  }, [onRemove])

  const handleTryOnBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onTryOnClick?.()
  }, [onTryOnClick])

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slot Card - 208x272px (w-52 h-68) */}
      <div
        onClick={handleSlotClick}
        className={`
          relative w-52 h-68 rounded-lg overflow-hidden transition-all duration-200
          ${!isFilled || onItemClick ? 'cursor-pointer' : ''}
          ${isRequired 
            ? 'border-2 border-solid' 
            : 'border-2 border-dashed'
          }
          ${isBase 
            ? 'border-accent-500 bg-accent-500/5' 
            : isSelected
              ? 'border-white bg-primary-700'
              : isFilled
                ? 'border-primary-600 bg-primary-800'
                : 'border-primary-600 bg-primary-800/50 hover:border-primary-500 hover:bg-primary-800'
          }
        `}
        style={{ height: '272px' }}
      >
        {isFilled ? (
          // Filled state
          <>
            {/* Item Image */}
            <div className="absolute inset-0 transition-opacity duration-200">
              <img
                src={item!.image_url}
                alt={item!.category.l2 || item!.category.l1}
                className={`w-full h-full object-contain p-3 transition-opacity duration-200 ${
                  isHovered && hasTryOn ? 'opacity-0' : 'opacity-100'
                }`}
              />
            </div>

            {/* Try-On Image (shown on hover) */}
            {hasTryOn && (
              <div 
                className={`absolute inset-0 transition-opacity duration-200 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={tryOnUrl!}
                  alt="Try-on preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Color indicator */}
            <div 
              className={`absolute bottom-3 left-3 w-5 h-5 rounded-full border-2 border-primary-900 shadow-md transition-opacity duration-200 ${
                isHovered && hasTryOn ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ backgroundColor: item!.color.hex }}
            />

            {/* Base item star badge */}
            {isBase && (
              <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center shadow-md">
                <Star size={12} className="text-primary-900 fill-current" />
              </div>
            )}

            {/* Try-on sparkle badge (when try-on available) */}
            {hasTryOn && (
              <button
                onClick={handleTryOnBadgeClick}
                className={`
                  absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                  transition-all duration-200 z-10
                  ${isHovered 
                    ? 'bg-accent-500 shadow-lg shadow-accent-500/50' 
                    : 'bg-primary-700 border border-primary-600'
                  }
                `}
              >
                <Sparkles 
                  size={14} 
                  className={isHovered ? 'text-primary-900' : 'text-accent-500'} 
                />
              </button>
            )}

            {/* Remove button (appears on hover, not for base item) */}
            {!isBase && onRemove && isHovered && (
              <button
                onClick={handleRemove}
                className="absolute top-3 left-3 w-7 h-7 rounded-full bg-primary-900/90 border border-primary-600 
                  flex items-center justify-center text-neutral-400 hover:text-error-500 hover:border-error-500 
                  transition-colors z-10"
              >
                <X size={14} />
              </button>
            )}
          </>
        ) : (
          // Empty state
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center transition-colors
              ${isSelected ? 'bg-white' : 'bg-primary-700'}
            `}>
              <Plus 
                size={24} 
                className={isSelected ? 'text-primary-900' : 'text-neutral-500'} 
              />
            </div>
            <div className="text-center">
              <span className="text-xs uppercase tracking-wider text-neutral-400 block">
                {isSelected ? 'Adding...' : 'Click to Add'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Category Label */}
      <div className="mt-3 text-center">
        <span className={`
          text-xs font-bold uppercase tracking-widest
          ${isBase ? 'text-accent-500' : isFilled ? 'text-white' : 'text-neutral-500'}
        `}>
          {categoryL1}
        </span>
        
        {/* Sub-label: L2 category for filled, required/optional badge for empty */}
        {isFilled ? (
          <p className="text-[10px] text-neutral-500 truncate max-w-[180px] mt-0.5">
            {item!.category.l2}
            {isBase && <span className="text-accent-500 ml-1">• Base</span>}
          </p>
        ) : (
          <p className={`text-[10px] uppercase tracking-wider mt-0.5 ${
            isRequired ? 'text-accent-600' : 'text-neutral-600'
          }`}>
            {isRequired ? 'Required' : 'Optional'}
          </p>
        )}
      </div>
    </div>
  )
}