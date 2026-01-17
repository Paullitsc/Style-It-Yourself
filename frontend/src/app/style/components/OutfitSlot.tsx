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
  onItemClick?: () => void
  onRemove?: () => void
  onTryOnClick?: () => void
  compact?: boolean  // New prop for smaller size when panel is open
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
  compact = false,
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

  // Dynamic sizing based on compact mode
  const slotWidth = compact ? 'w-36' : 'w-52'
  const slotHeight = compact ? 184 : 272  // h-46 vs h-68
  const iconSize = compact ? 20 : 24
  const badgeSize = compact ? 'w-5 h-5' : 'w-6 h-6'
  const tryOnBadgeSize = compact ? 'w-6 h-6' : 'w-7 h-7'
  const colorDotSize = compact ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slot Card */}
      <div
        onClick={handleSlotClick}
        className={`
          relative ${slotWidth} rounded-lg overflow-hidden transition-all duration-200
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
        style={{ height: slotHeight }}
      >
        {isFilled ? (
          <>
            {/* Item Image */}
            <div className="absolute inset-0 transition-opacity duration-200">
              <img
                src={item!.image_url}
                alt={item!.category.l2 || item!.category.l1}
                className={`w-full h-full object-contain ${compact ? 'p-2' : 'p-3'} transition-opacity duration-200 ${
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
              className={`absolute bottom-2 left-2 ${colorDotSize} rounded-full border-2 border-primary-900 shadow-md transition-opacity duration-200 ${
                isHovered && hasTryOn ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ backgroundColor: item!.color.hex }}
            />

            {/* Base item star badge */}
            {isBase && (
              <div className={`absolute top-2 left-2 ${badgeSize} rounded-full bg-accent-500 flex items-center justify-center shadow-md`}>
                <Star size={compact ? 10 : 12} className="text-primary-900 fill-current" />
              </div>
            )}

            {/* Try-on sparkle badge */}
            {hasTryOn && (
              <button
                onClick={handleTryOnBadgeClick}
                className={`
                  absolute top-2 right-2 ${tryOnBadgeSize} rounded-full flex items-center justify-center
                  transition-all duration-200 z-10
                  ${isHovered 
                    ? 'bg-accent-500 shadow-lg shadow-accent-500/50' 
                    : 'bg-primary-700 border border-primary-600'
                  }
                `}
              >
                <Sparkles 
                  size={compact ? 12 : 14} 
                  className={isHovered ? 'text-primary-900' : 'text-accent-500'} 
                />
              </button>
            )}

            {/* Remove button (on hover, not for base) */}
            {!isBase && onRemove && isHovered && (
              <button
                onClick={handleRemove}
                className={`absolute top-2 left-2 ${tryOnBadgeSize} rounded-full bg-primary-900/90 border border-primary-600 
                  flex items-center justify-center text-neutral-400 hover:text-error-500 hover:border-error-500 
                  transition-colors z-10`}
              >
                <X size={compact ? 12 : 14} />
              </button>
            )}
          </>
        ) : (
          // Empty state
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
            <div className={`
              ${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-full flex items-center justify-center transition-colors
              ${isSelected ? 'bg-white' : 'bg-primary-700'}
            `}>
              <Plus 
                size={iconSize} 
                className={isSelected ? 'text-primary-900' : 'text-neutral-500'} 
              />
            </div>
            <div className="text-center">
              <span className={`${compact ? 'text-[10px]' : 'text-xs'} uppercase tracking-wider text-neutral-400 block`}>
                {isSelected ? 'Adding...' : 'Click to Add'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Category Label */}
      <div className="mt-2 text-center">
        <span className={`
          ${compact ? 'text-[10px]' : 'text-xs'} font-bold uppercase tracking-widest
          ${isBase ? 'text-accent-500' : isFilled ? 'text-white' : 'text-neutral-500'}
        `}>
          {categoryL1}
        </span>
        
        {isFilled ? (
          <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-neutral-500 truncate ${compact ? 'max-w-[130px]' : 'max-w-[180px]'} mt-0.5`}>
            {item!.category.l2}
            {isBase && <span className="text-accent-500 ml-1">• Base</span>}
          </p>
        ) : (
          <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} uppercase tracking-wider mt-0.5 ${
            isRequired ? 'text-accent-600' : 'text-neutral-600'
          }`}>
            {isRequired ? 'Required' : 'Optional'}
          </p>
        )}
      </div>
    </div>
  )
}