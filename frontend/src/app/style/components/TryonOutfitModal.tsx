'use client'

import { useState, useEffect } from 'react'
import { tryOnOutfit, uploadUserPhoto, uploadItemImage } from '@/lib/api'
import { useStyleStore } from '@/store/styleStore'
import type { ClothingItemCreate, TryOnOutfitRequest } from '@/types'
import ImageUploadZone from './shared/ImageUploadZone'
import TryOnResult from './shared/TryOnResult'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/cn'

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

export default function TryOnOutfitModal({
  items,
  token,
  onClose,
  onComplete,
}: TryOnOutfitModalProps) {
  const { getBaseItem, setTryOnResult } = useStyleStore()
  const [step, setStep] = useState<ModalStep>('upload')
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (step !== 'generating') return
    setElapsed(0)
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [step])

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
        }),
      )

      const response = await tryOnOutfit(
        { user_photo_url: userPhotoUrl, item_images: itemImages },
        token,
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
      console.error('Outfit try-on failed:', err)
      setError('Failed to generate outfit try-on. Please try again.')
      setStep('upload')
    }
  }

  const handleDownload = () => {
    if (resultUrl) window.open(resultUrl, '_blank')
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Try on the outfit" size="md">
      {step === 'upload' && (
        <div className="flex flex-col gap-7">
          {/* Outfit thumbnails */}
          <div className="border border-ink bg-paper-2 px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
              Outfit · {items.length}{' '}
              {items.length === 1 ? 'piece' : 'pieces'}
            </p>
            <div className="flex gap-2 overflow-hidden">
              {items.slice(0, 5).map((entry, index) =>
                entry.item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={index}
                    src={entry.item.image_url}
                    alt={entry.item.category.l2 || 'Outfit item'}
                    className="w-12 aspect-[4/5] border border-ink bg-paper object-cover"
                  />
                ) : (
                  <div
                    key={index}
                    className="w-12 aspect-[4/5] border border-ink bg-paper-3 flex items-center justify-center font-mono text-[10px] uppercase text-ink-3"
                  >
                    {(entry.item.category.l2 || 'Item').slice(0, 1)}
                  </div>
                ),
              )}
              {items.length > 5 && (
                <div className="w-12 aspect-[4/5] border border-ink bg-paper-3 flex items-center justify-center font-mono text-[11px] uppercase text-ink">
                  +{items.length - 5}
                </div>
              )}
            </div>
          </div>

          <ImageUploadZone
            onFileSelect={setUserPhotoFile}
            label="Upload a full-body photo"
            compact
            previewFile={userPhotoFile}
            onClear={() => setUserPhotoFile(null)}
          />

          {error && (
            <p
              role="alert"
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent text-center"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!userPhotoFile}
              className={cn(
                'inline-flex items-center justify-between gap-6 px-[22px] py-[14px]',
                'border border-ink bg-ink text-paper',
                'font-mono text-[11px] uppercase tracking-[0.12em]',
                'transition-colors hover:bg-paper hover:text-ink',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-paper',
              )}
            >
              <span>Generate outfit</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="py-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-4">
            Generating
          </p>
          <h4 className="font-display text-[36px] leading-tight tracking-[-0.015em]">
            <em className="italic text-ink-3">Stitching</em>{' '}
            {items.length} pieces
            <br />
            onto your photo.
          </h4>
          <p className="mt-4 mx-auto max-w-[40ch] font-display italic text-[16px] text-ink-2">
            Hold tight — this is the slow part of the magic.
          </p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
            Elapsed {String(elapsed).padStart(2, '0')}s
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
