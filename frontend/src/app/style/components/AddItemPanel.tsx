'use client'

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import { CATEGORY_TAXONOMY } from '@/types'
import type { CategoryRecommendation, RecommendedColor, Color } from '@/types'
import { extractDominantColors, getDominantColor } from '@/lib/colorExtractor'
import { buildColorFromHex } from '@/lib/colorUtils'
import { validateItem } from '@/lib/api'
import { cn } from '@/lib/cn'

import CropModal from './shared/CropModal'
import ColorPickerModal from './shared/ColorPickerModal'
import FormalitySlider from './shared/FormalitySlider'
import AestheticsSelector from './shared/AestheticsSelector'
import ColorSelector from './shared/ColorSelector'
import ImageUploadZone from './shared/ImageUploadZone'
import TryOnModal from './TryOnModal'
import AuthModal from '@/components/AuthModal'

const MAGNIFIER_DIAMETER = 56
const MAGNIFIER_SAMPLE_SIZE = 24

interface AddItemPanelProps {
  categoryL1: string
  recommendation: CategoryRecommendation | null
  onClose: () => void
  suggestedColor?: RecommendedColor | null
}

type PanelStep = 'upload' | 'metadata' | 'colors' | 'validate'

const STEPS: { id: PanelStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'metadata', label: 'Details' },
  { id: 'colors', label: 'Color' },
  { id: 'validate', label: 'Review' },
]

