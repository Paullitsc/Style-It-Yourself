'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { cn } from '@/lib/cn'

interface CropModalProps {
  file: File
  onComplete: (croppedBlob: Blob) => void
  onSkip: () => void
  onClose: () => void
}

export default function CropModal({
  file,
  onComplete,
  onSkip,
  onClose,
}: CropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }, [file])

  const getDefaultCrop = useCallback(
    (): Crop => ({ unit: '%', x: 10, y: 10, width: 80, height: 60 }),
    [],
  )

  const onImageLoad = useCallback(
    () => setCrop(getDefaultCrop()),
    [getDefaultCrop],
  )

  const handleConfirm = useCallback(async () => {
    if (!completedCrop || !imageRef.current) return
    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(imageRef.current, completedCrop)
      onComplete(croppedBlob)
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [completedCrop, onComplete])

  const handleReset = useCallback(() => {
    setCrop(getDefaultCrop())
    setZoom(1)
    setCompletedCrop(null)
  }, [getDefaultCrop])

  const displayCrop = useCallback(() => {
    if (!completedCrop || !imageRef.current) return null
    const rect = imageRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const scaleX = imageRef.current.naturalWidth / rect.width
    const scaleY = imageRef.current.naturalHeight / rect.height
    return {
      width: Math.round(completedCrop.width * scaleX),
      height: Math.round(completedCrop.height * scaleY),
    }
  }, [completedCrop])
  const displaySize = displayCrop()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
        className="relative z-10 w-full max-w-4xl max-h-[90vh] border border-ink bg-paper flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
              Crop
            </p>
            <h3
              id="crop-title"
              className="font-display text-[24px] leading-none tracking-[-0.015em]"
            >
              Frame the <em className="italic text-ink-3">piece.</em>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 hover:text-ink transition-colors"
            aria-label="Close"
          >
            ✕ Close
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative flex-1 min-h-[420px] bg-paper-2 overflow-hidden flex items-center justify-center">
          {imageSrc && (
            <>
              <div
                className="transition-transform duration-150 ease-out"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                }}
              >
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
                  minWidth={40}
                  minHeight={40}
                  keepSelection={true}
                  ruleOfThirds={true}
                  className="max-h-[420px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    className="max-h-[420px] w-auto max-w-full object-contain select-none"
                  />
                </ReactCrop>
              </div>
              {displaySize && (
                <div className="absolute top-5 right-5 bg-paper border border-ink px-3 py-2 pointer-events-none z-20">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                    {displaySize.width}px ×{' '}
                    <em className="italic text-ink-3 not-italic">
                      {displaySize.height}px
                    </em>
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3 mt-1">
                    Aspect {(displaySize.width / displaySize.height).toFixed(2)}:1
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-5 border-t border-ink">
          {/* Zoom */}
          <div className="flex items-center gap-4 mb-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 shrink-0">
              Zoom
            </span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className={cn(
                'flex-1 h-2 appearance-none cursor-pointer bg-paper-2 border border-ink',
                '[&::-webkit-slider-thumb]:appearance-none',
                '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
                '[&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:border-0',
                '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
                '[&::-moz-range-thumb]:bg-ink [&::-moz-range-thumb]:border-0',
              )}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 w-12 text-right">
              {zoom.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="font-mono text-[10px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink hover:text-ink text-ink-3 transition-colors"
            >
              ↺ Reset
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              type="button"
              onClick={onSkip}
              className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
            >
              Use full image
            </button>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className={cn(
                  'inline-flex items-center justify-between gap-6 px-[18px] py-[12px]',
                  'border border-ink bg-ink text-paper',
                  'font-mono text-[11px] uppercase tracking-[0.12em]',
                  'transition-colors hover:bg-paper hover:text-ink',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
                )}
              >
                <span>{isProcessing ? 'Processing…' : 'Apply crop'}</span>
                {!isProcessing && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ReactCrop visual override — ink selection, ink handles */}
      <style jsx global>{`
        .ReactCrop__crop-selection {
          border: 2px solid var(--color-ink);
          box-shadow: 0 0 0 9999px oklch(0.18 0.01 60 / 0.4);
        }
        .ReactCrop__drag-handle:after {
          width: 10px;
          height: 10px;
          background-color: var(--color-ink);
          border: 1px solid var(--color-paper);
          border-radius: 0;
        }
        .ReactCrop__drag-bar {
          background: var(--color-ink);
          opacity: 0.6;
        }
        .ReactCrop__rule-of-thirds-hz,
        .ReactCrop__rule-of-thirds-vt {
          border-color: var(--color-paper);
          opacity: 0.4;
        }
      `}</style>
    </div>
  )
}

async function getCroppedImg(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
): Promise<Blob> {
  const rect = image.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')

  const scaleX = image.naturalWidth / rect.width
  const scaleY = image.naturalHeight / rect.height

  canvas.width = Math.round(pixelCrop.width * scaleX)
  canvas.height = Math.round(pixelCrop.height * scaleY)

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas is empty'))
      },
      'image/jpeg',
      0.95,
    )
  })
}
