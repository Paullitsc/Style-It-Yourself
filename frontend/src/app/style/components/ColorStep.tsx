'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useStyleStore } from '@/store/styleStore'
import { useAuth } from '@/components/AuthProvider'
import type { Color } from '@/types'
import { extractDominantColors, getDominantColor } from '@/lib/colorExtractor'
import { buildColorFromHex } from '@/lib/colorUtils'
import { getRecommendations } from '@/lib/api'
import { cn } from '@/lib/cn'
import ColorSelector from './shared/ColorSelector'
import ColorPickerModal from './shared/ColorPickerModal'
import TryOnModal from './TryOnModal'
import AuthModal from '@/components/AuthModal'

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

  useEffect(() => {
    if (croppedImage && detectedColors.length === 0) {
      extractColors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      ctx.drawImage(imageEl, sx, sy, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      )
      if (!blob) return

      try {
        const dominant = await getDominantColor(blob)
        if (sessionId !== magnifierSessionRef.current) return
        setAdjustedColor(buildColorFromHex(dominant.hex))
      } catch (error) {
        console.error('Magnifier color sampling failed', error)
      }
    },
    [getImageMetrics, setAdjustedColor],
  )

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
          const nextSample = pendingMagnifierSampleRef.current
          pendingMagnifierSampleRef.current = null
          if (nextSample.sessionId !== magnifierSessionRef.current) continue
          await sampleMagnifierColor(
            nextSample.clientX,
            nextSample.clientY,
            nextSample.sessionId,
          )
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

  const handleMagnifierPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()

      magnifierSessionRef.current += 1
      dragStartMagnifierRef.current =
        lastCommittedMagnifierRef.current ?? magnifierPosition
      dragStartColorRef.current =
        lastCommittedColorRef.current ?? adjustedColor ?? null
      setIsMagnifierDragging(true)

      const movedInside = moveMagnifierToClientPoint(event.clientX, event.clientY)
      if (!movedInside) {
        resetMagnifierToDragStart()
        return
      }

      queueMagnifierSample(event.clientX, event.clientY)
    },
    [
      adjustedColor,
      magnifierPosition,
      moveMagnifierToClientPoint,
      queueMagnifierSample,
      resetMagnifierToDragStart,
    ],
  )

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

  const handleTryOnClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowTryOnModal(true)
  }, [user])

  const handleTryOnComplete = useCallback(
    (resultUrl: string) => {
      if (category?.l1) setTryOnResult(category.l1, resultUrl)
    },
    [category, setTryOnResult],
  )

  const handleBack = useCallback(() => setStep('metadata'), [setStep])

  const handleConfirm = useCallback(async () => {
    if (!adjustedColor || !category) return

    setError(null)
    setLoadingRecommendations(true)
    try {
      const response = await getRecommendations({
        base_color: adjustedColor,
        base_formality: formality,
        base_aesthetics: aesthetics,
        base_category: category,
        filled_categories: [category.l1],
      })
      setRecommendations(response.recommendations)
      setStep('build')
    } catch (error) {
      console.error('Error getting recommendations:', error)
      setError('Failed to get recommendations. Please try again.')
    } finally {
      setLoadingRecommendations(false)
    }
  }, [
    adjustedColor,
    category,
    formality,
    aesthetics,
    setRecommendations,
    setStep,
    setLoadingRecommendations,
    setError,
  ])

  return (
    <div className="py-12 max-md:py-8">
      <section className="text-center mb-10 max-md:mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-4">
          Step 03
        </p>
        <h2 className="m-0 font-display font-normal text-[clamp(48px,6vw,88px)] leading-[0.95] tracking-[-0.02em]">
          Confirm the{' '}
          <em className="italic text-ink-3">color.</em>
        </h2>
        <p className="mt-5 mx-auto max-w-[40ch] font-display italic text-[18px] leading-[1.4] text-ink-2">
          Drag the lens onto the most accurate part of the piece, or pick from
          the detected colors.
        </p>
      </section>

      <div className="grid grid-cols-[320px_1fr] max-md:grid-cols-1 gap-12 max-md:gap-8 max-w-[960px] mx-auto items-start">
        {/* Image preview */}
        <div className="max-md:max-w-[280px] max-md:mx-auto">
          <div
            ref={imageWrapRef}
            className="relative aspect-[4/5] overflow-hidden bg-paper-2 lg:sticky lg:top-28 border-2 transition-colors"
            style={{ borderColor: adjustedColor?.hex || 'var(--color-ink)' }}
          >
            {croppedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageRef}
                src={croppedImage.croppedUrl}
                alt="Your clothing item"
                className="w-full h-full object-contain"
                onLoad={initializeMagnifierPosition}
              />
            )}
            {croppedImage && magnifierPosition && (
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
                  borderColor: adjustedColor?.hex || 'var(--color-ink)',
                }}
              >
                <span
                  className="block w-1 h-1 bg-ink rounded-full"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>

        {/* Color controls */}
        <div>
          <ColorSelector
            detectedColors={detectedColors.map((color) => ({
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

      {error && (
        <div className="max-w-[480px] mx-auto mt-8 border-t border-accent pt-4 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
            {error}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center gap-6 mt-12 max-w-[960px] mx-auto flex-wrap">
        <button
          type="button"
          onClick={handleBack}
          disabled={isLoadingRecommendations}
          className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors disabled:opacity-40"
        >
          ← Back
        </button>

        <div className="flex items-center gap-6 max-md:w-full max-md:justify-between flex-wrap">
          <button
            type="button"
            onClick={handleTryOnClick}
            disabled={isLoadingRecommendations || !adjustedColor || !croppedImage}
            className={cn(
              'inline-flex items-center gap-3 px-[18px] py-[12px]',
              'border border-ink bg-paper text-ink',
              'font-mono text-[11px] uppercase tracking-[0.12em]',
              'transition-colors',
              'hover:bg-ink hover:text-paper',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink',
            )}
          >
            <span>Try it on</span>
            <span aria-hidden="true">↗</span>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!adjustedColor || isLoadingRecommendations}
            className={cn(
              'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
              'border border-ink bg-ink text-paper',
              'font-mono text-[11px] uppercase tracking-[0.12em]',
              'transition-colors',
              'hover:bg-paper hover:text-ink',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
            )}
          >
            <span>
              {isLoadingRecommendations ? 'Finding pieces…' : 'Confirm & continue'}
            </span>
            {!isLoadingRecommendations && (
              <span aria-hidden="true">→</span>
            )}
          </button>
        </div>
      </div>

      {showColorPicker && adjustedColor && (
        <ColorPickerModal
          initialColor={adjustedColor.hex}
          onSelect={(hex) => {
            setAdjustedColor(buildColorFromHex(hex))
            setShowColorPicker(false)
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {showTryOnModal &&
        adjustedColor &&
        category &&
        croppedImage &&
        session?.access_token && (
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

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}
