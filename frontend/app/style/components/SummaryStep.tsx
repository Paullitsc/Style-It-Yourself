'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Save, Sparkles, AlertTriangle, Check, X } from 'lucide-react'
import { validateOutfit, saveOutfitWithItems } from '@/lib/api'
import type { ValidateOutfitResponse } from '@/types'
import AuthModal from '@/components/AuthModal'
import TryOnOutfitModal from './TryonOutfitModal'

export default function SummaryStep() {
  const router = useRouter()
  const { user, session } = useAuth()
  
  const {
    getBaseItem,
    getAllOutfitItems,
    getAllOutfitItemsWithBlobs,
    setStep,
    reset,
  } = useStyleStore()

  const [validation, setValidation] = useState<ValidateOutfitResponse | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<string>('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [outfitName, setOutfitName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showTryOnModal, setShowTryOnModal] = useState(false)

  const baseItem = getBaseItem()
  const allItems = getAllOutfitItems()
  const allItemsWithBlobs = getAllOutfitItemsWithBlobs()
  
  // Track if validation has been done
  const hasValidated = useRef(false)

  // Validate outfit on mount (only once)
  useEffect(() => {
    if (hasValidated.current) return
    
    async function validate() {
      if (!baseItem || allItems.length === 0) return
      
      hasValidated.current = true
      setIsValidating(true)
      
      try {
        console.log('Validating outfit with:', { baseItem, allItems })
        const result = await validateOutfit(allItems, baseItem)
        console.log('Validation result:', result)
        setValidation(result)
      } catch (error) {
        console.error('Outfit validation failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error details:', errorMessage)
        setValidation({
          is_complete: true,
          cohesion_score: 70,
          verdict: 'Could not validate outfit',
          color_strip: allItems.map(item => item.color.hex),
          warnings: ['Validation service unavailable', `Error: ${errorMessage}`],
        })
      } finally {
        setIsValidating(false)
      }
    }
    
    validate()
  }, []) // Empty deps - run once on mount

  // Handle back to build
  const handleBack = useCallback(() => {
    setStep('build')
  }, [setStep])

  // Handle save click
  const handleSaveClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowNameInput(true)
  }, [user])

  // Handle try on click
  const handleTryOnClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowTryOnModal(true)
  }, [user])

  // Handle save outfit
  const handleSaveOutfit = useCallback(async () => {
    if (!user || !session?.access_token || !baseItem || allItemsWithBlobs.length === 0) return
    
    const name = outfitName.trim() || `Outfit ${new Date().toLocaleDateString()}`
    
    setIsSaving(true)
    setSaveError(null)
    setSaveProgress('Starting...')
    
    try {
      await saveOutfitWithItems(
        name,
        allItemsWithBlobs,
        session.access_token,
        (current, total, status) => {
          setSaveProgress(status)
        }
      )
      
      reset()
      router.push('/closet')
    } catch (error) {
      console.error('Save outfit failed:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save outfit')
    } finally {
      setIsSaving(false)
      setSaveProgress('')
    }
  }, [user, session, baseItem, allItemsWithBlobs, outfitName, reset, router])

  // Get score color
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
    <div className="min-h-[calc(100vh-80px)] bg-primary-900">
      {/* Header */}
      <div className="border-b border-primary-800 bg-primary-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white">
            Review Your Outfit
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Check compatibility and save to your closet
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left: Outfit Items */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
              Your Items ({allItems.length})
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {allItems.map((item, index) => (
                <div 
                  key={index}
                  className="bg-primary-800 rounded-lg border border-primary-700 overflow-hidden"
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={item.image_url}
                      alt={item.category.l2 || item.category.l1}
                      className="w-full h-full object-contain p-2"
                    />
                    {/* Color dot */}
                    <div 
                      className="absolute bottom-2 left-2 w-5 h-5 rounded-full border-2 border-primary-900"
                      style={{ backgroundColor: item.color.hex }}
                    />
                    {/* Base badge */}
                    {index === 0 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-accent-500 text-[9px] uppercase font-bold rounded">
                        Base
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-primary-700">
                    <p className="text-xs font-medium text-white truncate">
                      {item.category.l2}
                    </p>
                    <p className="text-[10px] text-neutral-500 uppercase">
                      {item.category.l1}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Color Strip */}
            {validation?.color_strip && validation.color_strip.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                  Color Palette
                </h2>
                <div className="flex rounded-lg overflow-hidden h-12">
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
          </div>

          {/* Right: Analysis */}
          <div className="space-y-6">
            
            {/* Cohesion Score */}
            <div className="bg-primary-800/50 rounded-xl border border-primary-700 p-6">
              {isValidating ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full" />
                  <span className="ml-4 text-neutral-400">Analyzing outfit...</span>
                </div>
              ) : validation ? (
                <>
                  {/* Score */}
                  <div className="text-center mb-6">
                    <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                      Cohesion Score
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <span className={`text-6xl font-bold ${getScoreColor(validation.cohesion_score)}`}>
                        {validation.cohesion_score}
                      </span>
                      <span className="text-2xl text-neutral-600">/100</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-4 h-2 bg-primary-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getScoreBgColor(validation.cohesion_score)}`}
                        style={{ width: `${validation.cohesion_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Verdict */}
                  <div className="text-center p-4 bg-primary-900/50 rounded-lg">
                    <Sparkles size={20} className="mx-auto mb-2 text-accent-500" />
                    <p className="text-white font-medium">{validation.verdict}</p>
                  </div>

                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <p className="text-xs uppercase tracking-widest text-neutral-500">Notes</p>
                      {validation.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-warning-500/10 rounded border border-warning-500/20">
                          <AlertTriangle size={14} className="text-warning-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-neutral-300">{warning}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-neutral-500">No validation data</p>
              )}
            </div>

            {/* Save Section */}
            {showNameInput ? (
              <div className="bg-primary-800/50 rounded-xl border border-primary-700 p-6 space-y-4">
                <div>
                  <label className="block text-xs uppercase font-bold tracking-widest text-neutral-500 mb-2">
                    Outfit Name
                  </label>
                  <input
                    type="text"
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    placeholder="e.g. Casual Friday, Summer Look..."
                    disabled={isSaving}
                    className="w-full px-4 py-3 bg-primary-900 border border-primary-700 text-white
                      placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors
                      disabled:opacity-50"
                  />
                </div>
                
                {saveError && (
                  <div className="flex items-center gap-2 p-3 bg-error-500/10 rounded border border-error-500/20">
                    <X size={14} className="text-error-500" />
                    <p className="text-sm text-error-400">{saveError}</p>
                  </div>
                )}

                {isSaving && saveProgress && (
                  <div className="p-3 bg-accent-500/10 rounded border border-accent-500/20">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full" />
                      <p className="text-sm text-accent-400">{saveProgress}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNameInput(false)}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 text-neutral-400 hover:text-white border border-primary-600
                      text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOutfit}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                      bg-accent-500 text-primary-900 hover:bg-accent-400
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-900 border-t-transparent rounded-full" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        Save to Closet
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSaveClick}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 
                  bg-accent-500 text-primary-900 hover:bg-accent-400
                  text-sm font-bold uppercase tracking-widest transition-all"
              >
                <Save size={18} />
                Save to Closet
                {!user && <span className="text-[10px] opacity-70">(Login Required)</span>}
              </button>
            )}

            {/* Try On Outfit Button */}
            <button
              onClick={handleTryOnClick}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 
                bg-primary-800 text-white hover:bg-primary-700
                text-sm font-bold uppercase tracking-widest border border-primary-700 transition-all"
            >
              <Sparkles size={18} />
              Try On Outfit
              {!user && <span className="text-[10px] opacity-70">(Login Required)</span>}
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-primary-800 mt-12 pt-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 text-neutral-400 hover:text-white 
              text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Edit
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* Try On Outfit Modal */}
      {showTryOnModal && session?.access_token && (
        <TryOnOutfitModal
          items={allItemsWithBlobs}
          token={session.access_token}
          onClose={() => setShowTryOnModal(false)}
        />
      )}
    </div>
  )
}