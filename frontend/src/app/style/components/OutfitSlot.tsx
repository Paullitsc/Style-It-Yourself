'use client'

import { useState, useCallback } from 'react'
import type { ClothingItemCreate } from '@/types'
import { REQUIRED_CATEGORIES } from '@/store/styleStore'
import { cn } from '@/lib/cn'

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
  compact?: boolean
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
    if (isFilled && onItemClick) onItemClick()
    else if (!isFilled && onClick) onClick()
  }, [isFilled, onClick, onItemClick])

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onRemove?.()
    },
    [onRemove],
  )

  const handleTryOnBadgeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onTryOnClick?.()
    },
    [onTryOnClick],
  )

  return (
    <div
      className="relative flex flex-col items-stretch"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Frame */}
      <div
        onClick={handleSlotClick}
        role={isFilled ? 'button' : 'button'}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSlotClick()
          }
        }}
        className={cn(
          'group relative aspect-[4/5] overflow-hidden',
          'transition-colors duration-200',
          !isFilled || onItemClick ? 'cursor-pointer' : '',
          'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
          isFilled
            ? 'border border-ink bg-paper-2'
            : isRequired
            ? 'border border-dashed border-ink bg-paper-2 hover:bg-paper-3'
            : 'border border-dashed border-ink-3 bg-paper hover:border-ink hover:bg-paper-2',
          isSelected && 'border-ink bg-paper-3',
        )}
      >
        {isFilled ? (
          <>
            {/* Item image */}
            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-200',
                isHovered && hasTryOn ? 'opacity-0' : 'opacity-100',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item!.image_url}
                alt={item!.category.l2 || item!.category.l1}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Try-on image on hover */}
            {hasTryOn && (
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-200',
                  isHovered ? 'opacity-100' : 'opacity-0',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tryOnUrl!}
                  alt="Try-on preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Color chip bottom-left */}
            <span
              className={cn(
                'absolute bottom-2 left-2 inline-flex items-center gap-[6px] bg-paper border border-ink px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-opacity duration-200',
                isHovered && hasTryOn ? 'opacity-0' : 'opacity-100',
              )}
            >
              <i
                className="w-2 h-2 border border-ink"
                style={{ backgroundColor: item!.color.hex }}
                aria-hidden="true"
              />
              {item!.color.name}
            </span>

            {/* Base badge top-left */}
            {isBase && (
              <span className="absolute top-2 left-2 bg-ink text-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]">
                Base
              </span>
            )}

            {/* Try-on badge top-right */}
            {hasTryOn && (
              <button
                type="button"
                onClick={handleTryOnBadgeClick}
                className="absolute top-2 right-2 bg-paper border border-ink px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] hover:bg-ink hover:text-paper transition-colors"
                aria-label="View try-on"
              >
                Try-on
              </button>
            )}

            {/* Remove on hover, not for base */}
            {!isBase && onRemove && isHovered && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute bottom-2 right-2 bg-paper border border-ink text-ink px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] hover:bg-accent hover:text-paper hover:border-accent transition-colors"
                aria-label="Remove from outfit"
              >
                Remove
              </button>
            )}
          </>
        ) : (
          // Empty state
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
            <span
              className={cn(
                'font-mono leading-none',
                compact ? 'text-[28px]' : 'text-[32px]',
                isSelected ? 'text-ink' : 'text-ink-3',
              )}
              aria-hidden="true"
            >
              ＋
            </span>
            <span
              className={cn(
                'font-mono uppercase tracking-[0.1em] text-center',
                compact ? 'text-[9px]' : 'text-[10px]',
                isSelected ? 'text-ink font-bold' : 'text-ink-3',
              )}
            >
              {isSelected ? 'Adding…' : 'Click to add'}
            </span>
          </div>
        )}
      </div>

      {/* Label */}
      <div className="mt-3 text-center">
        <span
          className={cn(
            'font-mono uppercase tracking-[0.12em] pb-[2px] border-b-2 transition-colors',
            compact ? 'text-[10px]' : 'text-[11px]',
            isSelected
              ? 'text-ink font-bold border-ink'
              : isFilled
              ? 'text-ink font-bold border-transparent'
              : 'text-ink-3 font-normal border-transparent',
          )}
        >
          {categoryL1}
        </span>

        {isFilled ? (
          <p
            className={cn(
              'font-display italic text-ink-2 truncate mt-1',
              compact ? 'text-[12px]' : 'text-[14px]',
            )}
          >
            {item!.category.l2}
          </p>
        ) : (
          <p
            className={cn(
              'font-mono uppercase tracking-[0.08em] mt-1',
              compact ? 'text-[9px]' : 'text-[10px]',
              isRequired ? 'text-accent' : 'text-ink-3',
            )}
          >
            {isRequired ? 'Required' : 'Optional'}
          </p>
        )}
      </div>
    </div>
  )
}
