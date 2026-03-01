'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { tryOnOutfit, uploadUserPhoto, uploadItemImage } from '@/lib/api'
import { useStyleStore } from '@/store/styleStore'
import type { ClothingItemCreate, TryOnOutfitRequest } from '@/types'
import ImageUploadZone from './shared/ImageUploadZone'
import TryOnResult from './shared/TryOnResult'
import { Button, Card, Modal } from '@/components/ui'

interface TryOnOutfitModalProps {
  items: Array<{
    item: ClothingItemCreate
    imageBlob: Blob
  }>
  token: string
  onClose: () => void
  onComplete?: (url: string) => void
}

type ModalStep = 'upload' | 'generating' | 'result'

export default function TryOnOutfitModal({ items, token, onClose, onComplete }: TryOnOutfitModalProps) {
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
      const userPhotoUrl = await uploadUserPhoto(userPhotoFile, token)

      const itemImages: TryOnOutfitRequest['item_images'] = await Promise.all(
        items.map(async (entry) => {
          let itemImageUrl = entry.item.image_url || ''

          if (itemImageUrl.startsWith('blob:')) {
            itemImageUrl = await uploadItemImage(entry.imageBlob, token)
          }

          return [
            itemImageUrl,
            {
              color: entry.item.color,
              category: entry.item.category,
              formality: entry.item.formality,
              aesthetics: entry.item.aesthetics,
            },
          ]
        })
      )

      const response = await tryOnOutfit(
        {
          user_photo_url: userPhotoUrl,
          item_images: itemImages,
        },
        token
      )

      if (response.generated_image_url && onComplete) {
        onComplete(response.generated_image_url)
      }

      const baseItem = getBaseItem()
      if (baseItem?.category?.l1 && response.generated_image_url) {
        setTryOnResult(baseItem.category.l1, response.generated_image_url)
      }

      setResultUrl(response.generated_image_url || null)
      setProcessingTime(response.processing_time || null)
      setStep('result')
    } catch (err) {
      console.error('Outfit Try-on failed:', err)
      setError('Failed to generate outfit try-on. Please try again.')
      setStep('upload')
    }
  }

  const handleDownload = () => {
    if (resultUrl) {
      window.open(resultUrl, '_blank')
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Try On Full Outfit" size="md">
      {step === 'upload' && (
        <div className="space-y-[var(--space-6)]">
          <Card className="p-[var(--space-4)]">
            <p className="mb-[var(--space-2)] text-xs uppercase text-neutral-500">Outfit Items ({items.length})</p>
            <div className="flex -space-x-2 overflow-hidden" aria-label={`${items.length} items in outfit`}>
              {items.slice(0, 5).map((entry, index) => (
                entry.item.image_url ? (
                  <img
                    key={index}
                    src={entry.item.image_url}
                    alt={entry.item.category.l2 || 'Outfit item'}
                    className="inline-block h-10 w-10 rounded-full bg-primary-700 object-cover ring-2 ring-primary-900"
                  />
                ) : (
                  <div
                    key={index}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-700 text-[10px] text-white ring-2 ring-primary-900"
                  >
                    {(entry.item.category.l2 || 'Item').slice(0, 1)}
                  </div>
                )
              ))}
              {items.length > 5 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-700 text-xs text-white ring-2 ring-primary-900">
                  +{items.length - 5}
                </div>
              )}
            </div>
          </Card>

          <ImageUploadZone
            onFileSelect={setUserPhotoFile}
            label="Upload full body photo"
            compact={true}
            previewFile={userPhotoFile}
            onClear={() => setUserPhotoFile(null)}
          />

          {error && (
            <p className="text-center text-sm text-error-400" role="alert">
              {error}
            </p>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!userPhotoFile}
            fullWidth
            leftIcon={<Sparkles size={16} aria-hidden="true" />}
          >
            Generate Full Outfit
          </Button>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-[var(--space-12)] text-center">
          <div className="relative mb-[var(--space-6)] h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary-800" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-accent-500 border-t-transparent" />
          </div>
          <h4 className="mb-[var(--space-2)] text-lg font-bold text-white">Generating Outfit...</h4>
          <p className="max-w-xs text-sm text-neutral-500">
            We are stitching {items.length} items onto your photo.
          </p>
        </div>
      )}

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
        />
      )}
    </Modal>
  )
}
