'use client'

import { FORMALITY_LEVELS } from '@/types'

interface FormalitySliderProps {
  value: number
  onChange: (value: number) => void
}

export default function FormalitySlider({ value, onChange }: FormalitySliderProps) {
  return (
    <div>
      <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
        Formality <span className="text-accent-500">*</span>
      </label>
      <div className="space-y-3">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-primary-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
        />
        <div className="flex justify-between text-[10px] uppercase tracking-wider">
          {Object.entries(FORMALITY_LEVELS).map(([level, label]) => (
            <span
              key={level}
              className={Number(level) === value ? 'text-white font-bold' : 'text-neutral-600'}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}