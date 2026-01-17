'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Lightbulb, Package, Plus, Check } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { getMatchingItems } from '@/lib/api'
import type { CategoryRecommendation, RecommendedColor, ClothingItemResponse } from '@/types'
import { FORMALITY_LEVELS } from '@/types'

interface SuggestionPanelProps {
  recommendation: CategoryRecommendation | null
  categoryL1: string
  onColorClick?: (color: RecommendedColor) => void
  onQuickAdd?: (item: ClothingItemResponse) => void
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
  onColorClick,
  onQuickAdd,
}: SuggestionPanelProps) {
  const { session } = useAuth()
  const [matchingItems, setMatchingItems] = useState<ClothingItemResponse[]>([])
  const [totalInCategory, setTotalInCategory] = useState(0)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  // Fetch matching items from closet when recommendation changes
  useEffect(() => {
    async function fetchMatches() {
      if (!recommendation || !session?.access_token) {
        setMatchingItems([])
        return
      }

      setIsLoadingMatches(true)
      setMatchError(null)

      try {
        const response = await getMatchingItems({
          category_l1: categoryL1,
          recommended_colors: recommendation.colors,
          formality_range: recommendation.formality_range,
          limit: 5,
        }, session.access_token)

        setMatchingItems(response.items)
        setTotalInCategory(response.total_in_category)
      } catch (err) {
        console.error('Failed to fetch matching items:', err)
        setMatchError('Could not load closet items')
        setMatchingItems([])
      } finally {
        setIsLoadingMatches(false)
      }
    }

    fetchMatches()
  }, [recommendation, categoryL1, session?.access_token])

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
              AI Suggestions
            </h3>
            <p className="text-[10px] text-neutral-500">
              For your {categoryL1.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Quick Picks from Closet */}
        {session?.access_token && (
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
              <Package size={12} />
              Quick Picks from Your Closet
            </label>
            
            {isLoadingMatches ? (
              <div className="flex items-center gap-3 p-4 bg-primary-800/50 rounded-lg">
                <div className="w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-neutral-400">Searching your closet...</span>
              </div>
            ) : matchError ? (
              <div className="p-4 bg-primary-800/50 rounded-lg">
                <p className="text-xs text-neutral-500">{matchError}</p>
              </div>
            ) : matchingItems.length > 0 ? (
              <div className="space-y-2">
                {matchingItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onQuickAdd?.(item)}
                    className="w-full group flex items-center gap-3 p-3 bg-primary-800 rounded-lg border border-primary-700 hover:border-accent-500/50 hover:bg-primary-800/80 transition-all"
                  >
                    {/* Item thumbnail */}
                    <div className="w-12 h-14 rounded bg-primary-700 overflow-hidden shrink-0">
                      <img 
                        src={item.image_url} 
                        alt={item.category.l2}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* Item info */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {item.category.l2}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-3 h-3 rounded-full border border-primary-600"
                          style={{ backgroundColor: item.color.hex }}
                        />
                        <span className="text-[10px] text-neutral-500 truncate">
                          {item.color.name} • {FORMALITY_LEVELS[item.formality as keyof typeof FORMALITY_LEVELS]}
                        </span>
                      </div>
                    </div>

                    {/* Add indicator */}
                    <div className="w-8 h-8 rounded-full bg-primary-700 group-hover:bg-accent-500 flex items-center justify-center transition-colors shrink-0">
                      <Plus size={14} className="text-neutral-400 group-hover:text-primary-900" />
                    </div>
                  </button>
                ))}
                
                {totalInCategory > matchingItems.length && (
                  <p className="text-[10px] text-neutral-600 text-center pt-2">
                    Showing top {matchingItems.length} of {totalInCategory} items in {categoryL1}
                  </p>
                )}
              </div>
            ) : totalInCategory > 0 ? (
              <div className="p-4 bg-primary-800/50 rounded-lg border border-primary-700/50">
                <p className="text-xs text-neutral-400 text-center">
                  No matching items found in your closet.
                  <br />
                  <span className="text-neutral-500">
                    You have {totalInCategory} {categoryL1.toLowerCase()} but none match the recommendations.
                  </span>
                </p>
              </div>
            ) : (
              <div className="p-4 bg-primary-800/50 rounded-lg border border-primary-700/50">
                <p className="text-xs text-neutral-400 text-center">
                  No {categoryL1.toLowerCase()} in your closet yet.
                  <br />
                  <span className="text-neutral-500">Upload a new item below!</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Divider if showing quick picks */}
        {session?.access_token && (
          <div className="border-t border-primary-800" />
        )}

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