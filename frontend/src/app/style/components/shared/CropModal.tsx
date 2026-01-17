'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper from 'react-easy-crop'
import type { Point, Area } from 'react-easy-crop'
import { X, RotateCcw, ZoomIn, ZoomOut, Maximize } from 'lucide-react'

interface CropModalProps {
  file: File
  onComplete: (croppedBlob: Blob) => void
  onSkip: () => void
  onClose: () => void
}

export default function CropModal({ file, onComplete, onSkip, onClose }: CropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load image on mount
  useEffect(() => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = reader.result as string
      setImageSrc(img)
      // Get image dimensions
      const image = new Image()
      image.onload = () => {
        setImageSize({ width: image.width, height: image.height })
      }
      image.src = img
    }
    reader.readAsDataURL(file)
  }, [file])

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels || !imageSrc) return
    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onComplete(croppedBlob)
    } catch (error) {
      console.error('Error cropping image:', error)
      alert('Failed to crop image. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [imageSrc, croppedAreaPixels, onComplete])

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }, [])

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
          ref={containerRef}
          className="relative flex-1 min-h-[450px] bg-black overflow-hidden flex items-center justify-center"
        >
          {imageSrc && (
            <>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={undefined}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid={true}
                gridSize={20}
                minZoom={0.5}
                maxZoom={3}
                restrictPosition={true}
                style={{
                  containerStyle: {
                    backgroundColor: '#000',
                    width: '100%',
                    height: '100%',
                  },
                  cropAreaStyle: {
                    border: '3px solid #d4af37',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8)',
                  },
                  mediaStyle: {
                    maxWidth: '100%',
                    maxHeight: '100%',
                  },
                }}
              />
              {/* Crop Dimensions Display */}
              {croppedAreaPixels && (
                <div className="absolute top-6 right-6 bg-primary-800/90 backdrop-blur-sm px-4 py-3 rounded border border-primary-700 pointer-events-none z-20">
                  <div className="text-xs text-neutral-300 space-y-1">
                    <div><span className="text-accent-500 font-bold">{Math.round(croppedAreaPixels.width)}</span>px × <span className="text-accent-500 font-bold">{Math.round(croppedAreaPixels.height)}</span>px</div>
                    <div className="text-[9px] text-neutral-500">
                      Aspect: {(croppedAreaPixels.width / croppedAreaPixels.height).toFixed(2)}:1
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
    </div>
  )
}

// Helper: Create cropped image blob
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas is empty'))
    }, 'image/jpeg', 0.95)
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })
}