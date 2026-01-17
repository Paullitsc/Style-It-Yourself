'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import {
  X, ArrowRight, ArrowLeft, Check, AlertTriangle, Sparkles, RotateCcw, Info, 
  ChevronDown, Tag, DollarSign, Link as LinkIcon
} from 'lucide-react'
import { CATEGORY_TAXONOMY } from '@/types'
import type { CategoryRecommendation, RecommendedColor, Color } from '@/types'
import { extractDominantColors } from '@/lib/colorExtractor'
import { buildColorFromHex } from '@/lib/colorUtils'
import { validateItem } from '@/lib/api'

// Shared Atoms
import CropModal from './shared/CropModal'
import ColorPickerModal from './shared/ColorPickerModal'
import CategorySelector from './shared/CategorySelector'
import FormalitySlider from './shared/FormalitySlider'
import AestheticsSelector from './shared/AestheticsSelector'
import ColorSelector from './shared/ColorSelector'
import ImageUploadZone from './shared/ImageUploadZone'
import TryOnModal from './TryOnModal'
import AuthModal from '@/components/AuthModal'

interface AddItemPanelProps {
  categoryL1: string
  recommendation: CategoryRecommendation | null
  onClose: () => void
  suggestedColor?: RecommendedColor | null  // Color clicked from suggestion panel
}

type PanelStep = 'upload' | 'metadata' | 'colors' | 'validate'

const STEPS: { id: PanelStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'metadata', label: 'Details' },
  { id: 'colors', label: 'Colors' },
  { id: 'validate', label: 'Review' }
]