export default function AddItemPanel({
  categoryL1,
  recommendation,
  onClose,
  suggestedColor,
}: AddItemPanelProps) {
  const { user, session } = useAuth()

  const {
    getBaseItem,
    outfitItems,
    addingItem,
    itemValidation,
    setAddingItemCroppedImage,
    setAddingItemCategory,
    setAddingItemFormality,
    toggleAddingItemAesthetic,
    setAddingItemDetectedColors,
    selectAddingItemColor,
    setAddingItemAdjustedColor,
    setItemValidation,
    confirmAddItem,
    setTryOnResult,
    setAddingItemBrand,
    setAddingItemPrice,
    setAddingItemSourceUrl,
    setAddingItemOwnership,
  } = useStyleStore()

  const [currentStep, setCurrentStep] = useState<PanelStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [pendingTryOnUrl, setPendingTryOnUrl] = useState<string | null>(null)

  const [magnifierPosition, setMagnifierPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [isMagnifierDragging, setIsMagnifierDragging] = useState(false)
  const imageWrapRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragStartMagnifierRef = useRef<{ x: number; y: number } | null>(null)
  const dragStartColorRef = useRef<Color | null>(null)
  const lastCommittedMagnifierRef = useRef<{ x: number; y: number } | null>(null)
  const lastCommittedColorRef = useRef<Color | null>(null)
  const magnifierSamplingRef = useRef(false)
  const pendingMagnifierSampleRef = useRef<{
    clientX: number
    clientY: number
    sessionId: number
  } | null>(null)
  const magnifierSessionRef = useRef(0)

  const baseItem = getBaseItem()
  const currentStepIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === currentStep),
    [currentStep],
  )

  useEffect(() => {
    if (recommendation && currentStep === 'metadata') {
      const midFormality = Math.round(
        (recommendation.formality_range.min +
          recommendation.formality_range.max) /
          2,
      )
      setAddingItemFormality(midFormality)
    }
  }, [recommendation, currentStep, setAddingItemFormality])

  useEffect(() => {
    if (suggestedColor && currentStep === 'colors') {
      setAddingItemAdjustedColor(buildColorFromHex(suggestedColor.hex))
    }
  }, [suggestedColor, currentStep, setAddingItemAdjustedColor])

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setShowCropModal(true)
  }, [])

  const handleCropComplete = useCallback(
    (croppedBlob: Blob) => {
      if (!selectedFile) return
      const croppedUrl = URL.createObjectURL(croppedBlob)
      setAddingItemCroppedImage({
        originalFile: selectedFile,
        croppedBlob,
        croppedUrl,
      })
      setShowCropModal(false)
      setCurrentStep('metadata')
    },
    [selectedFile, setAddingItemCroppedImage],
  )

  const handleL2Select = useCallback(
    (l2: string) => setAddingItemCategory(categoryL1, l2),
    [categoryL1, setAddingItemCategory],
  )

  useEffect(() => {
    if (
      currentStep === 'colors' &&
      addingItem.croppedImage &&
      addingItem.detectedColors.length === 0
    ) {
      setIsExtracting(true)
      extractDominantColors(addingItem.croppedImage.croppedBlob, 3)
        .then((detectedColors) => {
          if (recommendation?.colors) {
            const suggestedToAdd = recommendation.colors
              .filter(
                (sc) =>
                  !detectedColors.some(
                    (dc) => dc.hex.toLowerCase() === sc.hex.toLowerCase(),
                  ),
              )
              .slice(0, 2)
              .map((sc) => ({
                hex: sc.hex,
                name: `${sc.name} (suggested)`,
                hsl: buildColorFromHex(sc.hex).hsl,
                isNeutral: sc.harmony_type === 'neutral',
              }))
            setAddingItemDetectedColors([...detectedColors, ...suggestedToAdd])
          } else {
            setAddingItemDetectedColors(detectedColors)
          }
        })
        .catch((err) => console.error('Color extraction failed', err))
        .finally(() => setIsExtracting(false))
    }
  }, [
    currentStep,
    addingItem.croppedImage,
    addingItem.detectedColors.length,
    recommendation,
    setAddingItemDetectedColors,
  ])

  const getImageMetrics = useCallback(() => {
    const imageEl = imageRef.current
    const wrapEl = imageWrapRef.current
    if (!imageEl || !wrapEl) return null

    const wrapRect = wrapEl.getBoundingClientRect()
    if (wrapRect.width === 0 || wrapRect.height === 0) return null
    if (imageEl.naturalWidth === 0 || imageEl.naturalHeight === 0) return null

    const imageRatio = imageEl.naturalWidth / imageEl.naturalHeight
    const wrapRatio = wrapRect.width / wrapRect.height

    const renderedWidth =
      imageRatio > wrapRatio ? wrapRect.width : wrapRect.height * imageRatio
    const renderedHeight =
      imageRatio > wrapRatio ? wrapRect.width / imageRatio : wrapRect.height
    const offsetX = (wrapRect.width - renderedWidth) / 2
    const offsetY = (wrapRect.height - renderedHeight) / 2

    const imageRect = {
      left: wrapRect.left + offsetX,
      top: wrapRect.top + offsetY,
      width: renderedWidth,
      height: renderedHeight,
      right: wrapRect.left + offsetX + renderedWidth,
      bottom: wrapRect.top + offsetY + renderedHeight,
    }
    return { imageEl, imageRect, wrapRect }
  }, [])

  const sampleMagnifierColor = useCallback(
    async (clientX: number, clientY: number, sessionId: number) => {
      const metrics = getImageMetrics()
      if (!metrics) return
      const { imageEl, imageRect } = metrics
      if (!imageEl.complete || imageEl.naturalWidth === 0) return

      const isInside =
        clientX >= imageRect.left &&
        clientX <= imageRect.right &&
        clientY >= imageRect.top &&
        clientY <= imageRect.bottom
      if (!isInside) return

      const scaleX = imageEl.naturalWidth / imageRect.width
      const scaleY = imageEl.naturalHeight / imageRect.height
      const xInImage = (clientX - imageRect.left) * scaleX
      const yInImage = (clientY - imageRect.top) * scaleY

      const sampleSize = MAGNIFIER_SAMPLE_SIZE
      const sx = Math.max(
        0,
        Math.min(imageEl.naturalWidth - sampleSize, xInImage - sampleSize / 2),
      )
      const sy = Math.max(
        0,
        Math.min(imageEl.naturalHeight - sampleSize, yInImage - sampleSize / 2),
      )

      const canvas = document.createElement('canvas')
      canvas.width = sampleSize
      canvas.height = sampleSize
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(
        imageEl,
        sx,
        sy,
        sampleSize,
        sampleSize,
        0,
        0,
        sampleSize,
        sampleSize,
      )

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      )
      if (!blob) return

      try {
        const dominant = await getDominantColor(blob)
        if (sessionId !== magnifierSessionRef.current) return
        setAddingItemAdjustedColor(buildColorFromHex(dominant.hex))
      } catch (error) {
        console.error('Magnifier color sampling failed', error)
      }
    },
    [getImageMetrics, setAddingItemAdjustedColor],
  )

  const initializeMagnifierPosition = useCallback(() => {
    if (!addingItem.croppedImage || magnifierPosition || isMagnifierDragging)
      return
    const metrics = getImageMetrics()
    if (!metrics) return

    const centerX = metrics.imageRect.left + metrics.imageRect.width / 2
    const centerY = metrics.imageRect.top + metrics.imageRect.height / 2
    const centeredPosition = {
      x: centerX - metrics.wrapRect.left,
      y: centerY - metrics.wrapRect.top,
    }
    setMagnifierPosition(centeredPosition)
    lastCommittedMagnifierRef.current = centeredPosition
  }, [
    addingItem.croppedImage,
    magnifierPosition,
    isMagnifierDragging,
    getImageMetrics,
  ])

  const queueMagnifierSample = useCallback(
    (clientX: number, clientY: number) => {
      pendingMagnifierSampleRef.current = {
        clientX,
        clientY,
        sessionId: magnifierSessionRef.current,
      }
      if (magnifierSamplingRef.current) return
      const run = async () => {
        magnifierSamplingRef.current = true
        while (pendingMagnifierSampleRef.current) {
          const next = pendingMagnifierSampleRef.current
          pendingMagnifierSampleRef.current = null
          if (next.sessionId !== magnifierSessionRef.current) continue
          await sampleMagnifierColor(next.clientX, next.clientY, next.sessionId)
        }
        magnifierSamplingRef.current = false
      }
      void run()
    },
    [sampleMagnifierColor],
  )

  const moveMagnifierToClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const metrics = getImageMetrics()
      if (!metrics) return false
      const { imageRect, wrapRect } = metrics
      const isInside =
        clientX >= imageRect.left &&
        clientX <= imageRect.right &&
        clientY >= imageRect.top &&
        clientY <= imageRect.bottom
      if (!isInside) return false

      const clampedX =
        Math.min(imageRect.right, Math.max(imageRect.left, clientX)) -
        wrapRect.left
      const clampedY =
        Math.min(imageRect.bottom, Math.max(imageRect.top, clientY)) -
        wrapRect.top
      setMagnifierPosition({ x: clampedX, y: clampedY })
      return true
    },
    [getImageMetrics],
  )

  const resetMagnifierToDragStart = useCallback(() => {
    magnifierSessionRef.current += 1
    pendingMagnifierSampleRef.current = null
    if (dragStartMagnifierRef.current) {
      setMagnifierPosition(dragStartMagnifierRef.current)
    }
    if (dragStartColorRef.current) {
      setAddingItemAdjustedColor(dragStartColorRef.current)
    }
    dragStartMagnifierRef.current = null
    dragStartColorRef.current = null
    setIsMagnifierDragging(false)
  }, [setAddingItemAdjustedColor])

  const commitMagnifierState = useCallback(() => {
    if (magnifierPosition) lastCommittedMagnifierRef.current = magnifierPosition
    if (addingItem.adjustedColor)
      lastCommittedColorRef.current = addingItem.adjustedColor
    dragStartMagnifierRef.current = null
    dragStartColorRef.current = null
    setIsMagnifierDragging(false)
  }, [addingItem.adjustedColor, magnifierPosition])

  const handleMagnifierPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      magnifierSessionRef.current += 1
      dragStartMagnifierRef.current =
        lastCommittedMagnifierRef.current ?? magnifierPosition
      dragStartColorRef.current =
        lastCommittedColorRef.current ?? addingItem.adjustedColor ?? null
      setIsMagnifierDragging(true)

      const movedInside = moveMagnifierToClientPoint(
        event.clientX,
        event.clientY,
      )
      if (!movedInside) {
        resetMagnifierToDragStart()
        return
      }
      queueMagnifierSample(event.clientX, event.clientY)
    },
    [
      addingItem.adjustedColor,
      magnifierPosition,
      moveMagnifierToClientPoint,
      queueMagnifierSample,
      resetMagnifierToDragStart,
    ],
  )

  useEffect(() => {
    if (!isMagnifierDragging && addingItem.adjustedColor) {
      lastCommittedColorRef.current = addingItem.adjustedColor
    }
  }, [addingItem.adjustedColor, isMagnifierDragging])

  useEffect(() => {
    if (!addingItem.croppedImage) return
    setMagnifierPosition(null)
    lastCommittedMagnifierRef.current = null
    dragStartMagnifierRef.current = null
    magnifierSessionRef.current += 1
  }, [addingItem.croppedImage?.croppedUrl])

  useEffect(() => {
    if (!addingItem.croppedImage) return
    const frame = requestAnimationFrame(() => initializeMagnifierPosition())
    return () => cancelAnimationFrame(frame)
  }, [addingItem.croppedImage, initializeMagnifierPosition])

  useEffect(() => {
    if (!isMagnifierDragging) return
    const handlePointerMove = (event: PointerEvent) => {
      const movedInside = moveMagnifierToClientPoint(
        event.clientX,
        event.clientY,
      )
      if (!movedInside) {
        resetMagnifierToDragStart()
        return
      }
      queueMagnifierSample(event.clientX, event.clientY)
    }
    const handlePointerUp = () => commitMagnifierState()
    const handlePointerCancel = () => resetMagnifierToDragStart()

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
    }
  }, [
    isMagnifierDragging,
    moveMagnifierToClientPoint,
    queueMagnifierSample,
    commitMagnifierState,
    resetMagnifierToDragStart,
  ])

  const handleCustomColor = useCallback(
    (hex: string) => {
      setAddingItemAdjustedColor(buildColorFromHex(hex))
      setShowColorPicker(false)
    },
    [setAddingItemAdjustedColor],
  )

  const handleValidateAndAdd = useCallback(async () => {
    if (
      !baseItem ||
      !addingItem.adjustedColor ||
      !addingItem.category ||
      !addingItem.croppedImage
    )
      return

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
      const currentItems = outfitItems.map((oi) => oi.item)
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
        warnings: ['Validation service unavailable — proceeding with caution.'],
      })
      setCurrentStep('validate')
    } finally {
      setIsValidating(false)
    }
  }, [baseItem, addingItem, outfitItems, setItemValidation])

  const handleConfirmAdd = useCallback(() => {
    if (isAdding) return
    setIsAdding(true)
    if (pendingTryOnUrl) setTryOnResult(categoryL1, pendingTryOnUrl)
    confirmAddItem()
    onClose()
  }, [
    isAdding,
    confirmAddItem,
    onClose,
    pendingTryOnUrl,
    categoryL1,
    setTryOnResult,
  ])

  const isL2Suggested = (l2: string) =>
    recommendation?.suggested_l2.includes(l2) ?? false

  const optionalCount = [
    addingItem.brand,
    addingItem.price,
    addingItem.sourceUrl,
  ].filter(Boolean).length

  return (
    <div className="h-full flex flex-col bg-paper text-ink">
      {/* Header */}
      <div className="shrink-0 px-5 py-5 border-b border-ink">
        <div className="flex items-start justify-between mb-5 gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
              Add a piece
            </p>
            <h2 className="font-display text-[24px] leading-none tracking-[-0.015em]">
              {categoryL1}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 hover:text-ink transition-colors"
            aria-label="Close add panel"
          >
            ✕ Close
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex gap-2">
          {STEPS.map((step, i) => {
            const isComplete = i < currentStepIndex
            const isActive = i === currentStepIndex
            return (
              <div key={step.id} className="flex-1">
                <div
                  className={cn(
                    'h-px transition-colors duration-300',
                    isComplete || isActive ? 'bg-ink' : 'bg-rule-soft',
                  )}
                />
                <span
                  className={cn(
                    'font-mono text-[9px] uppercase tracking-[0.12em] mt-2 block',
                    isActive
                      ? 'text-ink font-bold'
                      : isComplete
                      ? 'text-ink font-normal'
                      : 'text-ink-3 font-normal',
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* STEP 1 — UPLOAD */}
        {currentStep === 'upload' && (
          <div className="flex flex-col gap-6">
            {addingItem.croppedImage ? (
              <div className="flex flex-col items-center gap-6">
                <div className="w-[180px] aspect-[4/5] border border-ink bg-paper-2 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={addingItem.croppedImage.croppedUrl}
                    alt="Uploaded item"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-6 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(addingItem.croppedImage!.originalFile)
                      setShowCropModal(true)
                    }}
                    className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
                  >
                    ↺ Re-crop
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('metadata')}
                    className={cn(
                      'inline-flex items-center justify-between gap-6 px-[18px] py-[12px]',
                      'border border-ink bg-ink text-paper',
                      'font-mono text-[11px] uppercase tracking-[0.12em]',
                      'transition-colors hover:bg-paper hover:text-ink',
                    )}
                  >
                    <span>Next</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            ) : (
              <ImageUploadZone
                onFileSelect={handleFileSelect}
                label={`Drop your ${categoryL1.toLowerCase()}`}
                compact
              />
            )}
          </div>
        )}

        {/* STEP 2 — METADATA */}
        {currentStep === 'metadata' && addingItem.croppedImage && (
          <div className="flex flex-col gap-7">
            <div className="flex justify-center">
              <div className="w-[180px] aspect-[4/5] border border-ink bg-paper-2 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={addingItem.croppedImage.croppedUrl}
                  alt="Item preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Sub-category with suggested markers */}
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  Sub-category <span className="text-accent ml-1">*</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {(CATEGORY_TAXONOMY[categoryL1] || []).map((l2) => {
                  const suggested = isL2Suggested(l2)
                  const isSelected = addingItem.category?.l2 === l2
                  return (
                    <button
                      key={l2}
                      type="button"
                      onClick={() => handleL2Select(l2)}
                      aria-pressed={isSelected}
                      className={cn(
                        'pb-[2px] border-b-2 transition-colors duration-200',
                        'font-mono text-[11px] uppercase tracking-[0.12em]',
                        isSelected
                          ? 'border-ink text-ink font-bold'
                          : suggested
                          ? 'border-transparent text-accent font-normal hover:border-accent'
                          : 'border-transparent text-ink-3 font-normal hover:text-ink hover:border-ink',
                      )}
                    >
                      {suggested && !isSelected && (
                        <span aria-hidden="true" className="mr-1">
                          ✦
                        </span>
                      )}
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

            {/* Ownership */}
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  Ownership
                </label>
              </div>
              <div className="flex gap-6">
                <OwnershipPill
                  active={addingItem.ownership === 'owned'}
                  onClick={() => setAddingItemOwnership('owned')}
                >
                  I own this
                </OwnershipPill>
                <OwnershipPill
                  active={addingItem.ownership === 'wishlist'}
                  onClick={() => setAddingItemOwnership('wishlist')}
                >
                  Wishlist
                </OwnershipPill>
              </div>
            </div>

            {/* Optional details */}
            <div className="border-t border-rule-soft pt-5">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink transition-colors"
                aria-expanded={showOptional}
              >
                <span aria-hidden="true">{showOptional ? '−' : '+'}</span>
                Optional details
                {optionalCount > 0 && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                    {optionalCount} added
                  </span>
                )}
              </button>

              {showOptional && (
                <div className="mt-5 flex flex-col gap-4">
                  <EditorialField label="Brand">
                    <input
                      type="text"
                      value={addingItem.brand}
                      onChange={(e) => setAddingItemBrand(e.target.value)}
                      placeholder="e.g. Uniqlo, A.P.C."
                      className="w-full bg-transparent border-b border-ink py-2 font-display italic text-[16px] text-ink placeholder:text-ink-3 placeholder:not-italic placeholder:font-mono placeholder:text-[12px] placeholder:tracking-[0.04em] focus:outline-none"
                    />
                  </EditorialField>
                  <EditorialField label="Price">
                    <input
                      type="number"
                      value={addingItem.price}
                      onChange={(e) => setAddingItemPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent border-b border-ink py-2 font-display italic text-[16px] text-ink placeholder:text-ink-3 placeholder:not-italic placeholder:font-mono placeholder:text-[12px] placeholder:tracking-[0.04em] focus:outline-none"
                    />
                  </EditorialField>
                  <EditorialField label="Source URL">
                    <input
                      type="url"
                      value={addingItem.sourceUrl}
                      onChange={(e) => setAddingItemSourceUrl(e.target.value)}
                      placeholder="https://…"
                      className="w-full bg-transparent border-b border-ink py-2 font-display italic text-[16px] text-ink placeholder:text-ink-3 placeholder:not-italic placeholder:font-mono placeholder:text-[12px] placeholder:tracking-[0.04em] focus:outline-none"
                    />
                  </EditorialField>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-6 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('colors')}
                disabled={!addingItem.category?.l2}
                className={cn(
                  'inline-flex items-center justify-between gap-6 px-[18px] py-[12px]',
                  'border border-ink bg-ink text-paper',
                  'font-mono text-[11px] uppercase tracking-[0.12em]',
                  'transition-colors hover:bg-paper hover:text-ink',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
                )}
              >
                <span>Next</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — COLOR */}
        {currentStep === 'colors' && addingItem.croppedImage && (
          <div className="flex flex-col gap-7">
            {/* Image with magnifier and color frame */}
            <div className="flex justify-center">
              <div
                ref={imageWrapRef}
                className="relative w-[180px] aspect-[4/5] overflow-hidden bg-paper-2 border-2 transition-colors"
                style={{
                  borderColor:
                    addingItem.adjustedColor?.hex || 'var(--color-ink)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={addingItem.croppedImage.croppedUrl}
                  alt="Item preview"
                  className="w-full h-full object-contain"
                  onLoad={initializeMagnifierPosition}
                />
                {magnifierPosition && (
                  <button
                    type="button"
                    aria-label="Drag to sample color"
                    onPointerDown={handleMagnifierPointerDown}
                    className={cn(
                      'absolute z-10 flex items-center justify-center',
                      'rounded-full border-2 bg-paper/30 backdrop-blur-sm touch-none',
                      isMagnifierDragging ? 'cursor-grabbing' : 'cursor-grab',
                    )}
                    style={{
                      left: magnifierPosition.x,
                      top: magnifierPosition.y,
                      width: MAGNIFIER_DIAMETER,
                      height: MAGNIFIER_DIAMETER,
                      transform: 'translate(-50%, -50%)',
                      borderColor:
                        addingItem.adjustedColor?.hex || 'var(--color-ink)',
                    }}
                  >
                    <span
                      className="block w-2 h-2 rounded-full border border-paper"
                      style={{
                        backgroundColor:
                          addingItem.adjustedColor?.hex ||
                          'var(--color-ink)',
                      }}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            </div>

            <ColorSelector
              detectedColors={addingItem.detectedColors.map((dc) => ({
                ...dc,
                is_neutral:
                  dc.isNeutral ||
                  ['gray', 'beige', 'white', 'black'].some((k) =>
                    dc.name.toLowerCase().includes(k),
                  ),
              }))}
              selectedColorIndex={addingItem.selectedColorIndex}
              adjustedColor={addingItem.adjustedColor}
              onSelectDetected={selectAddingItemColor}
              onUpdateAdjusted={setAddingItemAdjustedColor}
              onOpenPicker={() => setShowColorPicker(true)}
              isExtracting={isExtracting}
            />

            <div className="flex items-center justify-between gap-4 pt-4 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentStep('metadata')}
                className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
              >
                ← Back
              </button>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    user ? setShowTryOnModal(true) : setShowAuthModal(true)
                  }
                  disabled={!addingItem.adjustedColor}
                  className={cn(
                    'inline-flex items-center gap-3 px-[14px] py-[10px]',
                    'border border-ink bg-paper text-ink',
                    'font-mono text-[11px] uppercase tracking-[0.12em]',
                    'transition-colors hover:bg-ink hover:text-paper',
                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink',
                  )}
                >
                  <span>Try on</span>
                  <span aria-hidden="true">↗</span>
                </button>

                <button
                  type="button"
                  onClick={handleValidateAndAdd}
                  disabled={!addingItem.adjustedColor || isValidating}
                  className={cn(
                    'inline-flex items-center justify-between gap-6 px-[18px] py-[12px]',
                    'border border-ink bg-ink text-paper',
                    'font-mono text-[11px] uppercase tracking-[0.12em]',
                    'transition-colors hover:bg-paper hover:text-ink',
                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
                  )}
                >
                  <span>
                    {isValidating ? 'Validating…' : 'Validate & add'}
                  </span>
                  {!isValidating && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — VALIDATE */}
        {currentStep === 'validate' && itemValidation && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2">
                Compatibility
              </p>
              <h3 className="font-display text-[32px] leading-tight tracking-[-0.015em]">
                {itemValidation.warnings.length === 0 ? (
                  <>
                    <em className="italic text-ink-3">Perfect</em> match.
                  </>
                ) : (
                  <>Worth a look.</>
                )}
              </h3>
              <p className="font-display italic text-[16px] text-ink-2 mt-2 max-w-[34ch]">
                How this pairs with your{' '}
                <em className="italic">{baseItem?.category.l2}</em>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatusRow label="Color" status={itemValidation.color_status} />
              <StatusRow
                label="Formality"
                status={itemValidation.formality_status}
              />
              <StatusRow
                label="Aesthetics"
                status={itemValidation.aesthetic_status}
              />
              <StatusRow
                label="Pairing"
                status={itemValidation.pairing_status}
              />
            </div>

            {itemValidation.warnings.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
                  Notes
                </p>
                <ul className="flex flex-col gap-2">
                  {itemValidation.warnings.map((w, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-3 font-display italic text-[15px] leading-[1.4] text-ink-2"
                    >
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent shrink-0"
                        aria-hidden="true"
                      >
                        ※
                      </span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between gap-6 pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep('colors')}
                className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={isAdding}
                className={cn(
                  'inline-flex items-center justify-between gap-6 px-[18px] py-[12px]',
                  'border border-ink bg-ink text-paper',
                  'font-mono text-[11px] uppercase tracking-[0.12em]',
                  'transition-colors hover:bg-paper hover:text-ink',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
                )}
              >
                <span>
                  {itemValidation.warnings.length > 0
                    ? 'Add anyway'
                    : 'Add to outfit'}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showCropModal && selectedFile && (
        <CropModal
          file={selectedFile}
          onComplete={handleCropComplete}
          onSkip={() => {
            setAddingItemCroppedImage({
              originalFile: selectedFile,
              croppedBlob: selectedFile,
              croppedUrl: URL.createObjectURL(selectedFile),
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

      {showTryOnModal &&
        addingItem.adjustedColor &&
        addingItem.category &&
        addingItem.croppedImage &&
        session?.access_token && (
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}

// ============================================================================
// Local sub-components
// ============================================================================

interface OwnershipPillProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function OwnershipPill({ active, onClick, children }: OwnershipPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'pb-[2px] border-b-2 transition-colors duration-200',
        'font-mono text-[11px] uppercase tracking-[0.12em]',
        active
          ? 'border-ink text-ink font-bold'
          : 'border-transparent text-ink-3 font-normal hover:text-ink hover:border-ink',
      )}
    >
      {children}
    </button>
  )
}

interface EditorialFieldProps {
  label: string
  children: React.ReactNode
}

function EditorialField({ label, children }: EditorialFieldProps) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

interface StatusRowProps {
  label: string
  status: string
}

function StatusRow({ label, status }: StatusRowProps) {
  const isOk = status === 'ok' || status === 'cohesive'
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-2 px-3 py-2 border',
        isOk ? 'border-ink' : 'border-accent',
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[10px] uppercase tracking-[0.1em] font-bold',
          isOk ? 'text-ink' : 'text-accent',
        )}
      >
        {status}
      </span>
    </div>
  )
}
