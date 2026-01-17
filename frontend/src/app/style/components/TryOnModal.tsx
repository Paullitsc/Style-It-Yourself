'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { tryOnSingle, uploadUserPhoto } from '@/lib/api'
import type { ClothingItemBase } from '@/types'
import ImageUploadZone from './shared/ImageUploadZone'
import TryOnResult from './shared/TryOnResult'

interface TryOnModalProps {
  item: ClothingItemBase
  itemImageUrl: string
  itemImageBlob: Blob
  token: string
  onClose: () => void
  viewOnly?: boolean
  existingTryOnUrl?: string
  onTryOnComplete?: (resultUrl: string) => void
}

type TryOnStep = 'upload' | 'generating' | 'result'

export default function TryOnModal({ 
  item, itemImageUrl, itemImageBlob, token, onClose,
  viewOnly = false, existingTryOnUrl, onTryOnComplete,
}: TryOnModalProps) {
  const [step, setStep] = useState<TryOnStep>(viewOnly ? 'result' : 'upload')
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(existingTryOnUrl || null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!userPhotoFile) return
    setStep('generating')
    setError(null)
    
    try {
      // 1. Upload user photo
      const userPhotoUrl = await uploadUserPhoto(userPhotoFile, token)
      
      // 2. Upload item image blob so backend can access it
      const itemUploadFormData = new FormData()
      itemUploadFormData.append('image', itemImageBlob)
      
      const itemUploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/try-on/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: itemUploadFormData,
      })
      
      if (!itemUploadResponse.ok) {
        throw new Error('Failed to upload item image')
      }
      
      const itemUploadData = await itemUploadResponse.json()
      const itemUploadUrl = itemUploadData.url
      
      // 3. Call Try-On API
      const response = await tryOnSingle({
        user_photo_url: userPhotoUrl,
        item_image_url: itemUploadUrl,
        item: item
      }, token)
      
      setResultUrl(response.generated_image_url)
      setProcessingTime(response.processing_time)
      setStep('result')
      onTryOnComplete?.(response.generated_image_url)
      
    } catch (err) {
      console.error('Try-on failed:', err)
      setError('Failed to generate try-on. Please try again.')
      setStep('upload')
    }
  }

  const handleDownload = () => {
    if (resultUrl) {
        window.open(resultUrl, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-primary-900 border border-primary-700 rounded-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-800">
          <h3 className="text-lg font-bold uppercase tracking-widest text-white">
            {viewOnly ? 'Try-On Result' : 'Virtual Try-On'}
          </h3>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="flex gap-4 p-4 bg-primary-800 rounded-lg">
                <img src={itemImageUrl} alt="Item" className="w-16 h-20 object-contain bg-primary-900 rounded" />
                <div>
                  <p className="text-xs uppercase text-neutral-500">Trying On</p>
                  <p className="text-white font-bold">{item.category.l2}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color.hex }} />
                    <span className="text-xs text-neutral-400">{item.color.name}</span>
                  </div>
                </div>
              </div>

              <ImageUploadZone 
                onFileSelect={setUserPhotoFile}
                label="Upload full body photo"
                compact={true}
                disabled={!!userPhotoFile}
                previewFile={userPhotoFile}
                onClear={() => setUserPhotoFile(null)}
              />
              
              {userPhotoFile && (
                <div className="flex items-center justify-between p-3 bg-primary-800 rounded border border-primary-700">
                  <span className="text-sm text-white truncate max-w-[200px]">{userPhotoFile.name}</span>
                  <button onClick={() => setUserPhotoFile(null)} className="text-xs text-neutral-500 hover:text-white">Change</button>
                </div>
              )}

              {error && <p className="text-error-500 text-sm text-center">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={!userPhotoFile}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-all"
              >
                <Sparkles size={16} /> Generate Try-On
              </button>
            </div>
          )}

          {/* GENERATING STEP */}
          {step === 'generating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-primary-800 rounded-full" />
                <div className="absolute inset-0 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto text-accent-500 animate-pulse" size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Generating...</h4>
              <p className="text-neutral-500 text-sm max-w-xs">
                AI is fitting the {item.category.l2} onto your photo. This usually takes about 10-15 seconds.
              </p>
            </div>
          )}

          {/* RESULT STEP */}
          {step === 'result' && resultUrl && (
            <TryOnResult 
              imageUrl={resultUrl}
              processingTime={processingTime || undefined}
              onRetry={() => {
                setStep('upload')
                setUserPhotoFile(null)
              }}
              onDownload={handleDownload}
              onDone={onClose}
              retryLabel={viewOnly ? undefined : "Try Another Photo"}
            />
          )}
        </div>
      </div>
    </div>
  )
}