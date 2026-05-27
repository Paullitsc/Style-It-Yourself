'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { getMatchingItems } from '@/lib/api'
import { cn } from '@/lib/cn'
import type {
  CategoryRecommendation,
  RecommendedColor,
  ClothingItemResponse,
} from '@/types'
import { FORMALITY_LEVELS } from '@/types'

interface SuggestionPanelProps {
  recommendation: CategoryRecommendation | null
  categoryL1: string
  selectedColor?: RecommendedColor | null
  onColorClick?: (color: RecommendedColor) => void
  onQuickAdd?: (item: ClothingItemResponse) => void
}

export default function SuggestionPanel({
  recommendation,
  categoryL1,
  selectedColor,
  onColorClick,
  onQuickAdd,
}: SuggestionPanelProps) {
  const { session } = useAuth()
  const [matchingItems, setMatchingItems] = useState<ClothingItemResponse[]>([])
  const [totalInCategory, setTotalInCategory] = useState(0)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMatches() {
      if (!recommendation || !session?.access_token) {
        setMatchingItems([])
        return
      }
      setIsLoadingMatches(true)
      setMatchError(null)
      try {
        const response = await getMatchingItems(
          {
            category_l1: categoryL1,
            recommended_colors: recommendation.colors,
            formality_range: recommendation.formality_range,
            limit: 50,
          },
          session.access_token,
        )
        setMatchingItems(response.items)
        setTotalInCategory(response.total_in_category)
      } catch (err) {
        console.error('Failed to fetch matching items:', err)
        setMatchError('Could not load closet items.')
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
        <p className="font-display italic text-[24px] leading-tight mb-2">
          No suggestions yet.
        </p>
        <p className="font-display italic text-[16px] text-ink-2 max-w-[28ch]">
          Upload a base item first to get colour and styling recommendations.
        </p>
      </div>
    )
  }

  const lowerCat = categoryL1.toLowerCase()

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-5 border-b border-ink">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
          Suggestions
        </p>
        <h3 className="font-display text-[24px] leading-none tracking-[-0.015em]">
          For your <em className="italic text-ink-3">{lowerCat}.</em>
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-8">
        {/* Quick picks */}
        {session?.access_token && (
          <section>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
              From your closet
            </div>

            {isLoadingMatches ? (
              <p className="font-display italic text-[15px] text-ink-2">
                Searching your closet…
              </p>
            ) : matchError ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                {matchError}
              </p>
            ) : matchingItems.length > 0 ? (
              <ul className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                {matchingItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onQuickAdd?.(item)}
                      className="group w-full flex items-center gap-3 px-3 py-2 border border-ink bg-paper hover:bg-paper-3 transition-colors text-left"
                    >
                      <div className="w-10 h-12 bg-paper-2 border border-ink shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.category.l2}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-[14px] leading-none truncate">
                          {item.category.l2}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <i
                            className="w-2 h-2 border border-ink"
                            style={{ backgroundColor: item.color.hex }}
                            aria-hidden="true"
                          />
                          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3 truncate">
                            {item.color.name} ·{' '}
                            {
                              FORMALITY_LEVELS[
                                item.formality as keyof typeof FORMALITY_LEVELS
                              ]
                            }
                          </span>
                        </div>
                      </div>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 group-hover:text-ink shrink-0"
                        aria-hidden="true"
                      >
                        ＋
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : totalInCategory > 0 ? (
              <p className="font-display italic text-[14px] text-ink-2 leading-tight">
                No matches in your closet. You have {totalInCategory}{' '}
                {lowerCat} but none meet the recommendations.
              </p>
            ) : (
              <p className="font-display italic text-[14px] text-ink-2 leading-tight">
                No {lowerCat} in your closet yet. Upload one below.
              </p>
            )}
          </section>
        )}

        {session?.access_token && <hr className="border-t border-rule-soft" />}

        {/* Recommended colors */}
        {(() => {
          const harmonies = recommendation.colors.filter(
            (c) => c.harmony_type !== 'neutral',
          )
          const neutrals = recommendation.colors.filter(
            (c) => c.harmony_type === 'neutral',
          )

          const renderColorButton = (color: RecommendedColor, key: string) => {
            const isActive =
              selectedColor?.hex.toLowerCase() === color.hex.toLowerCase()
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onColorClick?.(color)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 border border-ink text-left transition-colors',
                    isActive ? 'bg-paper-3' : 'bg-paper hover:bg-paper-2',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-[10px] text-ink shrink-0 w-3 text-center',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden="true"
                  >
                    →
                  </span>
                  <i
                    className="inline-block w-[20px] h-[20px] border border-ink shrink-0"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'font-display text-[15px] leading-none',
                        isActive && 'font-bold',
                      )}
                    >
                      {color.name}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 mt-1">
                      {color.hex.toUpperCase()}
                    </p>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 shrink-0">
                    {color.harmony_type}
                  </span>
                </button>
              </li>
            )
          }

          return (
            <>
              {harmonies.length > 0 && (
                <section>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
                    Harmonies
                  </div>
                  <ul className="flex flex-col gap-2">
                    {harmonies.map((color, i) =>
                      renderColorButton(color, `h-${i}`),
                    )}
                  </ul>
                </section>
              )}

              {neutrals.length > 0 && (
                <section>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
                    Neutrals
                  </div>
                  <ul className="flex flex-col gap-2">
                    {neutrals.map((color, i) =>
                      renderColorButton(color, `n-${i}`),
                    )}
                  </ul>
                </section>
              )}
            </>
          )
        })()}

        <hr className="border-t border-rule-soft" />

        {/* Formality range */}
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
            Formality range
          </div>
          <div
            className="flex gap-[3px] mb-3"
            role="presentation"
            aria-hidden="true"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const isInRange =
                n >= recommendation.formality_range.min &&
                n <= recommendation.formality_range.max
              return (
                <div
                  key={n}
                  className={`h-3 flex-1 border border-ink ${
                    isInRange ? 'bg-ink' : 'bg-paper'
                  }`}
                />
              )
            })}
          </div>
          <div className="flex justify-between gap-1">
            {Object.entries(FORMALITY_LEVELS).map(([level, label]) => {
              const levelNum = Number(level)
              const isInRange =
                levelNum >= recommendation.formality_range.min &&
                levelNum <= recommendation.formality_range.max
              return (
                <span
                  key={level}
                  className={`font-mono text-[9px] uppercase tracking-[0.08em] ${
                    isInRange ? 'text-ink font-bold' : 'text-ink-3 font-normal'
                  }`}
                >
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        <hr className="border-t border-rule-soft" />

        {/* Suggested styles */}
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
            Suggested styles
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {recommendation.suggested_l2.map((l2, i) => (
              <span
                key={i}
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink"
              >
                {l2}
              </span>
            ))}
          </div>
        </section>

        {recommendation.aesthetics.length > 0 && (
          <>
            <hr className="border-t border-rule-soft" />
            <section>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
                Matching aesthetics
              </div>
              <div className="font-display italic text-[16px] leading-snug text-ink-2">
                {recommendation.aesthetics.map((tag, i) => (
                  <span key={tag}>
                    {i > 0 && <span className="text-ink-3"> · </span>}
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}

        {recommendation.example && (
          <>
            <hr className="border-t border-rule-soft" />
            <section>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
                Note
              </div>
              <p className="font-display italic text-[15px] leading-[1.4] text-ink-2">
                {recommendation.example}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
