'use client'

import { useState, useEffect, useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'

import { ArrowLeft, ArrowRight, Sparkles, Search } from 'lucide-react'

import type { Color } from '@/types'

import { extractDominantColors, getDominantColor } from '@/lib/colorExtractor'
import { buildColorFromHex } from '@/lib/colorUtils'
import { getRecommendations } from '@/lib/api'
import ColorSelector from './shared/ColorSelector'
import ColorPickerModal from './shared/ColorPickerModal'
import TryOnModal from './TryOnModal'
import AuthModal from '@/components/AuthModal'

/* Magnifier sizing constants */
const MAGNIFIER_DIAMETER = 56
const MAGNIFIER_SAMPLE_SIZE = 24

export default function ColorStep() {
  const { user, session } = useAuth()
  
  const {
    croppedImage,
    detectedColors,
    selectedColorIndex,
    adjustedColor,
    category,
    formality,
    aesthetics,
    isLoadingRecommendations,
    error,
    setDetectedColors,
    selectColor,
    setAdjustedColor,
    setRecommendations,
    setLoadingRecommendations,
    setStep,
    setError,
    setTryOnResult,
  } = useStyleStore()

  const [isExtracting, setIsExtracting] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  
  /* Local magnifier state/refs so position can be reverted during OOB. */
  const [magnifierPosition, setMagnifierPosition] = useState<{ x: number; y: number } | null>(null)
  const [isMagnifierDragging, setIsMagnifierDragging] = useState(false)
  const imageWrapRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragStartMagnifierRef = useRef<{ x: number; y: number } | null>(null)
  const dragStartColorRef = useRef<Color | null>(null)
  const lastCommittedMagnifierRef = useRef<{ x: number; y: number } | null>(null)
  const lastCommittedColorRef = useRef<Color | null>(null)
  const magnifierSamplingRef = useRef(false)
  const pendingMagnifierSampleRef = useRef<{ clientX: number; clientY: number; sessionId: number } | null>(null)
  const magnifierSessionRef = useRef(0)

  // Extract colors on mount
  useEffect(() => {
    if (croppedImage && detectedColors.length === 0) {
      extractColors()
    }
  }, [croppedImage])

  const extractColors = async () => {
    if (!croppedImage) return

    setIsExtracting(true)
    try {
      const colors = await extractDominantColors(croppedImage.croppedBlob, 3)
      setDetectedColors(colors)
    } catch (error) {
      console.error('Error extracting colors:', error)
      setError('Failed to extract colors from image')
    } finally {
      setIsExtracting(false)
    }
  }


  const getImageMetrics = useCallback(() => {
    const imageEl = imageRef.current
    const wrapEl = imageWrapRef.current
    if (!imageEl || !wrapEl) return null

    const wrapRect = wrapEl.getBoundingClientRect()
    if (wrapRect.width === 0 || wrapRect.height === 0) return null
    if (imageEl.naturalWidth === 0 || imageEl.naturalHeight === 0) return null

    const imageRatio = imageEl.naturalWidth / imageEl.naturalHeight
    const wrapRatio = wrapRect.width / wrapRect.height

    const renderedWidth = imageRatio > wrapRatio ? wrapRect.width : wrapRect.height * imageRatio
    const renderedHeight = imageRatio > wrapRatio ? wrapRect.width / imageRatio : wrapRect.height
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


  const sampleMagnifierColor = useCallback(async (clientX: number, clientY: number, sessionId: number) => {
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
    const sx = Math.max(0, Math.min(imageEl.naturalWidth - sampleSize, xInImage - sampleSize / 2))
    const sy = Math.max(0, Math.min(imageEl.naturalHeight - sampleSize, yInImage - sampleSize / 2))

    const canvas = document.createElement('canvas')
    canvas.width = sampleSize
    canvas.height = sampleSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(imageEl, sx, sy, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return

    try {
      const dominant = await getDominantColor(blob)
      if (sessionId !== magnifierSessionRef.current) return
      setAdjustedColor(buildColorFromHex(dominant.hex))
    } catch (error) {
      console.error('Magnifier color sampling failed', error)
    }
  }, [getImageMetrics, setAdjustedColor])

  /* Place the magnifier at image center once layout is measurable. */
  const initializeMagnifierPosition = useCallback(() => {
    if (!croppedImage || magnifierPosition || isMagnifierDragging) return

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
  }, [croppedImage, magnifierPosition, isMagnifierDragging, getImageMetrics])

  /* Queue magnifier sampling so only the latest pointer position is processed. */
  const queueMagnifierSample = useCallback((clientX: number, clientY: number) => {
    pendingMagnifierSampleRef.current = { clientX, clientY, sessionId: magnifierSessionRef.current }
    if (magnifierSamplingRef.current) return

    const run = async () => {
      magnifierSamplingRef.current = true
      while (pendingMagnifierSampleRef.current) {
        const nextSample = pendingMagnifierSampleRef.current
        pendingMagnifierSampleRef.current = null
        if (nextSample.sessionId !== magnifierSessionRef.current) {
          continue
        }
        await sampleMagnifierColor(nextSample.clientX, nextSample.clientY, nextSample.sessionId)
      }
      magnifierSamplingRef.current = false
    }

    void run()
  }, [sampleMagnifierColor])

  /* Move the magnifier */
  const moveMagnifierToClientPoint = useCallback((clientX: number, clientY: number) => {
    const metrics = getImageMetrics()
    if (!metrics) return false

    const { imageRect, wrapRect } = metrics
    const isInside =
      clientX >= imageRect.left &&
      clientX <= imageRect.right &&
      clientY >= imageRect.top &&
      clientY <= imageRect.bottom

    if (!isInside) return false

    const clampedX = Math.min(imageRect.right, Math.max(imageRect.left, clientX)) - wrapRect.left
    const clampedY = Math.min(imageRect.bottom, Math.max(imageRect.top, clientY)) - wrapRect.top
    setMagnifierPosition({ x: clampedX, y: clampedY })
    return true
  }, [getImageMetrics])

  /* Reset magnifier state when OOB. */
  const resetMagnifierToDragStart = useCallback(() => {
    magnifierSessionRef.current += 1
    pendingMagnifierSampleRef.current = null

    if (dragStartMagnifierRef.current) {
      setMagnifierPosition(dragStartMagnifierRef.current)
    }
    if (dragStartColorRef.current) {
      setAdjustedColor(dragStartColorRef.current)
    }

    dragStartMagnifierRef.current = null
    dragStartColorRef.current = null
    setIsMagnifierDragging(false)
  }, [setAdjustedColor])

  const commitMagnifierState = useCallback(() => {
    if (magnifierPosition) {
      lastCommittedMagnifierRef.current = magnifierPosition
    }
    if (adjustedColor) {
      lastCommittedColorRef.current = adjustedColor
    }

    dragStartMagnifierRef.current = null
    dragStartColorRef.current = null
    setIsMagnifierDragging(false)
  }, [adjustedColor, magnifierPosition])


  const handleMagnifierPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    magnifierSessionRef.current += 1
    dragStartMagnifierRef.current = lastCommittedMagnifierRef.current ?? magnifierPosition
    dragStartColorRef.current = lastCommittedColorRef.current ?? adjustedColor ?? null
    setIsMagnifierDragging(true)

    const movedInside = moveMagnifierToClientPoint(event.clientX, event.clientY)
    if (!movedInside) {
      resetMagnifierToDragStart()
      return
    }

    queueMagnifierSample(event.clientX, event.clientY)
  }, [adjustedColor, magnifierPosition, moveMagnifierToClientPoint, queueMagnifierSample, resetMagnifierToDragStart])


  useEffect(() => {
    if (!isMagnifierDragging && adjustedColor) {
      lastCommittedColorRef.current = adjustedColor
    }
  }, [adjustedColor, isMagnifierDragging])


  useEffect(() => {
    if (!croppedImage) return
    setMagnifierPosition(null)
    lastCommittedMagnifierRef.current = null
    dragStartMagnifierRef.current = null
    magnifierSessionRef.current += 1
  }, [croppedImage?.croppedUrl])

  useEffect(() => {
    if (!croppedImage) return
    const frame = requestAnimationFrame(() => {
      initializeMagnifierPosition()
    })
    return () => cancelAnimationFrame(frame)
  }, [croppedImage, initializeMagnifierPosition])


  useEffect(() => {
    if (!isMagnifierDragging) return

    const handlePointerMove = (event: PointerEvent) => {
      const movedInside = moveMagnifierToClientPoint(event.clientX, event.clientY)
      if (!movedInside) {
        resetMagnifierToDragStart()
        return
      }
      queueMagnifierSample(event.clientX, event.clientY)
    }

    const handlePointerUp = () => {
      commitMagnifierState()
    }

    const handlePointerCancel = () => {
      resetMagnifierToDragStart()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
    }
  }, [isMagnifierDragging, moveMagnifierToClientPoint, queueMagnifierSample, commitMagnifierState, resetMagnifierToDragStart])

  // Handle Try On Me click
  const handleTryOnClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowTryOnModal(true)
  }, [user])

  // Handle try-on completion - save result to store
  const handleTryOnComplete = useCallback((resultUrl: string) => {
    if (category?.l1) {
      console.log('[ColorStep] Try-on completed, saving result for category:', category.l1)
      setTryOnResult(category.l1, resultUrl)
    }
  }, [category, setTryOnResult])

  // Navigation
  const handleBack = useCallback(() => {
    setStep('metadata')
  }, [setStep])

  const handleConfirm = useCallback(async () => {
    if (!adjustedColor || !category) return

    setError(null)
    setLoadingRecommendations(true)
    
    try {
      // Call API to get recommendations
      const response = await getRecommendations({
        base_color: adjustedColor,
        base_formality: formality,
        base_aesthetics: aesthetics,
        base_category: category,
        filled_categories: [category.l1], // Base item category is already filled
      })
      
      setRecommendations(response.recommendations)
      setStep('build')
    } catch (error) {
      console.error('Error getting recommendations:', error)
      setError('Failed to get recommendations. Please try again.')
    } finally {
      setLoadingRecommendations(false)
    }
  }, [adjustedColor, category, formality, aesthetics, setRecommendations, setStep, setLoadingRecommendations, setError])

  return (
    <div className="py-8">
      {/* Title */}
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white mb-2">
          Confirm Color
        </h2>
        <p className="text-neutral-500 text-sm uppercase tracking-wide">
          Select the dominant color of this item
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start justify-center">
        
        {/* Left: Image Preview with color border */}
        <div className="w-full lg:w-auto flex justify-center lg:sticky lg:top-28">

          <div 
            ref={imageWrapRef}
            className="relative w-64 h-80 rounded-lg overflow-hidden shadow-xl transition-all duration-300"
            style={{
              border: `3px solid ${adjustedColor?.hex || '#333'}`,
              boxShadow: adjustedColor 
                ? `0 0 30px ${adjustedColor.hex}40` 
                : 'none'
            }}
          >
            {croppedImage && (
              <img
                ref={imageRef}
                src={croppedImage.croppedUrl}
                alt="Your clothing item"
                className="w-full h-full object-contain bg-primary-800"

                onLoad={initializeMagnifierPosition}
              />
            )}
            {croppedImage && magnifierPosition && (
              <button
                type="button"
                aria-label="Drag to sample color"
                onPointerDown={handleMagnifierPointerDown}
                className={`absolute z-10 flex items-center justify-center rounded-full border border-white/70 bg-primary-900/70 text-white shadow-lg backdrop-blur-sm touch-none ${
                  isMagnifierDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                style={{
                  left: magnifierPosition.x,
                  top: magnifierPosition.y,
                  width: MAGNIFIER_DIAMETER,
                  height: MAGNIFIER_DIAMETER,
                  transform: 'translate(-50%, -50%)',
                  borderColor: adjustedColor?.hex || '#ffffff',
                }}
              >
                <Search size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Color Controls */}
        <div className="w-full lg:w-[400px]">
          <ColorSelector
            detectedColors={detectedColors.map(color => ({
              hex: color.hex,
              hsl: color.hsl,
              name: color.name,
              is_neutral: color.isNeutral,
            }))}
            selectedColorIndex={selectedColorIndex}
            adjustedColor={adjustedColor}
            onSelectDetected={selectColor}
            onUpdateAdjusted={setAdjustedColor}
            onOpenPicker={() => setShowColorPicker(true)}
            isExtracting={isExtracting}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-md mx-auto mt-6 p-4 bg-error-500/10 border border-error-500/30 rounded-lg">
          <p className="text-sm text-error-400 text-center">{error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-center items-center gap-4 mt-12">
        <button
          onClick={handleBack}
          disabled={isLoadingRecommendations}
          className="flex items-center gap-2 px-6 py-3 text-neutral-400 hover:text-white disabled:opacity-50 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {/* Try On Me Button */}
        <button
          onClick={handleTryOnClick}
          disabled={isLoadingRecommendations || !adjustedColor || !croppedImage}
          className={`
            flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest
            border transition-all duration-200
            ${!isLoadingRecommendations && adjustedColor && croppedImage
              ? 'bg-transparent text-accent-500 border-accent-500 hover:bg-accent-500 hover:text-primary-900' 
              : 'bg-transparent text-neutral-600 border-primary-700 cursor-not-allowed'
            }
          `}
        >
          <Sparkles size={14} />
          Try On Me
        </button>
        
        <button
          onClick={handleConfirm}
          disabled={!adjustedColor || isLoadingRecommendations}
          className="group flex items-center gap-3 px-8 py-3 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-all"
        >
          {isLoadingRecommendations ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Confirm & Continue
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && adjustedColor && (
        <ColorPickerModal
          initialColor={adjustedColor.hex}
          onSelect={(hex) => {
            const color = buildColorFromHex(hex)
            setAdjustedColor(color)
            setShowColorPicker(false)
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {/* Try On Modal */}
      {showTryOnModal && adjustedColor && category && croppedImage && session?.access_token && (
        <TryOnModal
          item={{
            color: adjustedColor,
            category: category,
            formality: formality,
            aesthetics: aesthetics,
          }}
          itemImageUrl={croppedImage.croppedUrl}
          itemImageBlob={croppedImage.croppedBlob}
          token={session.access_token}
          onClose={() => setShowTryOnModal(false)}
          onTryOnComplete={handleTryOnComplete}
        />
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  )
}
