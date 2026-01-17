'use client'

import { Check } from 'lucide-react'
import { AESTHETIC_TAGS } from '@/types'

interface AestheticsSelectorProps {
  selected: string[]
  onToggle: (tag: string) => void
  limit?: number
}

export default function AestheticsSelector({ selected, onToggle, limit = 3 }: AestheticsSelectorProps) {
  return (
    <div>
      <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-1">
        Aesthetics
      </label>
      <p className="text-[10px] text-neutral-600 mb-3">Select up to {limit} that match</p>
      <div className="flex flex-wrap gap-2">
        {AESTHETIC_TAGS.map((tag) => {
          const isSelected = selected.includes(tag)
          const isDisabled = selected.length >= limit && !isSelected
          
          return (
            <button
              key={tag}
              onClick={() => onToggle(tag)}
              disabled={isDisabled}
              className={`
                px-3 py-2 text-xs font-medium uppercase tracking-wider
                border transition-all duration-200
                ${isSelected
                  ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                  : isDisabled
                    ? 'bg-transparent text-neutral-700 border-primary-700 cursor-not-allowed'
                    : 'bg-transparent text-neutral-500 border-primary-600 hover:border-neutral-500'
                }
              `}
            >
              {isSelected && <Check size={10} className="inline mr-1.5" />}
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}