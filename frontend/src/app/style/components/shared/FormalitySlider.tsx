'use client'

import { FORMALITY_LEVELS } from '@/types'
import { cn } from '@/lib/cn'

interface FormalitySliderProps {
  value: number
  onChange: (value: number) => void
}

export default function FormalitySlider({ value, onChange }: FormalitySliderProps) {
  const levels = Object.entries(FORMALITY_LEVELS) as [string, string][]

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          Formality <span className="text-accent ml-1">*</span>
        </label>
      </div>

      {/* 5-cell scale */}
      <div
        className="flex gap-[3px] mb-3"
        role="presentation"
        aria-hidden="true"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Formality ${n}`}
            className={cn(
              'h-3 flex-1 border border-ink transition-colors',
              n <= value ? 'bg-ink' : 'bg-paper hover:bg-paper-2',
            )}
          />
        ))}
      </div>

      <div className="flex justify-between gap-2">
        {levels.map(([level, label]) => {
          const n = Number(level)
          const isActive = n === value
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={isActive}
              className={cn(
                'flex-1 text-left font-mono text-[10px] uppercase tracking-[0.08em] transition-colors',
                isActive
                  ? 'text-ink font-bold'
                  : 'text-ink-3 font-normal hover:text-ink',
                n === 5 && 'text-right',
                n !== 1 && n !== 5 && 'text-center',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
