'use client'

import { Sparkles, Lightbulb } from 'lucide-react'
import type { CategoryRecommendation, RecommendedColor } from '@/types'
import { FORMALITY_LEVELS } from '@/types'

interface SuggestionPanelProps {
  recommendation: CategoryRecommendation | null
  categoryL1: string
  onColorClick?: (color: RecommendedColor) => void
}

// Harmony type styling
const getHarmonyStyle = (type: string) => {
  switch (type) {
    case 'complementary':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'analogous':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'triadic':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'neutral':
      return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
    default:
      return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
  }
}

export default function SuggestionPanel({ 
  recommendation, 
  categoryL1,
  onColorClick 
}: SuggestionPanelProps) {
  if (!recommendation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-primary-800 flex items-center justify-center mb-4">
          <Sparkles size={24} className="text-neutral-600" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-2">
          No Suggestions Available
        </h3>
        <p className="text-xs text-neutral-600 max-w-xs">
          Upload your base item first to get AI-powered recommendations.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-primary-700">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
            <Sparkles size={14} className="text-accent-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              Suggestions
            </h3>
            <p className="text-[10px] text-neutral-500">
              For your {categoryL1.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Suggested Colors */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
            Recommended Colors
          </label>
          <div className="space-y-2">
            {recommendation.colors.map((color, i) => (
              <button
                key={i}
                onClick={() => onColorClick?.(color)}
                className="w-full group flex items-center gap-3 p-3 bg-primary-800 rounded-lg border border-primary-700 hover:border-primary-500 transition-all"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-primary-600 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex-1 text-left">
                  <span className="text-sm text-white font-medium block">{color.name}</span>
                  <span className="text-[10px] text-neutral-500 uppercase">{color.hex}</span>
                </div>
                <span className={`text-[9px] uppercase px-2 py-1 rounded border ${getHarmonyStyle(color.harmony_type)}`}>
                  {color.harmony_type}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Formality Range */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
            Formality Range
          </label>
          <div className="p-4 bg-primary-800 rounded-lg border border-primary-700">
            {/* Visual Track */}
            <div className="relative h-2 bg-primary-700 rounded-full overflow-hidden mb-3">
              <div 
                className="absolute h-full bg-gradient-to-r from-accent-600 to-accent-400 rounded-full"
                style={{
                  left: `${(recommendation.formality_range.min - 1) * 25}%`,
                  width: `${(recommendation.formality_range.max - recommendation.formality_range.min + 1) * 25}%`,
                }}
              />
            </div>
            {/* Labels */}
            <div className="flex justify-between">
              {Object.entries(FORMALITY_LEVELS).map(([level, label]) => {
                const levelNum = Number(level)
                const isInRange = levelNum >= recommendation.formality_range.min && 
                                  levelNum <= recommendation.formality_range.max
                return (
                  <span 
                    key={level}
                    className={`text-[9px] uppercase tracking-wider ${
                      isInRange ? 'text-accent-400 font-bold' : 'text-neutral-600'
                    }`}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Suggested Sub-Categories */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
            Suggested Styles
          </label>
          <div className="flex flex-wrap gap-2">
            {recommendation.suggested_l2.map((l2, i) => (
              <span
                key={i}
                className="px-3 py-2 bg-primary-800 border border-primary-700 rounded-lg text-xs text-neutral-300 font-medium"
              >
                {l2}
              </span>
            ))}
          </div>
        </div>

        {/* Aesthetics */}
        {recommendation.aesthetics.length > 0 && (
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
              Matching Aesthetics
            </label>
            <div className="flex flex-wrap gap-2">
              {recommendation.aesthetics.map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-accent-400 bg-accent-500/10 border border-accent-500/30 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pro Tip */}
        <div className="p-4 bg-primary-800/50 rounded-lg border border-primary-700/50">
          <div className="flex gap-3">
            <Lightbulb size={16} className="text-accent-500 shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-400 leading-relaxed">
              {recommendation.example}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}