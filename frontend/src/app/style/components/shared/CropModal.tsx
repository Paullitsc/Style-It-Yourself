'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, RotateCcw, ZoomIn, ZoomOut, Maximize } from 'lucide-react'

interface CropModalProps {
  file: File
  onComplete: (croppedBlob: Blob) => void
  onSkip: () => void
  onClose: () => void
}

export default function CropModal({ file, onComplete, onSkip, onClose }: CropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Load image on mount
  useEffect(() => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = reader.result as string
      setImageSrc(img)
    }
    reader.readAsDataURL(file)
  }, [file])

  const getDefaultCrop = useCallback((): Crop => {
    return { unit: '%', x: 10, y: 10, width: 80, height: 60 }
  }, [])

  const onImageLoad = useCallback(() => {
    setCrop(getDefaultCrop())
  }, [getDefaultCrop])

  const handleConfirm = useCallback(async () => {
    if (!completedCrop || !imageRef.current) return
    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(imageRef.current, completedCrop)
      onComplete(croppedBlob)
    } catch (error) {
      console.error('Error cropping image:', error)
      alert('Failed to crop image. Please try again.')
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
    <div className="fixed inset-0 bg-primary-900/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-primary-900 w-full max-w-4xl border border-primary-700 shadow-2xl animate-in fade-in zoom-in duration-200 rounded-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-800">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest text-white">
              Crop Image
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Drag the edges to adjust your crop area
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Cropper Area with Better Styling */}
        <div 
          className="relative flex-1 min-h-[450px] bg-black overflow-hidden flex items-center justify-center"
        >
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
                  className="max-h-[450px]"
                >
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    className="max-h-[450px] w-auto max-w-full object-contain select-none"
                  />
                </ReactCrop>
              </div>
              {/* Crop Dimensions Display */}
              {displaySize && (
                <div className="absolute top-6 right-6 bg-primary-800/90 backdrop-blur-sm px-4 py-3 rounded border border-primary-700 pointer-events-none z-20">
                  <div className="text-xs text-neutral-300 space-y-1">
                    <div><span className="text-accent-500 font-bold">{displaySize.width}</span>px × <span className="text-accent-500 font-bold">{displaySize.height}</span>px</div>
                    <div className="text-[9px] text-neutral-500">
                      Aspect: {(displaySize.width / displaySize.height).toFixed(2)}:1
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-5 border-t border-primary-800 bg-primary-900/50">
          {/* Zoom Control */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              <ZoomOut size={16} className="text-neutral-500 shrink-0" />
              <div className="flex-1">
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-primary-700 rounded-full appearance-none cursor-pointer accent-accent-500"
                  style={{
                    background: `linear-gradient(to right, #6b5b1a 0%, #d4af37 ${((zoom - 0.5) / 2.5) * 100}%, #6b5b1a ${((zoom - 0.5) / 2.5) * 100}%, #6b5b1a 100%)`,
                  }}
                />
              </div>
              <ZoomIn size={16} className="text-neutral-500 shrink-0" />
              <span className="text-xs text-neutral-500 font-mono w-8">{zoom.toFixed(1)}x</span>
            </div>
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-white border border-primary-600 hover:border-primary-500 text-xs uppercase tracking-wider transition-colors rounded"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3">
            <button
              onClick={onSkip}
              className="flex items-center gap-2 px-5 py-3 text-neutral-400 hover:text-white border border-primary-700 hover:border-primary-600 text-xs font-bold uppercase tracking-widest transition-colors rounded"
            >
              <Maximize size={14} /> Use Full Image
            </button>
            
            <div className="flex gap-3">
              <button 
                onClick={onClose} 
                className="px-6 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-widest border border-primary-700 hover:border-primary-600 transition-colors rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="px-8 py-3 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-50 text-xs font-bold uppercase tracking-widest rounded transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Apply Crop'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .ReactCrop__crop-selection {
          border: 3px solid #d4af37;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8);
        }

        .ReactCrop__drag-handle:after {
          width: 12px;
          height: 12px;
          background-color: #d4af37;
          border: 2px solid #0b0f12;
          border-radius: 2px;
        }

        .ReactCrop__drag-bar {
          background: rgba(212, 175, 55, 0.7);
        }
      `}</style>
    </div>
  )
}

// Helper: Create cropped image blob
async function getCroppedImg(image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> {
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
    canvas.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas is empty'))
    }, 'image/jpeg', 0.95)
  })
}