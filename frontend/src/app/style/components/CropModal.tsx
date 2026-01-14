'use client'

import { useState, useCallback, useEffect } from 'react'
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

  // Load image on mount
  useEffect(() => {
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [file])

  // Handle crop complete
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Create cropped image
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

  // Reset crop
  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  return (
    <div className="fixed inset-0 bg-primary-900/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-primary-900 w-full max-w-3xl mx-4 border border-primary-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-800">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest text-white">
              Crop Image
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Optional — adjust the crop area or skip to use the full image
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative h-[400px] md:h-[500px] bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={undefined} // Freeform crop
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              cropShape="rect"
              showGrid={true}
              // Start with minimal zoom to show full image
              minZoom={0.5}
              maxZoom={3}
              initialCroppedAreaPercentages={{
                x: 5,
                y: 5,
                width: 90,
                height: 90,
              }}
              style={{
                containerStyle: {
                  backgroundColor: '#000',
                },
                cropAreaStyle: {
                  border: '2px solid #d4af37', // Gold accent
                },
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-t border-primary-800">
          {/* Zoom Slider */}
          <div className="flex items-center gap-4 mb-6">
            <ZoomOut size={16} className="text-neutral-500" />
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 bg-primary-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-accent-500
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110
              "
            />
            <ZoomIn size={16} className="text-neutral-500" />
            
            <button
              onClick={handleReset}
              className="ml-4 flex items-center gap-2 px-3 py-1.5 text-neutral-400 hover:text-white text-xs uppercase tracking-wider transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            {/* Skip Button */}
            <button
              onClick={onSkip}
              className="flex items-center gap-2 px-6 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors border border-primary-700 hover:border-primary-600"
            >
              <Maximize size={14} />
              Use Full Image
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="px-8 py-3 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-all"
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

// =============================================================================
// HELPER: Create cropped image blob
// =============================================================================

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to cropped area
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas is empty'))
        }
      },
      'image/jpeg',
      0.95 // Quality
    )
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