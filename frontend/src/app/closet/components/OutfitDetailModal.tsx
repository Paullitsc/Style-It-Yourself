'use client'

import { useState, useEffect } from 'react'
import { X, Package, Calendar, AlertTriangle, Sparkles } from 'lucide-react'
import type { OutfitSummary, OutfitResponse, ValidateOutfitResponse } from '@/types'
import { getOutfit, validateOutfit } from '@/lib/api'

interface OutfitDetailModalProps {
  outfit: OutfitSummary
  token: string
  onClose: () => void
}

export default function OutfitDetailModal({ outfit, token, onClose }: OutfitDetailModalProps) {
  const [fullOutfit, setFullOutfit] = useState<OutfitResponse | null>(null)
  const [validation, setValidation] = useState<ValidateOutfitResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOutfitDetails() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch full outfit data
        const outfitData = await getOutfit(outfit.id, token)
        setFullOutfit(outfitData)

        // Validate outfit if we have items
        if (outfitData.items.length > 0) {
          const baseItem = outfitData.items[0]
          const otherItems = outfitData.items.slice(1)
          
          try {
            const validationResult = await validateOutfit(otherItems, baseItem)
            setValidation(validationResult)
          } catch (validationError) {
            console.error('Validation failed:', validationError)
            // Create a fallback validation response
            setValidation({
              is_complete: true,
              cohesion_score: 70,
              verdict: 'Validation unavailable',
              warnings: [],
              color_strip: outfitData.items.map(item => item.color.hex)
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch outfit:', err)
        setError(err instanceof Error ? err.message : 'Failed to load outfit details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOutfitDetails()
  }, [outfit.id, token])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-500'
    if (score >= 60) return 'text-warning-500'
    return 'text-error-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-success-500'
    if (score >= 60) return 'bg-warning-500'
    return 'bg-error-500'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-primary-900 border border-primary-700 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest text-white">
              {outfit.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={12} className="text-neutral-500" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                {formatDate(outfit.created_at)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 scrollbar-hide">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full mb-4" />
              <p className="text-neutral-500 text-sm uppercase tracking-wide">Loading outfit details...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle size={32} className="text-error-500 mb-4" />
              <p className="text-white font-medium mb-2">Failed to load outfit</p>
              <p className="text-neutral-500 text-sm">{error}</p>
            </div>
          )}

          {/* Loaded Content */}
          {!isLoading && !error && fullOutfit && (
            <div className="space-y-6">
              {/* Hero Image */}
              <div className="aspect-[4/3] bg-primary-800 rounded-lg overflow-hidden border border-primary-700 relative">
                {fullOutfit.generated_image_url ? (
                  <img 
                    src={fullOutfit.generated_image_url} 
                    alt={outfit.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
                    <Package size={48} strokeWidth={1} className="mb-2" />
                    <span className="text-xs uppercase tracking-wider">No generated image</span>
                  </div>
                )}

                {/* Item count badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-primary-900/90 border border-primary-700 
                  rounded text-[10px] font-bold uppercase tracking-wide text-white">
                  {fullOutfit.items.length} {fullOutfit.items.length === 1 ? 'item' : 'items'}
                </div>
              </div>

              {/* Items Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                  Items in this outfit
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {fullOutfit.items.map((item, index) => (
                    <div 
                      key={item.id}
                      className="bg-primary-800 rounded-lg border border-primary-700 overflow-hidden"
                    >
                      <div className="aspect-square relative bg-primary-900">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.category.l2}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={20} className="text-neutral-600" />
                          </div>
                        )}
                        
                        {/* Color dot */}
                        <div
                          className="absolute bottom-1 left-1 w-3 h-3 rounded-full border border-primary-900"
                          style={{ backgroundColor: item.color.hex }}
                        />

                        {/* Base badge */}
                        {index === 0 && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-accent-500 text-[8px] uppercase font-bold rounded text-primary-900">
                            Base
                          </div>
                        )}
                      </div>
                      <div className="p-2 border-t border-primary-700">
                        <p className="text-[10px] font-medium text-white truncate">
                          {item.category.l2}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation Section */}
              {validation && (
                <div className="bg-primary-800/50 rounded-xl border border-primary-700 p-5">
                  {/* Score */}
                  <div className="text-center mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
                      Cohesion Score
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <span className={`text-4xl font-bold ${getScoreColor(validation.cohesion_score)}`}>
                        {validation.cohesion_score}
                      </span>
                      <span className="text-lg text-neutral-600">/100</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-primary-700 rounded-full overflow-hidden max-w-xs mx-auto">
                      <div 
                        className={`h-full transition-all duration-500 ${getScoreBgColor(validation.cohesion_score)}`}
                        style={{ width: `${validation.cohesion_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Verdict */}
                  <div className="text-center p-3 bg-primary-900/50 rounded-lg mb-4">
                    <Sparkles size={16} className="mx-auto mb-1 text-accent-500" />
                    <p className="text-white text-sm font-medium">{validation.verdict}</p>
                  </div>

                  {/* Color Strip */}
                  {validation.color_strip && validation.color_strip.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2 text-center">
                        Color Palette
                      </p>
                      <div className="flex rounded-lg overflow-hidden h-8">
                        {validation.color_strip.map((color, i) => (
                          <div 
                            key={i}
                            className="flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500">Notes</p>
                      {validation.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-warning-500/10 rounded border border-warning-500/20">
                          <AlertTriangle size={12} className="text-warning-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-neutral-300">{warning}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-primary-800 bg-primary-900 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary-800 text-white hover:bg-primary-700
              text-xs font-bold uppercase tracking-widest transition-all rounded-lg border border-primary-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}