'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { Upload, ArrowRight, ArrowLeft, X, Check, AlertTriangle } from 'lucide-react'
import { CATEGORY_TAXONOMY, FORMALITY_LEVELS, AESTHETIC_TAGS } from '@/types'
import type { CategoryRecommendation } from '@/types'
import { extractDominantColors } from '@/lib/colorExtractor'
import { buildColorFromHex } from '@/lib/colorUtils'
import { validateItem } from '@/lib/api'
import CropModal from './CropModal'
import ColorPickerModal from './ColorPickerModal'

interface AddItemFlowProps {
  categoryL1: string
  recommendation: CategoryRecommendation | null
  onCancel: () => void
}

export default function AddItemFlow({ categoryL1, recommendation, onCancel }: AddItemFlowProps) {
  const {
    getBaseItem,
    outfitItems,
    addingItem,
    addItemStep,
    itemValidation,
    setAddItemStep,
    setAddingItemCroppedImage,
    setAddingItemCategory,
    setAddingItemFormality,
    toggleAddingItemAesthetic,
    setAddingItemDetectedColors,
    selectAddingItemColor,
    setAddingItemAdjustedColor,
    setItemValidation,
    confirmAddItem,
  } = useStyleStore()

  const [showCropModal, setShowCropModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const baseItem = getBaseItem()

  // Get available L2 categories
  const categoryL2Options = CATEGORY_TAXONOMY[categoryL1] || []

  // Check if metadata is valid
  const isMetadataValid = addingItem.category?.l1 && addingItem.category?.l2

  // Check if color is valid
  const isColorValid = addingItem.adjustedColor !== null

  // Handle file selection
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

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  // Handle crop complete
  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(croppedBlob)
    setAddingItemCroppedImage({
      originalFile: selectedFile,
      croppedBlob,
      croppedUrl,
    })
    setShowCropModal(false)
    setAddItemStep('metadata')
  }, [selectedFile, setAddingItemCroppedImage, setAddItemStep])

  // Handle skip crop
  const handleSkipCrop = useCallback(() => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(selectedFile)
    setAddingItemCroppedImage({
      originalFile: selectedFile,
      croppedBlob: selectedFile,
      croppedUrl,
    })
    setShowCropModal(false)
    setAddItemStep('metadata')
  }, [selectedFile, setAddingItemCroppedImage, setAddItemStep])

  // Extract colors when entering color step
  useEffect(() => {
    if (addItemStep === 'colors' && addingItem.croppedImage && addingItem.detectedColors.length === 0) {
      extractDominantColors(addingItem.croppedImage.croppedUrl, 3)
        .then(colors => {
          setAddingItemDetectedColors(colors)
        })
        .catch(err => {
          console.error('Color extraction failed:', err)
        })
    }
  }, [addItemStep, addingItem.croppedImage, addingItem.detectedColors.length, setAddingItemDetectedColors])

  // Handle L2 category selection
  const handleL2Select = useCallback((l2: string) => {
    setAddingItemCategory(categoryL1, l2)
  }, [categoryL1, setAddingItemCategory])

  // Handle proceed to colors
  const handleProceedToColors = useCallback(() => {
    if (isMetadataValid) {
      setAddItemStep('colors')
    }
  }, [isMetadataValid, setAddItemStep])

  // Handle back to metadata
  const handleBackToMetadata = useCallback(() => {
    setAddItemStep('metadata')
  }, [setAddItemStep])

  // Handle validate and add
  const handleValidateAndAdd = useCallback(async () => {
    if (!baseItem || !addingItem.adjustedColor || !addingItem.category) return
    
    setIsValidating(true)
    
    try {
      // Build the new item
      const newItem = {
        image_url: addingItem.croppedImage!.croppedUrl,
        color: addingItem.adjustedColor,
        category: addingItem.category,
        formality: addingItem.formality,
        aesthetics: addingItem.aesthetics,
        ownership: addingItem.ownership,
      }
      
      // Extract just the items from outfitItems (which are OutfitItemWithBlob)
      const currentOutfitItems = outfitItems.map(oi => oi.item)
      
      // Call validate API
      const validation = await validateItem(newItem, baseItem, currentOutfitItems)
      setItemValidation(validation)
      setAddItemStep('validate')
    } catch (error) {
      console.error('Validation failed:', error)
      // Still allow adding even if validation fails
      setItemValidation({
        color_status: 'ok',
        formality_status: 'ok',
        aesthetic_status: 'cohesive',
        pairing_status: 'ok',
        warnings: ['Validation service unavailable'],
      })
      setAddItemStep('validate')
    } finally {
      setIsValidating(false)
    }
  }, [baseItem, addingItem, outfitItems, setItemValidation, setAddItemStep])

  // Handle confirm add
  const handleConfirmAdd = useCallback(() => {
    confirmAddItem()
  }, [confirmAddItem])

  // Render based on current step
  return (
    <div className="bg-primary-800/30 rounded-xl border border-primary-700 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-widest text-white">
            Adding: {categoryL1}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {addItemStep === 'upload' && 'Upload an image'}
            {addItemStep === 'metadata' && 'Describe this item'}
            {addItemStep === 'colors' && 'Confirm the color'}
            {addItemStep === 'validate' && 'Review compatibility'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Recommendations Banner */}
      {recommendation && addItemStep === 'upload' && (
        <div className="mb-6 p-4 bg-primary-900/50 rounded-lg border border-primary-700">
          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Recommended Colors</p>
          <div className="flex flex-wrap gap-2">
            {recommendation.colors.slice(0, 6).map((color, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-primary-800 rounded-full">
                <div 
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs text-neutral-300">{color.name}</span>
              </div>
            ))}
          </div>
          {recommendation.suggested_l2.length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Suggested Styles</p>
              <p className="text-sm text-neutral-300">
                {recommendation.suggested_l2.join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[300px]">
        
        {/* UPLOAD STEP */}
        {addItemStep === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
            className={`
              h-64 rounded-lg border-2 border-dashed cursor-pointer transition-all
              flex flex-col items-center justify-center gap-4
              ${isDragging 
                ? 'border-accent-500 bg-accent-500/10' 
                : 'border-primary-600 bg-primary-800/50 hover:border-primary-500'
              }
            `}
          >
            <Upload size={32} className={isDragging ? 'text-accent-500' : 'text-neutral-500'} />
            <div className="text-center">
              <p className="text-white font-medium">Drop image or click to upload</p>
              <p className="text-neutral-500 text-sm mt-1">PNG, JPG, WEBP • Max 10MB</p>
            </div>
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
        {addItemStep === 'metadata' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Preview */}
            <div className="flex justify-center">
              <div className="w-48 h-60 bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                {addingItem.croppedImage && (
                  <img
                    src={addingItem.croppedImage.croppedUrl}
                    alt="Item preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Sub-Category */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                  Type <span className="text-accent-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {categoryL2Options.map((l2) => (
                    <button
                      key={l2}
                      onClick={() => handleL2Select(l2)}
                      className={`
                        px-3 py-2 text-xs font-medium uppercase tracking-wider
                        border transition-all
                        ${addingItem.category?.l2 === l2
                          ? 'bg-accent-500 text-primary-900 border-accent-500'
                          : 'bg-transparent text-neutral-400 border-primary-600 hover:border-accent-500/50'
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
                <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                  Formality
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={addingItem.formality}
                  onChange={(e) => setAddingItemFormality(Number(e.target.value))}
                  className="w-full h-1.5 bg-primary-700 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-neutral-600 mt-1">
                  {Object.values(FORMALITY_LEVELS).map((label, i) => (
                    <span key={i} className={addingItem.formality === i + 1 ? 'text-white' : ''}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Aesthetics */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-2">
                  Aesthetics <span className="text-neutral-600">(optional, max 3)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AESTHETIC_TAGS.slice(0, 12).map((tag) => {
                    const isSelected = addingItem.aesthetics.includes(tag)
                    const isDisabled = addingItem.aesthetics.length >= 3 && !isSelected
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleAddingItemAesthetic(tag)}
                        disabled={isDisabled}
                        className={`
                          px-2 py-1 text-[10px] font-medium uppercase tracking-wider border transition-all
                          ${isSelected
                            ? 'bg-accent-500/20 text-accent-500 border-accent-500'
                            : isDisabled
                              ? 'text-neutral-700 border-primary-700 cursor-not-allowed'
                              : 'text-neutral-500 border-primary-600 hover:border-neutral-500'
                          }
                        `}
                      >
                        {isSelected && <Check size={8} className="inline mr-1" />}
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={handleProceedToColors}
                disabled={!isMetadataValid}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-900 
                  hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed 
                  text-xs font-bold uppercase tracking-widest transition-all"
              >
                Continue to Color
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* COLORS STEP */}
        {addItemStep === 'colors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Preview */}
            <div className="flex justify-center">
              <div className="w-48 h-60 bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                {addingItem.croppedImage && (
                  <img
                    src={addingItem.croppedImage.croppedUrl}
                    alt="Item preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-6">
              {/* Detected Colors */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
                  Detected Colors
                </label>
                <div className="flex gap-3">
                  {addingItem.detectedColors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => selectAddingItemColor(index)}
                      className={`
                        w-12 h-12 rounded-full border-2 transition-all
                        ${addingItem.selectedColorIndex === index
                          ? 'border-white scale-110'
                          : 'border-transparent hover:border-white/50'
                        }
                      `}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                  <button
                    onClick={() => setShowColorPicker(true)}
                    className="w-12 h-12 rounded-full border-2 border-dashed border-primary-600 
                      hover:border-accent-500 flex items-center justify-center text-neutral-500 hover:text-accent-500"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Current Color */}
              {addingItem.adjustedColor && (
                <div className="p-4 bg-primary-900/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-lg border border-white/20"
                      style={{ backgroundColor: addingItem.adjustedColor.hex }}
                    />
                    <div>
                      <p className="text-white font-medium">{addingItem.adjustedColor.name}</p>
                      <p className="text-neutral-500 text-sm font-mono">{addingItem.adjustedColor.hex}</p>
                      {addingItem.adjustedColor.is_neutral && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-neutral-700 text-neutral-300 text-[10px] uppercase rounded">
                          Neutral
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleBackToMetadata}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                    text-neutral-400 hover:text-white border border-primary-600 hover:border-primary-500
                    text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <button
                  onClick={handleValidateAndAdd}
                  disabled={!isColorValid || isValidating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                    bg-white text-primary-900 hover:bg-neutral-200 
                    disabled:opacity-30 disabled:cursor-not-allowed
                    text-xs font-bold uppercase tracking-widest transition-all"
                >
                  {isValidating ? 'Checking...' : 'Validate & Add'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VALIDATE STEP */}
        {addItemStep === 'validate' && itemValidation && (
          <div className="space-y-6">
            {/* Validation Result Header */}
            {(() => {
              // Determine if compatible based on status fields
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

            {/* Warnings */}
            {itemValidation.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-neutral-500">Warnings</p>
                {itemValidation.warnings.map((warning, i) => (
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
                onClick={() => setAddItemStep('colors')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                  text-neutral-400 hover:text-white border border-primary-600 hover:border-primary-500
                  text-xs font-bold uppercase tracking-widest transition-all"
              >
                <ArrowLeft size={14} />
                Go Back
              </button>
              <button
                onClick={handleConfirmAdd}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
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

      {/* Crop Modal */}
      {showCropModal && selectedFile && (
        <CropModal
          file={selectedFile}
          onComplete={handleCropComplete}
          onSkip={handleSkipCrop}
          onClose={() => { setShowCropModal(false); setSelectedFile(null) }}
        />
      )}

      {/* Color Picker Modal */}
      {showColorPicker && (
        <ColorPickerModal
          initialColor={addingItem.adjustedColor?.hex || '#808080'}
          onSelect={(hex) => {
            const color = buildColorFromHex(hex)
            setAddingItemAdjustedColor(color)
            setShowColorPicker(false)
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  )
}