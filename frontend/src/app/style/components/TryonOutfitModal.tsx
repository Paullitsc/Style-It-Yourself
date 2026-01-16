'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, Sparkles, Download, RotateCcw } from 'lucide-react'
import { tryOnOutfit, uploadUserPhoto } from '@/lib/api'
import type { ClothingItemCreate, ClothingItemBase } from '@/types'

interface TryOnOutfitModalProps {
  items: Array<{
    item: ClothingItemCreate
    imageBlob: Blob
  }>
  token: string
  onClose: () => void
}

type ModalStep = 'upload' | 'generating' | 'result'

export default function TryOnOutfitModal({ 
  items,
  token, 
  onClose,
}: TryOnOutfitModalProps) {
  const [step, setStep] = useState<ModalStep>('upload')
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null)
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }
    
    setError(null)
    setUserPhotoFile(file)
    const url = URL.createObjectURL(file)
    setUserPhotoUrl(url)
  }, [])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!userPhotoFile) return
    
    setStep('generating')
    setError(null)
    
    try {
      // Step 1: Upload user photo
      const userPhotoStorageUrl = await uploadUserPhoto(userPhotoFile, token)
      
      // Step 2: Upload all item images and build the request
      const itemImages: Array<[string, ClothingItemBase]> = []
      
      for (const { item, imageBlob } of items) {
        const itemFile = new File([imageBlob], 'item.jpg', { type: 'image/jpeg' })
        const itemUrl = await uploadUserPhoto(itemFile, token)
        
        // Build ClothingItemBase (without image_url, brand, price, etc.)
        const itemBase: ClothingItemBase = {
          color: item.color,
          category: item.category,
          formality: item.formality,
          aesthetics: item.aesthetics,
        }
        
        itemImages.push([itemUrl, itemBase])
      }
      
      // Step 3: Call outfit try-on API
      const response = await tryOnOutfit(
        {
          user_photo_url: userPhotoStorageUrl,
          item_images: itemImages,
        },
        token
      )
      
      setResultUrl(response.generated_image_url)
      setProcessingTime(response.processing_time || null)
      setStep('result')
      
    } catch (err) {
      console.error('Outfit try-on failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate try-on image')
      setStep('upload')
    }
  }, [userPhotoFile, items, token])

  // Handle retry
  const handleRetry = useCallback(() => {
    setResultUrl(null)
    setProcessingTime(null)
    setStep('upload')
  }, [])

  // Handle download
  const handleDownload = useCallback(() => {
    if (!resultUrl) return
    
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = `outfit-tryon-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [resultUrl])

  // Cleanup on close
  const handleClose = useCallback(() => {
    if (userPhotoUrl) {
      URL.revokeObjectURL(userPhotoUrl)
    }
    onClose()
  }, [userPhotoUrl, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-primary-900 border border-primary-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary-800">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-white">
              Try On Outfit
            </h2>
            <p className="text-neutral-500 text-sm mt-1">
              {step === 'upload' && 'Upload a photo to see yourself in this outfit'}
              {step === 'generating' && 'Creating your look...'}
              {step === 'result' && 'Your virtual try-on'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* User Photo Upload */}
                <div>
                  <label className="block text-xs uppercase font-bold tracking-widest text-neutral-500 mb-3">
                    Your Photo
                  </label>
                  {userPhotoUrl ? (
                    <div className="relative aspect-[3/4] bg-primary-800 rounded-lg overflow-hidden border border-primary-700">
                      <img
                        src={userPhotoUrl}
                        alt="Your photo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          URL.revokeObjectURL(userPhotoUrl)
                          setUserPhotoUrl(null)
                          setUserPhotoFile(null)
                        }}
                        className="absolute top-2 right-2 p-2 bg-primary-900/80 rounded-full text-neutral-400 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                      className={`
                        aspect-[3/4] rounded-lg border-2 border-dashed cursor-pointer transition-all
                        flex flex-col items-center justify-center gap-3
                        ${isDragging 
                          ? 'border-accent-500 bg-accent-500/10' 
                          : 'border-primary-600 bg-primary-800/50 hover:border-primary-500'
                        }
                      `}
                    >
                      <Upload size={24} className={isDragging ? 'text-accent-500' : 'text-neutral-500'} />
                      <div className="text-center">
                        <p className="text-sm text-neutral-400">Drop photo here</p>
                        <p className="text-xs text-neutral-600 mt-1">or click to upload</p>
                      </div>
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

                {/* Outfit Preview */}
                <div>
                  <label className="block text-xs uppercase font-bold tracking-widest text-neutral-500 mb-3">
                    Outfit ({items.length} items)
                  </label>
                  <div className="aspect-[3/4] bg-primary-800 rounded-lg border border-primary-700 p-3 overflow-hidden">
                    <div className="grid grid-cols-2 gap-2 h-full">
                      {items.slice(0, 4).map(({ item }, i) => (
                        <div 
                          key={i}
                          className="bg-primary-900 rounded overflow-hidden flex items-center justify-center"
                        >
                          <img
                            src={item.image_url}
                            alt={item.category.l2}
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                      ))}
                      {items.length > 4 && (
                        <div className="bg-primary-900 rounded flex items-center justify-center text-neutral-500 text-sm">
                          +{items.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="p-4 bg-primary-800/50 rounded-lg border border-primary-700">
                <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Tips for best results</p>
                <ul className="text-sm text-neutral-400 space-y-1">
                  <li>• Use a well-lit, front-facing photo</li>
                  <li>• Wear form-fitting clothes in your photo</li>
                  <li>• Stand with arms slightly away from body</li>
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-error-500/10 border border-error-500/30 rounded-lg">
                  <p className="text-sm text-error-400">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!userPhotoUrl}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 
                  bg-accent-500 text-primary-900 hover:bg-accent-400
                  disabled:opacity-50 disabled:cursor-not-allowed
                  text-sm font-bold uppercase tracking-widest transition-all"
              >
                <Sparkles size={18} />
                Generate Outfit Try-On
              </button>
            </div>
          )}

          {/* GENERATING STEP */}
          {step === 'generating' && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent-500/20 flex items-center justify-center">
                <Sparkles size={32} className="text-accent-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
                Creating Your Look
              </h3>
              <p className="text-neutral-500 mb-4">
                Generating try-on with {items.length} items...
              </p>
              <p className="text-neutral-600 text-sm">
                This may take 15-30 seconds
              </p>
              <div className="w-48 h-1 mx-auto mt-6 bg-primary-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent-500"
                  style={{ 
                    animation: 'loading 2s ease-in-out infinite',
                  }}
                />
              </div>
              <style jsx>{`
                @keyframes loading {
                  0% { width: 0%; margin-left: 0%; }
                  50% { width: 100%; margin-left: 0%; }
                  100% { width: 0%; margin-left: 100%; }
                }
              `}</style>
            </div>
          )}

          {/* RESULT STEP */}
          {step === 'result' && resultUrl && (
            <div className="space-y-6">
              {/* Result Image */}
              <div className="aspect-[3/4] max-h-[60vh] bg-primary-800 rounded-lg overflow-hidden border border-primary-700 mx-auto">
                <img
                  src={resultUrl}
                  alt="Outfit try-on result"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Processing time */}
              {processingTime && (
                <p className="text-center text-xs text-neutral-500">
                  Generated in {processingTime.toFixed(1)}s
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3
                    border border-primary-600 text-neutral-400 hover:text-white hover:border-primary-500
                    text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <RotateCcw size={14} />
                  Try Another Photo
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3
                    bg-accent-500 text-primary-900 hover:bg-accent-400
                    text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}