'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import { 
  X, Upload, ArrowRight, ArrowLeft, Check, AlertTriangle, 
  Sparkles, Plus, Copy, RotateCcw 
} from 'lucide-react'
import { CATEGORY_TAXONOMY, FORMALITY_LEVELS, AESTHETIC_TAGS } from '@/types'
import type { CategoryRecommendation } from '@/types'
import { extractDominantColors } from '@/lib/colorExtractor'
import { buildColorFromHex, hslToHex } from '@/lib/colorUtils'
import { validateItem } from '@/lib/api'
import CropModal from './CropModal'
import ColorPickerModal from './ColorPickerModal'
import TryOnModal from './TryOnModal'
import AuthModal from '@/components/AuthModal'

interface AddItemModalProps {
  categoryL1: string
  recommendation: CategoryRecommendation | null
  onCancel: () => void
}

type ModalStep = 'upload' | 'metadata' | 'colors' | 'validate'

export default function AddItemModal({ categoryL1, recommendation, onCancel }: AddItemModalProps) {
  const { user, session } = useAuth()
  
  const {
    getBaseItem,
    outfitItems,
    addingItem,
    setAddingItemCroppedImage,
    setAddingItemCategory,
    setAddingItemFormality,
    toggleAddingItemAesthetic,
    setAddingItemOwnership,
    setAddingItemBrand,
    setAddingItemPrice,
    setAddingItemSourceUrl,
    setAddingItemDetectedColors,
    selectAddingItemColor,
    setAddingItemAdjustedColor,
    setItemValidation,
    confirmAddItem,
    setTryOnResult,
  } = useStyleStore()

  const [currentStep, setCurrentStep] = useState<ModalStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [hexInputValue, setHexInputValue] = useState('')
  const [copied, setCopied] = useState(false)
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [itemValidation, setLocalItemValidation] = useState<any>(null)
  const [pendingTryOnUrl, setPendingTryOnUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const baseItem = getBaseItem()

  // Get available L2 categories
  const categoryL2Options = CATEGORY_TAXONOMY[categoryL1] || []

  // Validation helpers
  const isMetadataValid = addingItem.category?.l1 && addingItem.category?.l2
  const isColorValid = addingItem.adjustedColor !== null

  // Sync hex input with adjusted color
  useEffect(() => {
    if (addingItem.adjustedColor) {
      setHexInputValue(addingItem.adjustedColor.hex)
    }
  }, [addingItem.adjustedColor])

  // Extract colors when entering color step
  useEffect(() => {
    if (currentStep === 'colors' && addingItem.croppedImage && addingItem.detectedColors.length === 0) {
      extractColors()
    }
  }, [currentStep, addingItem.croppedImage])

  // ===========================================================================
  // UPLOAD STEP HANDLERS
  // ===========================================================================

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }
    setSelectedFile(file)
    setShowCropModal(true)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(croppedBlob)
    setAddingItemCroppedImage({
      originalFile: selectedFile,
      croppedBlob,
      croppedUrl,
    })
    setShowCropModal(false)
    setCurrentStep('metadata')
  }, [selectedFile, setAddingItemCroppedImage])

  const handleSkipCrop = useCallback(() => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(selectedFile)
    setAddingItemCroppedImage({
      originalFile: selectedFile,
      croppedBlob: selectedFile,
      croppedUrl,
    })
    setShowCropModal(false)
    setCurrentStep('metadata')
  }, [selectedFile, setAddingItemCroppedImage])

  // ===========================================================================
  // METADATA STEP HANDLERS
  // ===========================================================================

  const handleL2Select = useCallback((l2: string) => {
    setAddingItemCategory(categoryL1, l2)
  }, [categoryL1, setAddingItemCategory])

  const handleMetadataNext = useCallback(() => {
    if (isMetadataValid) {
      setCurrentStep('colors')
    }
  }, [isMetadataValid])

  // ===========================================================================
  // COLOR STEP HANDLERS
  // ===========================================================================

  const extractColors = async () => {
    if (!addingItem.croppedImage) return

    setIsExtracting(true)
    try {
      const colors = await extractDominantColors(addingItem.croppedImage.croppedBlob, 3)
      setAddingItemDetectedColors(colors)
    } catch (error) {
      console.error('Error extracting colors:', error)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleBrightnessChange = useCallback((lightness: number) => {
    if (!addingItem.adjustedColor) return
    const newHex = hslToHex(addingItem.adjustedColor.hsl.h, addingItem.adjustedColor.hsl.s, lightness)
    const newColor = buildColorFromHex(newHex)
    setAddingItemAdjustedColor(newColor)
  }, [addingItem.adjustedColor, setAddingItemAdjustedColor])

  const handleHexChange = useCallback((value: string) => {
    setHexInputValue(value)
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const newColor = buildColorFromHex(value)
      setAddingItemAdjustedColor(newColor)
    }
  }, [setAddingItemAdjustedColor])

  const handleCopyHex = useCallback(() => {
    if (addingItem.adjustedColor) {
      navigator.clipboard.writeText(addingItem.adjustedColor.hex)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [addingItem.adjustedColor])

  const handleCustomColor = useCallback((hex: string) => {
    const newColor = buildColorFromHex(hex)
    setAddingItemAdjustedColor(newColor)
    setShowColorPicker(false)
  }, [setAddingItemAdjustedColor])

  const handleTryOnClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowTryOnModal(true)
  }, [user])

  // Handle try-on completion - save result for later
  const handleTryOnComplete = useCallback((resultUrl: string) => {
    setPendingTryOnUrl(resultUrl)
  }, [])

  // ===========================================================================
  // VALIDATE STEP HANDLERS
  // ===========================================================================

  const handleValidateAndAdd = useCallback(async () => {
    if (!baseItem || !addingItem.adjustedColor || !addingItem.category) return
    
    setIsValidating(true)
    
    try {
      const newItem = {
        image_url: addingItem.croppedImage!.croppedUrl,
        color: addingItem.adjustedColor,
        category: addingItem.category,
        formality: addingItem.formality,
        aesthetics: addingItem.aesthetics,
        ownership: addingItem.ownership,
      }
      
      const currentOutfitItems = outfitItems.map(oi => oi.item)
      const validation = await validateItem(newItem, baseItem, currentOutfitItems)
      
      setLocalItemValidation(validation)
      setItemValidation(validation)
      setCurrentStep('validate')
    } catch (error) {
      console.error('Validation failed:', error)
      setLocalItemValidation({
        color_status: 'ok',
        formality_status: 'ok',
        aesthetic_status: 'cohesive',
        pairing_status: 'ok',
        warnings: ['Validation service unavailable'],
      })
      setCurrentStep('validate')
    } finally {
      setIsValidating(false)
    }
  }, [baseItem, addingItem, outfitItems, setItemValidation])

  const handleConfirmAdd = useCallback(() => {
    // Save try-on result if we have one
    if (pendingTryOnUrl) {
      setTryOnResult(categoryL1, pendingTryOnUrl)
    }
    
    confirmAddItem()
    onCancel() // Close modal after adding
  }, [confirmAddItem, onCancel, pendingTryOnUrl, categoryL1, setTryOnResult])

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================

  const handleBack = useCallback(() => {
    if (currentStep === 'metadata') setCurrentStep('upload')
    else if (currentStep === 'colors') setCurrentStep('metadata')
    else if (currentStep === 'validate') setCurrentStep('colors')
  }, [currentStep])

  // ===========================================================================
  // RENDER
  // ===========================================================================

  const getStepDescription = () => {
    switch (currentStep) {
      case 'upload': return 'Add a photo of your item'
      case 'metadata': return 'Tell us about this piece'
      case 'colors': return 'Select the dominant color'
      case 'validate': return 'Check how it fits with your outfit'
      default: return ''
    }
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onCancel}
        />
        
        {/* Modal Content */}
        <div className="relative bg-primary-900 border border-primary-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-primary-900 border-b border-primary-800 p-6 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">
                  Adding: {categoryL1}
                </h2>
                <p className="text-neutral-500 text-sm mt-1">
                  {getStepDescription()}
                </p>
              </div>
              <button
                onClick={onCancel}
                className="p-2 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Progress */}
            <div className="flex items-center gap-2 mt-6">
              {['upload', 'metadata', 'colors', 'validate'].map((step, index) => (
                <div key={step} className="flex-1 flex items-center gap-2">
                  <div 
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      currentStep === step || ['metadata', 'colors', 'validate'].indexOf(currentStep) > index
                        ? 'bg-accent-500'
                        : 'bg-primary-700'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* UPLOAD STEP */}
            {currentStep === 'upload' && (
              <div className="space-y-6">
                {addingItem.croppedImage ? (
                  // Preview
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-64 h-80 bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                      <img
                        src={addingItem.croppedImage.croppedUrl}
                        alt="Cropped item"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedFile(addingItem.croppedImage!.originalFile)
                          setShowCropModal(true)
                        }}
                        className="px-4 py-2 text-sm font-bold uppercase tracking-widest
                          border border-primary-600 text-neutral-400 hover:text-white hover:border-primary-500"
                      >
                        <RotateCcw size={14} className="inline mr-2" />
                        Re-crop
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-sm font-bold uppercase tracking-widest
                          border border-primary-600 text-neutral-400 hover:text-white hover:border-primary-500"
                      >
                        Change Image
                      </button>
                      <button
                        onClick={() => setCurrentStep('metadata')}
                        className="px-6 py-2 text-sm font-bold uppercase tracking-widest
                          bg-white text-primary-900 hover:bg-neutral-200"
                      >
                        Next
                        <ArrowRight size={14} className="inline ml-2" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Upload zone
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                    className={`
                      h-96 rounded-xl border-2 border-dashed cursor-pointer transition-all
                      flex flex-col items-center justify-center gap-6
                      ${isDragging 
                        ? 'border-accent-500 bg-accent-500/10' 
                        : 'border-primary-600 bg-primary-800/30 hover:border-primary-500'
                      }
                    `}
                  >
                    <div className={`p-6 rounded-full ${isDragging ? 'bg-accent-500/20' : 'bg-primary-800'}`}>
                      <Upload size={32} className={isDragging ? 'text-accent-500' : 'text-neutral-500'} />
                    </div>
                    <div className="text-center">
                      <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDragging ? 'text-accent-500' : 'text-white'}`}>
                        {isDragging ? 'Drop it here!' : 'Drop your image'}
                      </h3>
                      <p className="text-neutral-500 text-sm">
                        or <span className="text-white underline">click to browse</span>
                      </p>
                    </div>
                    <p className="text-neutral-600 text-xs uppercase tracking-wider">
                      PNG, JPG, WEBP • Max 10MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>
            )}

            {/* METADATA STEP */}
            {currentStep === 'metadata' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Image Preview */}
                <div className="flex justify-center">
                  <div className="w-full max-w-sm aspect-[3/4] bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                    {addingItem.croppedImage && (
                      <img
                        src={addingItem.croppedImage.croppedUrl}
                        alt="Item"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Right: Form */}
                <div className="space-y-6">
                  {/* Sub-Category */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
                      Sub-Category <span className="text-accent-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categoryL2Options.map((l2) => (
                        <button
                          key={l2}
                          onClick={() => handleL2Select(l2)}
                          className={`
                            px-4 py-2.5 text-xs font-medium uppercase tracking-wider
                            border transition-all duration-200
                            ${addingItem.category?.l2 === l2
                              ? 'bg-accent-500 text-primary-900 border-accent-500'
                              : 'bg-transparent text-neutral-400 border-primary-600 hover:border-accent-500/50 hover:text-accent-500'
                            }
                          `}
                        >
                          {l2}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formality */}
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
                        value={addingItem.formality}
                        onChange={(e) => setAddingItemFormality(Number(e.target.value))}
                        className="w-full h-1.5 bg-primary-700 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                      <div className="flex justify-between text-[10px] uppercase tracking-wider">
                        {Object.entries(FORMALITY_LEVELS).map(([level, label]) => (
                          <span
                            key={level}
                            className={Number(level) === addingItem.formality ? 'text-white font-bold' : 'text-neutral-600'}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Aesthetics */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-1">
                      Aesthetics
                    </label>
                    <p className="text-[10px] text-neutral-600 mb-3">Select up to 3</p>
                    <div className="flex flex-wrap gap-2">
                      {AESTHETIC_TAGS.map((tag) => {
                        const isSelected = addingItem.aesthetics.includes(tag)
                        const isDisabled = addingItem.aesthetics.length >= 3 && !isSelected
                        
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleAddingItemAesthetic(tag)}
                            disabled={isDisabled}
                            className={`
                              px-3 py-2 text-xs font-medium uppercase tracking-wider border transition-all
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

                  {/* Ownership */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
                      Ownership
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setAddingItemOwnership('owned')}
                        className={`
                          flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest border transition-all
                          ${addingItem.ownership === 'owned'
                            ? 'bg-white text-primary-900 border-white'
                            : 'bg-transparent text-neutral-400 border-primary-600 hover:border-neutral-400'
                          }
                        `}
                      >
                        I Own This
                      </button>
                      <button
                        onClick={() => setAddingItemOwnership('wishlist')}
                        className={`
                          flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest border transition-all
                          ${addingItem.ownership === 'wishlist'
                            ? 'bg-white text-primary-900 border-white'
                            : 'bg-transparent text-neutral-400 border-primary-600 hover:border-neutral-400'
                          }
                        `}
                      >
                        Wishlist
                      </button>
                    </div>
                  </div>

                  {/* Optional Details (collapsible) */}
                  <div>
                    <button
                      onClick={() => setShowOptionalFields(!showOptionalFields)}
                      className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-neutral-500 hover:text-neutral-400 transition-colors"
                    >
                      <Plus size={12} className={`transition-transform ${showOptionalFields ? 'rotate-45' : ''}`} />
                      Optional Details
                    </button>
                    
                    {showOptionalFields && (
                      <div className="mt-3 space-y-3 p-4 bg-primary-800/50 rounded-lg border border-primary-700">
                        {/* Brand */}
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-neutral-500 mb-1">
                            Brand
                          </label>
                          <input
                            type="text"
                            value={addingItem.brand}
                            onChange={(e) => setAddingItemBrand(e.target.value)}
                            placeholder="e.g. Nike, Zara..."
                            className="w-full px-3 py-2 bg-primary-900 border border-primary-700 text-white text-sm
                              placeholder-neutral-600 focus:outline-none focus:border-accent-500"
                          />
                        </div>
                        
                        {/* Price */}
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-neutral-500 mb-1">
                            Price
                          </label>
                          <div className="flex items-center">
                            <span className="px-3 py-2 bg-primary-800 border border-r-0 border-primary-700 text-neutral-500 text-sm">$</span>
                            <input
                              type="number"
                              value={addingItem.price}
                              onChange={(e) => setAddingItemPrice(e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              className="flex-1 px-3 py-2 bg-primary-900 border border-primary-700 text-white text-sm
                                placeholder-neutral-600 focus:outline-none focus:border-accent-500"
                            />
                          </div>
                        </div>
                        
                        {/* Source URL */}
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-neutral-500 mb-1">
                            Source URL
                          </label>
                          <input
                            type="url"
                            value={addingItem.sourceUrl}
                            onChange={(e) => setAddingItemSourceUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-2 bg-primary-900 border border-primary-700 text-white text-sm
                              placeholder-neutral-600 focus:outline-none focus:border-accent-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-4 py-3 text-neutral-400 hover:text-white
                        text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                    <button
                      onClick={handleMetadataNext}
                      disabled={!isMetadataValid}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3
                        bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30
                        text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Next Step
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* COLORS STEP */}
            {currentStep === 'colors' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Image with color border */}
                <div className="flex justify-center">
                  <div 
                    className="w-full max-w-sm aspect-[3/4] rounded-lg overflow-hidden shadow-xl transition-all"
                    style={{
                      border: `3px solid ${addingItem.adjustedColor?.hex || '#333'}`,
                      boxShadow: addingItem.adjustedColor ? `0 0 30px ${addingItem.adjustedColor.hex}40` : 'none'
                    }}
                  >
                    {addingItem.croppedImage && (
                      <img
                        src={addingItem.croppedImage.croppedUrl}
                        alt="Item"
                        className="w-full h-full object-contain bg-primary-800"
                      />
                    )}
                  </div>
                </div>

                {/* Right: Color controls */}
                <div className="space-y-6">
                  {/* Detected Colors */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-4">
                      Detected Colors
                    </label>
                    {isExtracting ? (
                      <div className="flex items-center gap-3 text-neutral-400">
                        <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Analyzing image...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        {addingItem.detectedColors.map((color, index) => (
                          <button
                            key={index}
                            onClick={() => selectAddingItemColor(index)}
                            className="group flex flex-col items-center gap-2"
                          >
                            <div
                              className={`
                                w-16 h-16 rounded-full transition-all duration-200
                                ${addingItem.selectedColorIndex === index 
                                  ? 'ring-2 ring-white ring-offset-2 ring-offset-primary-900 scale-110' 
                                  : 'hover:scale-105'
                                }
                              `}
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className={`
                              text-[10px] uppercase tracking-wider transition-colors
                              ${addingItem.selectedColorIndex === index ? 'text-white' : 'text-neutral-500'}
                            `}>
                              {color.name}
                            </span>
                            {addingItem.selectedColorIndex === index && (
                              <Check size={12} className="text-accent-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-primary-700" />

                  {/* Brightness Adjustment */}
                  {addingItem.adjustedColor && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-4">
                        Adjust Brightness
                      </label>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] uppercase text-neutral-600">Darker</span>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          value={addingItem.adjustedColor.hsl.l}
                          onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                          className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, 
                              ${hslToHex(addingItem.adjustedColor.hsl.h, addingItem.adjustedColor.hsl.s, 5)}, 
                              ${hslToHex(addingItem.adjustedColor.hsl.h, addingItem.adjustedColor.hsl.s, 50)}, 
                              ${hslToHex(addingItem.adjustedColor.hsl.h, addingItem.adjustedColor.hsl.s, 95)}
                            )`
                          }}
                        />
                        <span className="text-[10px] uppercase text-neutral-600">Lighter</span>
                        <button
                          onClick={() => setShowColorPicker(true)}
                          className="w-8 h-8 rounded-full bg-primary-700 hover:bg-primary-600 flex items-center justify-center"
                        >
                          <Plus size={14} className="text-neutral-400" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-primary-700" />

                  {/* Hex Code */}
                  {addingItem.adjustedColor && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
                        Hex Code
                      </label>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded border border-primary-600"
                          style={{ backgroundColor: addingItem.adjustedColor.hex }}
                        />
                        <input
                          type="text"
                          value={hexInputValue}
                          onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
                          maxLength={7}
                          className="flex-1 px-4 py-3 bg-primary-800 border border-primary-700 text-white font-mono text-sm"
                          placeholder="#000000"
                        />
                        <button
                          onClick={handleCopyHex}
                          className="px-4 py-3 bg-primary-800 border border-primary-700 text-neutral-400 hover:text-white"
                        >
                          {copied ? <Check size={16} className="text-success-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                      {addingItem.adjustedColor.is_neutral && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary-800 rounded-full text-[10px] uppercase tracking-wider text-neutral-400 border border-primary-700">
                          <Check size={10} />
                          Neutral Color
                        </div>
                      )}
                    </div>
                  )}

                  {/* Try-on indicator if one was completed */}
                  {pendingTryOnUrl && (
                    <div className="flex items-center gap-2 p-3 bg-accent-500/10 rounded border border-accent-500/30">
                      <Sparkles size={14} className="text-accent-500" />
                      <span className="text-sm text-accent-400">Try-on image saved</span>
                    </div>
                  )}

                  {/* Navigation with Try-On */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-4 py-3 text-neutral-400 hover:text-white
                        text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                    <button
                      onClick={handleTryOnClick}
                      disabled={!isColorValid || !addingItem.croppedImage}
                      className={`
                        flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest border transition-all
                        ${isColorValid && addingItem.croppedImage
                          ? 'bg-transparent text-accent-500 border-accent-500 hover:bg-accent-500 hover:text-primary-900' 
                          : 'bg-transparent text-neutral-600 border-primary-700 cursor-not-allowed'
                        }
                      `}
                    >
                      <Sparkles size={14} />
                      Try On
                    </button>
                    <button
                      onClick={handleValidateAndAdd}
                      disabled={!isColorValid || isValidating}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3
                        bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30
                        text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      {isValidating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          Validate & Add
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VALIDATE STEP */}
            {currentStep === 'validate' && itemValidation && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Validation Result */}
                {(() => {
                  const hasWarnings = itemValidation.warnings.length > 0 ||
                    itemValidation.color_status === 'warning' ||
                    itemValidation.formality_status !== 'ok' ||
                    itemValidation.aesthetic_status === 'warning' ||
                    itemValidation.pairing_status === 'warning'
                  
                  return (
                    <div className={`
                      p-6 rounded-lg border
                      ${!hasWarnings 
                        ? 'bg-success-500/10 border-success-500/30' 
                        : 'bg-warning-500/10 border-warning-500/30'
                      }
                    `}>
                      <div className="flex items-center gap-4">
                        {!hasWarnings ? (
                          <div className="w-12 h-12 rounded-full bg-success-500/20 flex items-center justify-center">
                            <Check size={24} className="text-success-500" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-warning-500/20 flex items-center justify-center">
                            <AlertTriangle size={24} className="text-warning-500" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-lg font-bold text-white">
                            {!hasWarnings ? 'Great Match!' : 'Possible Issues'}
                          </h4>
                          <div className="flex gap-4 mt-1">
                            <span className={`text-xs uppercase ${itemValidation.color_status === 'ok' ? 'text-success-500' : 'text-warning-500'}`}>
                              Color: {itemValidation.color_status}
                            </span>
                            <span className={`text-xs uppercase ${itemValidation.formality_status === 'ok' ? 'text-success-500' : 'text-warning-500'}`}>
                              Formality: {itemValidation.formality_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Preview */}
                <div className="flex justify-center">
                  <div className="w-48 h-60 bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                    {addingItem.croppedImage && (
                      <img
                        src={addingItem.croppedImage.croppedUrl}
                        alt="Item"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Warnings */}
                {itemValidation.warnings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-neutral-500">Warnings</p>
                    {itemValidation.warnings.map((warning: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-warning-500/10 rounded border border-warning-500/20">
                        <AlertTriangle size={14} className="text-warning-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-neutral-300">{warning}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-3 text-neutral-400 hover:text-white
                      border border-primary-600 text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <ArrowLeft size={14} />
                    Go Back
                  </button>
                  <button
                    onClick={handleConfirmAdd}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3
                      bg-white text-primary-900 hover:bg-neutral-200
                      text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <Check size={14} />
                    {itemValidation.warnings.length === 0 ? 'Add to Outfit' : 'Add Anyway'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCropModal && selectedFile && (
        <CropModal
          file={selectedFile}
          onComplete={handleCropComplete}
          onSkip={handleSkipCrop}
          onClose={() => { setShowCropModal(false); setSelectedFile(null) }}
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
          onTryOnComplete={handleTryOnComplete}
        />
      )}

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  )
}