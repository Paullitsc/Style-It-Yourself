'use client'

import { AESTHETIC_TAGS } from '@/types'
import { cn } from '@/lib/cn'

interface AestheticsSelectorProps {
  selected: string[]
  onToggle: (tag: string) => void
  limit?: number
}

export default function AestheticsSelector({
  selected,
  onToggle,
  limit = 3,
}: AestheticsSelectorProps) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          Aesthetics
        </label>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 opacity-70">
          {selected.length} / {limit} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {AESTHETIC_TAGS.map((tag) => {
          const isSelected = selected.includes(tag)
          const isDisabled = selected.length >= limit && !isSelected

          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              className={cn(
                'pb-[2px] border-b transition-colors duration-200',
                'font-mono text-[11px] uppercase tracking-[0.12em]',
                isSelected
                  ? 'border-ink text-ink font-bold'
                  : isDisabled
                  ? 'border-transparent text-ink-3 opacity-40 cursor-not-allowed'
                  : 'border-transparent text-ink-3 font-normal hover:text-ink hover:border-ink',
              )}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