export default function AddItemPanel({ 
  categoryL1, 
  recommendation, 
  onClose,
  suggestedColor 
}: AddItemPanelProps) {
  const { user, session } = useAuth()
  
  const {
    getBaseItem, outfitItems, addingItem, itemValidation,
    setAddingItemCroppedImage, setAddingItemCategory, setAddingItemFormality,
    toggleAddingItemAesthetic, setAddingItemDetectedColors,
    selectAddingItemColor, setAddingItemAdjustedColor, setItemValidation, 
    confirmAddItem, setTryOnResult,
    setAddingItemBrand, setAddingItemPrice, setAddingItemSourceUrl,
  } = useStyleStore()

  const [currentStep, setCurrentStep] = useState<PanelStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [pendingTryOnUrl, setPendingTryOnUrl] = useState<string | null>(null)

  const baseItem = getBaseItem()
  const currentStepIndex = useMemo(() => STEPS.findIndex(s => s.id === currentStep), [currentStep])

  // Pre-fill formality from recommendation
  useEffect(() => {
    if (recommendation && currentStep === 'metadata') {
      const midFormality = Math.round(
        (recommendation.formality_range.min + recommendation.formality_range.max) / 2
      )
      setAddingItemFormality(midFormality)
    }
  }, [recommendation, currentStep, setAddingItemFormality])

  // Handle suggested color from left panel
  useEffect(() => {
    if (suggestedColor && currentStep === 'colors') {
      const color = buildColorFromHex(suggestedColor.hex)
      setAddingItemAdjustedColor(color)
    }
  }, [suggestedColor, currentStep, setAddingItemAdjustedColor])

  // UPLOAD LOGIC
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setShowCropModal(true)
  }, [])

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(croppedBlob)
    setAddingItemCroppedImage({ originalFile: selectedFile, croppedBlob, croppedUrl })
    setShowCropModal(false)
    setCurrentStep('metadata')
  }, [selectedFile, setAddingItemCroppedImage])

  const handleL2Select = useCallback((l2: string) => {
    setAddingItemCategory(categoryL1, l2)
  }, [categoryL1, setAddingItemCategory])

  // COLOR LOGIC - Extract colors + add suggested colors
  useEffect(() => {
    if (currentStep === 'colors' && addingItem.croppedImage && addingItem.detectedColors.length === 0) {
      setIsExtracting(true)
      extractDominantColors(addingItem.croppedImage.croppedBlob, 3)
        .then((detectedColors) => {
          // Add suggested colors that aren't already detected
          if (recommendation?.colors) {
            const suggestedToAdd = recommendation.colors
              .filter(sc => !detectedColors.some(dc => 
                dc.hex.toLowerCase() === sc.hex.toLowerCase()
              ))
              .slice(0, 2) // Add up to 2 suggested colors
              .map(sc => ({
                hex: sc.hex,
                name: `${sc.name} (suggested)`,
                hsl: buildColorFromHex(sc.hex).hsl,
                isNeutral: sc.harmony_type === 'neutral'
              }))
            
            setAddingItemDetectedColors([...detectedColors, ...suggestedToAdd])
          } else {
            setAddingItemDetectedColors(detectedColors)
          }
        })
        .catch(err => console.error("Color extraction failed", err))
        .finally(() => setIsExtracting(false))
    }
  }, [currentStep, addingItem.croppedImage, addingItem.detectedColors.length, recommendation, setAddingItemDetectedColors])

  const handleCustomColor = useCallback((hex: string) => {
    setAddingItemAdjustedColor(buildColorFromHex(hex))
    setShowColorPicker(false)
  }, [setAddingItemAdjustedColor])

  // VALIDATION LOGIC
  const handleValidateAndAdd = useCallback(async () => {
    if (!baseItem || !addingItem.adjustedColor || !addingItem.category || !addingItem.croppedImage) return
    
    setIsValidating(true)
    try {
      const newItem = {
        image_url: addingItem.croppedImage.croppedUrl,
        color: addingItem.adjustedColor,
        category: addingItem.category,
        formality: addingItem.formality,
        aesthetics: addingItem.aesthetics,
        ownership: addingItem.ownership,
      }
      const currentItems = outfitItems.map(oi => oi.item)
      const validation = await validateItem(newItem, baseItem, currentItems)
      setItemValidation(validation)
      setCurrentStep('validate')
    } catch (error) {
      console.error('Validation failed', error)
      setItemValidation({
        color_status: 'ok', 
        formality_status: 'ok', 
        aesthetic_status: 'cohesive',
        pairing_status: 'ok', 
        warnings: ['Validation service unavailable - proceeding with caution']
      })
      setCurrentStep('validate')
    } finally {
      setIsValidating(false)
    }
  }, [baseItem, addingItem, outfitItems, setItemValidation])

  const handleConfirmAdd = useCallback(() => {
    if (pendingTryOnUrl) setTryOnResult(categoryL1, pendingTryOnUrl)
    confirmAddItem()
    onClose()
  }, [confirmAddItem, onClose, pendingTryOnUrl, categoryL1, setTryOnResult])

  // Status badge helper
  const getStatusBadge = (label: string, status: string) => {
    const styles: Record<string, string> = {
      ok: 'bg-success-500/10 text-success-500 border-success-500/20',
      cohesive: 'bg-success-500/10 text-success-500 border-success-500/20',
      warning: 'bg-warning-500/10 text-warning-500 border-warning-500/20',
      mismatch: 'bg-error-500/10 text-error-500 border-error-500/20',
    }
    const style = styles[status] || styles.warning

    return (
      <div className={`flex items-center justify-between p-3 rounded border ${style}`}>
        <span className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase">{status}</span>
          {status === 'ok' || status === 'cohesive' ? <Check size={14} /> : <AlertTriangle size={14} />}
        </div>
      </div>
    )
  }

  // Check if L2 is suggested
  const isL2Suggested = (l2: string) => {
    return recommendation?.suggested_l2.includes(l2) ?? false
  }

  return (
    <div className="h-full flex flex-col bg-primary-900">
      {/* Header */}
      <div className="shrink-0 p-5 border-b border-primary-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white">
            Add {categoryL1}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-neutral-500 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="flex gap-1">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex-1">
              <div className={`h-1 rounded-full transition-colors duration-300 ${
                i <= currentStepIndex ? 'bg-accent-500' : 'bg-primary-700'
              }`} />
              <span className={`text-[9px] uppercase font-bold tracking-wider mt-1 block ${
                i <= currentStepIndex ? 'text-white' : 'text-neutral-600'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* STEP 1: UPLOAD */}
        {currentStep === 'upload' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {addingItem.croppedImage ? (
              <div className="flex flex-col items-center gap-6">
                <div className="w-full max-w-xs aspect-[3/4] bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                  <img 
                    src={addingItem.croppedImage.croppedUrl} 
                    alt="Uploaded item"
                    className="w-full h-full object-contain" 
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { 
                      setSelectedFile(addingItem.croppedImage!.originalFile)
                      setShowCropModal(true) 
                    }} 
                    className="flex items-center gap-2 px-4 py-2.5 border border-primary-600 text-neutral-400 hover:text-white text-xs font-bold uppercase rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} /> Re-crop
                  </button>
                  <button 
                    onClick={() => setCurrentStep('metadata')} 
                    className="flex items-center gap-2 px-6 py-2.5 bg-white text-primary-900 hover:bg-neutral-200 text-xs font-bold uppercase rounded-lg transition-colors"
                  >
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <ImageUploadZone 
                onFileSelect={handleFileSelect} 
                label={`Drop your ${categoryL1.toLowerCase()} image`}
                compact
              />
            )}
          </div>
        )}

        {/* STEP 2: METADATA */}
        {currentStep === 'metadata' && addingItem.croppedImage && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Image Preview (smaller) */}
            <div className="flex justify-center">
              <div className="w-32 h-40 bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                <img 
                  src={addingItem.croppedImage.croppedUrl} 
                  alt="Item preview"
                  className="w-full h-full object-contain" 
                />
              </div>
            </div>

            {/* Category - highlight suggested L2s */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
                Sub-Category <span className="text-accent-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(CATEGORY_TAXONOMY[categoryL1] || []).map((l2) => {
                  const suggested = isL2Suggested(l2)
                  const isSelected = addingItem.category?.l2 === l2
                  
                  return (
                    <button
                      key={l2}
                      onClick={() => handleL2Select(l2)}
                      className={`
                        px-3 py-2 text-xs font-medium uppercase tracking-wider border rounded-lg transition-all duration-200
                        ${isSelected
                          ? 'bg-accent-500 text-primary-900 border-accent-500'
                          : suggested
                            ? 'bg-accent-500/10 text-accent-400 border-accent-500/50 hover:bg-accent-500/20'
                            : 'bg-transparent text-neutral-400 border-primary-600 hover:border-primary-500'
                        }
                      `}
                    >
                      {suggested && !isSelected && <Sparkles size={10} className="inline mr-1.5" />}
                      {l2}
                    </button>
                  )
                })}
              </div>
            </div>

            <FormalitySlider 
              value={addingItem.formality} 
              onChange={setAddingItemFormality} 
            />
            
            <AestheticsSelector 
              selected={addingItem.aesthetics} 
              onToggle={toggleAddingItemAesthetic} 
            />
            
            {/* Optional Details Toggle */}
            <div className="border-t border-primary-800 pt-4">
              <button
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-200 ${showOptional ? 'rotate-180' : ''}`}
                />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Optional Details
                </span>
                {(addingItem.brand || addingItem.price || addingItem.sourceUrl) && (
                  <span className="ml-2 px-2 py-0.5 bg-accent-500/20 text-accent-500 text-[9px] uppercase rounded-full">
                    {[addingItem.brand, addingItem.price, addingItem.sourceUrl].filter(Boolean).length} added
                  </span>
                )}
              </button>

              {showOptional && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">Brand</label>
                    <div className="relative">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                      <input
                        type="text"
                        value={addingItem.brand}
                        onChange={(e) => setAddingItemBrand(e.target.value)}
                        placeholder="e.g. Nike, Zara"
                        className="w-full pl-10 pr-3 py-2.5 bg-primary-800 border border-primary-700 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">Price</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                      <input
                        type="number"
                        value={addingItem.price}
                        onChange={(e) => setAddingItemPrice(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-10 pr-3 py-2.5 bg-primary-800 border border-primary-700 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">Source URL</label>
                    <div className="relative">
                      <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                      <input
                        type="url"
                        value={addingItem.sourceUrl}
                        onChange={(e) => setAddingItemSourceUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full pl-10 pr-3 py-2.5 bg-primary-800 border border-primary-700 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setCurrentStep('upload')} 
                className="flex items-center gap-2 px-4 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button 
                onClick={() => setCurrentStep('colors')} 
                disabled={!addingItem.category?.l2}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase px-6 py-3 rounded-lg transition-colors"
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: COLORS */}
        {currentStep === 'colors' && addingItem.croppedImage && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Image with color border */}
            <div className="flex justify-center">
              <div
                className="w-40 h-52 bg-primary-800 rounded-lg overflow-hidden transition-all duration-300"
                style={{ border: `3px solid ${addingItem.adjustedColor?.hex || '#333'}` }}
              >
                <img
                  src={addingItem.croppedImage.croppedUrl}
                  alt="Item preview"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <ColorSelector
              detectedColors={addingItem.detectedColors.map(dc => ({ 
                ...dc, 
                is_neutral: dc.isNeutral || dc.name.toLowerCase().includes('gray') || 
                            dc.name.toLowerCase().includes('beige') || 
                            dc.name.toLowerCase().includes('white') || 
                            dc.name.toLowerCase().includes('black') 
              }))}
              selectedColorIndex={addingItem.selectedColorIndex}
              adjustedColor={addingItem.adjustedColor}
              onSelectDetected={selectAddingItemColor}
              onUpdateAdjusted={setAddingItemAdjustedColor}
              onOpenPicker={() => setShowColorPicker(true)}
              isExtracting={isExtracting}
            />
            
            {/* Navigation */}
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setCurrentStep('metadata')} 
                className="flex items-center gap-2 px-4 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              
              <button 
                onClick={() => user ? setShowTryOnModal(true) : setShowAuthModal(true)}
                disabled={!addingItem.adjustedColor}
                className="flex items-center gap-2 px-4 py-3 border border-accent-500 text-accent-500 hover:bg-accent-500 hover:text-primary-900 disabled:opacity-30 text-xs font-bold uppercase rounded-lg transition-colors"
              >
                <Sparkles size={14} /> Try On
              </button>
              
              <button 
                onClick={handleValidateAndAdd} 
                disabled={!addingItem.adjustedColor || isValidating}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase px-6 py-3 rounded-lg transition-colors"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>Validate & Add</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: VALIDATE */}
        {currentStep === 'validate' && itemValidation && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="p-5 rounded-lg bg-primary-800 border border-primary-700">
              <div className="flex items-center gap-4 mb-5">
                {itemValidation.warnings.length === 0 
                  ? <Check className="text-success-500" size={28} />
                  : <AlertTriangle className="text-warning-500" size={28} />
                }
                <div>
                  <h4 className="text-base font-bold text-white uppercase tracking-wider">
                    {itemValidation.warnings.length === 0 ? 'Perfect Match!' : 'Compatibility Check'}
                  </h4>
                  <p className="text-neutral-400 text-xs mt-0.5">
                    How this fits with your {baseItem?.category.l2}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {getStatusBadge('Color', itemValidation.color_status)}
                {getStatusBadge('Formality', itemValidation.formality_status)}
                {getStatusBadge('Aesthetics', itemValidation.aesthetic_status)}
                {getStatusBadge('Pairing', itemValidation.pairing_status)}
              </div>
              
              {itemValidation.warnings.length > 0 && (
                <div className="bg-primary-900/50 p-4 rounded-lg border border-primary-700">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-2">
                    <Info size={12} /> Notes
                  </h5>
                  <ul className="space-y-2">
                    {itemValidation.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                        <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-warning-500 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setCurrentStep('colors')} 
                className="flex items-center gap-2 px-4 py-3 border border-primary-600 text-neutral-400 hover:text-white text-xs font-bold uppercase rounded-lg transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button 
                onClick={handleConfirmAdd} 
                className="flex-1 flex items-center justify-center gap-2 bg-white text-primary-900 hover:bg-neutral-200 text-xs font-bold uppercase px-6 py-3 rounded-lg transition-colors"
              >
                <Check size={14} />
                {itemValidation.warnings.length > 0 ? 'Add Anyway' : 'Add to Outfit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals (overlay on top of panel) */}
      {showCropModal && selectedFile && (
        <CropModal 
          file={selectedFile} 
          onComplete={handleCropComplete} 
          onSkip={() => {
            setAddingItemCroppedImage({ 
              originalFile: selectedFile, 
              croppedBlob: selectedFile, 
              croppedUrl: URL.createObjectURL(selectedFile) 
            })
            setShowCropModal(false)
            setCurrentStep('metadata')
          }}
          onClose={() => setShowCropModal(false)} 
        />
      )}
      
      {showColorPicker && addingItem.adjustedColor && (
        <ColorPickerModal
          initialColor={addingItem.adjustedColor.hex}
          onSelect={handleCustomColor}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {showTryOnModal && addingItem.adjustedColor && addingItem.category && addingItem.croppedImage && session?.access_token && (
        <TryOnModal
          item={{
            color: addingItem.adjustedColor,
            category: addingItem.category,
            formality: addingItem.formality,
            aesthetics: addingItem.aesthetics,
          }}
          itemImageUrl={addingItem.croppedImage.croppedUrl}
          itemImageBlob={addingItem.croppedImage.croppedBlob}
          token={session.access_token}
          onClose={() => setShowTryOnModal(false)}
          onTryOnComplete={(url) => setPendingTryOnUrl(url)}
        />
      )}
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}