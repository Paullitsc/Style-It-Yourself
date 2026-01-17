'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import {
  X, ArrowRight, Check, AlertTriangle, Sparkles, RotateCcw, Info, ChevronDown, Tag, DollarSign, Link as LinkIcon
} from 'lucide-react'
import { CATEGORY_TAXONOMY } from '@/types'
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

interface AddItemModalProps {
  categoryL1: string
  recommendation: any
  onCancel: () => void
}

type ModalStep = 'upload' | 'metadata' | 'colors' | 'validate'

const STEPS: { id: ModalStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'metadata', label: 'Details' },
  { id: 'colors', label: 'Colors' },
  { id: 'validate', label: 'Review' }
]

export default function AddItemModal({ categoryL1, recommendation, onCancel }: AddItemModalProps) {
  const { user, session } = useAuth()
  
  const {
    getBaseItem, outfitItems, addingItem, itemValidation, // Added itemValidation here for reactivity
    setAddingItemCroppedImage, setAddingItemCategory, setAddingItemFormality,
    toggleAddingItemAesthetic, setAddingItemDetectedColors,
    selectAddingItemColor, setAddingItemAdjustedColor, setItemValidation, confirmAddItem, setTryOnResult,
    setAddingItemBrand, setAddingItemPrice, setAddingItemSourceUrl,
  } = useStyleStore()

  const [currentStep, setCurrentStep] = useState<ModalStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [pendingTryOnUrl, setPendingTryOnUrl] = useState<string | null>(null)
  
  // NOTE: Add-item modal uses palette/picker only; magnifier sampling stays in the base color step.
  
  const baseItem = getBaseItem()
  
  // Calculate current step index for progress bar
  const currentStepIndex = useMemo(() => STEPS.findIndex(s => s.id === currentStep), [currentStep])

  // 1. UPLOAD LOGIC
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

  // 2. COLOR LOGIC
  useEffect(() => {
    // Only run if we are on the color step, have an image, and haven't extracted yet
    if (currentStep === 'colors' && addingItem.croppedImage && addingItem.detectedColors.length === 0) {
      setIsExtracting(true)
      extractDominantColors(addingItem.croppedImage.croppedBlob, 3)
        .then(setAddingItemDetectedColors)
        .catch(err => console.error("Color extraction failed", err))
        .finally(() => setIsExtracting(false))
    }
  }, [currentStep, addingItem.croppedImage, addingItem.detectedColors.length, setAddingItemDetectedColors])

  const handleCustomColor = useCallback((hex: string) => {
    setAddingItemAdjustedColor(buildColorFromHex(hex))
    setShowColorPicker(false)
  }, [setAddingItemAdjustedColor])

  // 3. VALIDATION LOGIC
  const handleValidateAndAdd = useCallback(async () => {
    // Defensive check: Ensure required data exists
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
      // Fallback mock validation if API fails so user isn't stuck
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
    onCancel()
  }, [confirmAddItem, onCancel, pendingTryOnUrl, categoryL1, setTryOnResult])

  // Helper for status badges
  const getStatusBadge = (label: string, status: string) => {
    const styles = {
      ok: 'bg-success-500/10 text-success-500 border-success-500/20',
      cohesive: 'bg-success-500/10 text-success-500 border-success-500/20',
      warning: 'bg-warning-500/10 text-warning-500 border-warning-500/20',
      mismatch: 'bg-error-500/10 text-error-500 border-error-500/20',
    }
    const safeStatus = status as keyof typeof styles
    const style = styles[safeStatus] || styles.warning

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative bg-primary-900 border border-primary-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-primary-900 border-b border-primary-800 p-6 z-10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-white">Adding: {categoryL1}</h2>
            <div className="flex gap-1 mt-3">
               {STEPS.map((step, i) => (
                 <div key={step.id} className="flex flex-col gap-1 w-16">
                   <div className={`h-1 w-full rounded-full transition-colors duration-300 ${
                     i <= currentStepIndex ? 'bg-accent-500' : 'bg-primary-700'
                   }`} />
                   <span className={`text-[9px] uppercase font-bold tracking-wider ${
                     i <= currentStepIndex ? 'text-white' : 'text-neutral-600'
                   }`}>
                     {step.label}
                   </span>
                 </div>
               ))}
            </div>
          </div>
          <button onClick={onCancel} className="p-1"><X size={20} className="text-neutral-500 hover:text-white" /></button>
        </div>

        <div className="p-6">
          {/* STEP 1: UPLOAD */}
          {currentStep === 'upload' && (
             <div className="space-y-6">
               {addingItem.croppedImage ? (
                 <div className="flex flex-col items-center gap-6">
                   <div className="w-64 h-80 bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                     <img src={addingItem.croppedImage.croppedUrl} className="w-full h-full object-contain" />
                   </div>
                   <div className="flex gap-3">
                     <button onClick={() => { setSelectedFile(addingItem.croppedImage!.originalFile); setShowCropModal(true) }} className="px-4 py-2 border border-primary-600 text-neutral-400 hover:text-white text-sm font-bold uppercase">
                       <RotateCcw size={14} className="inline mr-2" /> Re-crop
                     </button>
                     <button onClick={() => setCurrentStep('metadata')} className="px-6 py-2 bg-white text-primary-900 hover:bg-neutral-200 text-sm font-bold uppercase">
                       Next <ArrowRight size={14} className="inline ml-2" />
                     </button>
                   </div>
                 </div>
               ) : (
                 <ImageUploadZone onFileSelect={handleFileSelect} label={`Drop ${categoryL1} image`} />
               )}
             </div>
          )}

          {/* STEP 2: METADATA */}
          {currentStep === 'metadata' && addingItem.croppedImage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex justify-center">
                <div className="w-full max-w-sm aspect-[3/4] bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                  <img src={addingItem.croppedImage.croppedUrl} className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="space-y-6">
                <CategorySelector 
                  l2Options={CATEGORY_TAXONOMY[categoryL1] || []}
                  selectedL2={addingItem.category?.l2}
                  onSelectL2={handleL2Select}
                  hideL1={true}
                />
                <FormalitySlider value={addingItem.formality} onChange={setAddingItemFormality} />
                <AestheticsSelector selected={addingItem.aesthetics} onToggle={toggleAddingItemAesthetic} />
                
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

                  {/* Optional Fields */}
                  {showOptional && (
                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      
                      {/* Brand */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                          Brand
                        </label>
                        <div className="relative">
                          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                          <input
                            type="text"
                            value={addingItem.brand}
                            onChange={(e) => setAddingItemBrand(e.target.value)}
                            placeholder="e.g. Nike, Zara, Uniqlo"
                            className="w-full pl-10 pr-3 py-2 bg-primary-800 border border-primary-700 text-white text-sm
                              placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                          Price
                        </label>
                        <div className="relative">
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                          <input
                            type="number"
                            value={addingItem.price}
                            onChange={(e) => setAddingItemPrice(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full pl-10 pr-3 py-2 bg-primary-800 border border-primary-700 text-white text-sm
                              placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Source URL */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                          Source URL
                        </label>
                        <div className="relative">
                          <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                          <input
                            type="url"
                            value={addingItem.sourceUrl}
                            onChange={(e) => setAddingItemSourceUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full pl-10 pr-3 py-2 bg-primary-800 border border-primary-700 text-white text-sm
                              placeholder-neutral-600 focus:outline-none focus:border-accent-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setCurrentStep('upload')} className="px-4 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase">Back</button>
                  <button onClick={() => setCurrentStep('colors')} disabled={!addingItem.category?.l2} className="flex-1 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 text-xs font-bold uppercase px-6 py-3">Next Step</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COLORS */}
          {currentStep === 'colors' && addingItem.croppedImage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex justify-center">
                {/* Static preview here; AddItemModal relies on palette/picker instead of magnifier sampling. */}
                <div
                  className="relative w-full max-w-sm aspect-[3/4] bg-primary-800 rounded-lg overflow-hidden border border-primary-700"
                  style={{ border: `3px solid ${addingItem.adjustedColor?.hex || '#333'}` }}
                >
                  <img
                    src={addingItem.croppedImage.croppedUrl}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="space-y-6">
                <ColorSelector
                  detectedColors={addingItem.detectedColors.map(dc => ({ ...dc, is_neutral: dc.name.toLowerCase().includes('gray') || dc.name.toLowerCase().includes('beige') || dc.name.toLowerCase().includes('white') || dc.name.toLowerCase().includes('black') }))}
                  selectedColorIndex={addingItem.selectedColorIndex}
                  adjustedColor={addingItem.adjustedColor}
                  onSelectDetected={selectAddingItemColor}
                  onUpdateAdjusted={setAddingItemAdjustedColor}
                  onOpenPicker={() => setShowColorPicker(true)}
                  isExtracting={isExtracting}
                />
                
                <div className="flex gap-3 pt-4">
                   <button onClick={() => setCurrentStep('metadata')} className="px-4 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase">Back</button>
                   
                   <button 
                     onClick={() => user ? setShowTryOnModal(true) : setShowAuthModal(true)}
                     disabled={!addingItem.adjustedColor}
                     className="px-4 py-3 border border-accent-500 text-accent-500 hover:bg-accent-500 hover:text-primary-900 text-xs font-bold uppercase"
                   >
                     <Sparkles size={14} className="inline mr-2" /> Try On
                   </button>
                   
                   <button 
                     onClick={handleValidateAndAdd} 
                     disabled={!addingItem.adjustedColor || isValidating}
                     className="flex-1 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 text-xs font-bold uppercase px-6 py-3"
                   >
                     {isValidating ? 'Validating...' : 'Validate & Add'}
                   </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: VALIDATE */}
          {currentStep === 'validate' && itemValidation && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-6 rounded-lg bg-primary-800 border border-primary-700">
                  <div className="flex items-center gap-4 mb-6">
                    {itemValidation.warnings.length === 0 
                      ? <Check className="text-success-500" size={32} />
                      : <AlertTriangle className="text-warning-500" size={32} />
                    }
                    <div>
                      <h4 className="text-lg font-bold text-white uppercase tracking-wider">
                        {itemValidation.warnings.length === 0 ? 'Perfect Match!' : 'Compatibility Check'}
                      </h4>
                      <p className="text-neutral-400 text-xs mt-1">
                        How this item fits with your base {baseItem?.category.l2}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Status Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {getStatusBadge('Color Harmony', itemValidation.color_status)}
                    {getStatusBadge('Formality', itemValidation.formality_status)}
                    {getStatusBadge('Aesthetics', itemValidation.aesthetic_status)}
                    {getStatusBadge('Pairing', itemValidation.pairing_status)}
                  </div>
                  
                  {/* Warnings List */}
                  {itemValidation.warnings.length > 0 && (
                    <div className="bg-primary-900/50 p-4 rounded border border-primary-700">
                       <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-2">
                         <Info size={12} /> Suggestions
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
               
               <div className="flex gap-3 pt-4">
                 <button onClick={() => setCurrentStep('colors')} className="px-4 py-3 border border-primary-600 text-neutral-400 hover:text-white text-xs font-bold uppercase">Back</button>
                 <button onClick={handleConfirmAdd} className="flex-1 bg-white text-primary-900 hover:bg-neutral-200 text-xs font-bold uppercase px-6 py-3">
                   {itemValidation.warnings.length > 0 ? 'Add Anyway' : 'Add to Outfit'}
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCropModal && selectedFile && (
        <CropModal 
          file={selectedFile} 
          onComplete={handleCropComplete} 
          onSkip={() => {
            setAddingItemCroppedImage({ originalFile: selectedFile, croppedBlob: selectedFile, croppedUrl: URL.createObjectURL(selectedFile) });
            setShowCropModal(false);
            setCurrentStep('metadata');
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
