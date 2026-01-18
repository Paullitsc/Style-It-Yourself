'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { tryOnOutfit, uploadUserPhoto, uploadItemImage } from '@/lib/api'
import { useStyleStore } from '@/store/styleStore'
import type { ClothingItemCreate } from '@/types'
import ImageUploadZone from './shared/ImageUploadZone'
import TryOnResult from './shared/TryOnResult'

interface TryOnOutfitModalProps {
  items: Array<{
    item: ClothingItemCreate
    imageBlob: Blob
  }>
  token: string
  onClose: () => void
}

type ModalStep = 'upload' | 'generating' | 'result'

export default function TryOnOutfitModal({ items, token, onClose }: TryOnOutfitModalProps) {
  const { getBaseItem, setTryOnResult } = useStyleStore()
  const [step, setStep] = useState<ModalStep>('upload')
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!userPhotoFile) return
    setStep('generating')
    setError(null)

    try {
      // 1. Upload user photo
      const userPhotoUrl = await uploadUserPhoto(userPhotoFile, token)
      
      // 2. Upload item images and prepare payload
      const itemImages: [string, any][] = await Promise.all(
        items.map(async (i) => {
          let itemImageUrl = i.item.image_url || ''
          
          // If the URL is a blob URL, upload the image blob
          if (itemImageUrl.startsWith('blob:')) {
            itemImageUrl = await uploadItemImage(i.imageBlob, token)
          }
          
          return [
            itemImageUrl,
            {
              color: i.item.color,
              category: i.item.category,
              formality: i.item.formality,
              aesthetics: i.item.aesthetics,
            }
          ] as [string, any]
        })
      )
      
      // 3. Call API
      const response = await tryOnOutfit({
        user_photo_url: userPhotoUrl,
        item_images: itemImages
      }, token)

      // Save to store FIRST, before updating UI
      const baseItem = getBaseItem()
      console.log('Base item in TryOnOutfitModal:', baseItem)
      console.log('Base item category L1:', baseItem?.category?.l1)
      if (baseItem?.category?.l1) {
        console.log('Saving try-on result for category:', baseItem.category.l1, 'URL:', response.generated_image_url)
        setTryOnResult(baseItem.category.l1, response.generated_image_url)
      } else {
        console.warn('No baseItem or category found')
      }

      setResultUrl(response.generated_image_url)
      setProcessingTime(response.processing_time)
      setStep('result')
      
    } catch (err) {
      console.error('Outfit Try-on failed:', err)
      setError('Failed to generate outfit try-on. Please try again.')
      setStep('upload')
    }
  }

  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a')
      link.href = resultUrl
      link.download = `outfit-try-on-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-primary-900 border border-primary-700 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-primary-800">
          <h3 className="text-lg font-bold uppercase tracking-widest text-white">Try On Full Outfit</h3>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="p-4 bg-primary-800 rounded-lg">
                <p className="text-xs uppercase text-neutral-500 mb-2">Outfit Items ({items.length})</p>
                <div className="flex -space-x-2 overflow-hidden">
                  {items.slice(0, 5).map((i, idx) => (
                    <img key={idx} src={i.item.image_url} alt="Item" className="inline-block h-10 w-10 rounded-full ring-2 ring-primary-900 bg-primary-700 object-cover" />
                  ))}
                  {items.length > 5 && (
                    <div className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-primary-900 bg-primary-700 text-xs text-white">+{items.length - 5}</div>
                  )}
                </div>
              </div>

              <ImageUploadZone 
                onFileSelect={setUserPhotoFile} 
                label="Upload full body photo" 
                compact={true}
                previewFile={userPhotoFile}
                onClear={() => setUserPhotoFile(null)}
              />

              {error && <p className="text-error-500 text-sm text-center">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={!userPhotoFile}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-primary-900 hover:bg-neutral-200 disabled:opacity-30 text-xs font-bold uppercase tracking-widest"
              >
                <Sparkles size={16} /> Generate Full Outfit
              </button>
            </div>
          )}

          {step === 'generating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-primary-800 rounded-full" />
                <div className="absolute inset-0 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Generating Outfit...</h4>
              <p className="text-neutral-500 text-sm max-w-xs">We are stitching {items.length} items onto your photo.</p>
            </div>
          )}

          {step === 'result' && resultUrl && (
            <TryOnResult 
              imageUrl={resultUrl}
              processingTime={processingTime || undefined}
              onRetry={() => { setStep('upload'); setUserPhotoFile(null) }}
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>
    </div>
  )
}