'use client'

import { useState } from 'react'
import { tryOnSingle, uploadUserPhoto } from '@/lib/api'
import type { ClothingItemBase } from '@/types'
import ImageUploadZone from './shared/ImageUploadZone'
import TryOnResult from './shared/TryOnResult'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/cn'

interface TryOnModalProps {
  item: ClothingItemBase
  itemImageUrl: string
  itemImageBlob?: Blob
  token: string
  onClose: () => void
  viewOnly?: boolean
  existingTryOnUrl?: string
  onTryOnComplete?: (resultUrl: string) => void
}

type TryOnStep = 'upload' | 'generating' | 'result'

export default function TryOnModal({
  item,
  itemImageUrl,
  itemImageBlob,
  token,
  onClose,
  viewOnly = false,
  existingTryOnUrl,
  onTryOnComplete,
}: TryOnModalProps) {
  const [step, setStep] = useState<TryOnStep>(viewOnly ? 'result' : 'upload')
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(
    existingTryOnUrl || null,
  )
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!userPhotoFile) return
    setStep('generating')
    setError(null)

    try {
      const userPhotoUrl = await uploadUserPhoto(userPhotoFile, token)

      let itemUploadUrl = itemImageUrl
      if (itemImageBlob) {
        const itemUploadFormData = new FormData()
        itemUploadFormData.append('image', itemImageBlob)
        const itemUploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/try-on/upload-photo`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: itemUploadFormData,
          },
        )
        if (!itemUploadResponse.ok) {
          throw new Error('Failed to upload item image')
        }
        const itemUploadData = await itemUploadResponse.json()
        itemUploadUrl = itemUploadData.url
      }

      const response = await tryOnSingle(
        {
          user_photo_url: userPhotoUrl,
          item_image_url: itemUploadUrl,
          item,
        },
        token,
      )

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
    if (resultUrl) window.open(resultUrl, '_blank')
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={viewOnly ? 'Try-on result' : 'Virtual try-on'}
      size="md"
    >
      {step === 'upload' && (
        <div className="flex flex-col gap-7">
          {/* Item summary */}
          <div className="flex gap-4 border border-ink bg-paper-2 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={itemImageUrl}
              alt={item.category.l2}
              className="w-[64px] aspect-[4/5] object-cover border border-ink bg-paper"
            />
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
                Trying on
              </p>
              <p className="font-display text-[20px] leading-none">
                {item.category.l2}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <i
                  className="inline-block w-3 h-3 border border-ink"
                  style={{ backgroundColor: item.color.hex }}
                  aria-hidden="true"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  {item.color.name} · Formality {item.formality}/5
                </span>
              </div>
            </div>
          </div>

          <ImageUploadZone
            onFileSelect={setUserPhotoFile}
            label="Upload a full-body photo"
            compact
            disabled={!!userPhotoFile}
            previewFile={userPhotoFile}
            onClear={() => setUserPhotoFile(null)}
          />

          {userPhotoFile && (
            <div className="flex items-center justify-between border border-ink bg-paper px-4 py-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink truncate max-w-[260px]">
                {userPhotoFile.name}
              </span>
              <button
                type="button"
                onClick={() => setUserPhotoFile(null)}
                className="font-mono text-[10px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink text-ink-3 hover:text-ink transition-colors"
              >
                Change
              </button>
            </div>
          )}

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
              <span>Generate try-on</span>
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
            <em className="italic text-ink-3">Fitting</em> the piece
            <br />
            onto your photo.
          </h4>
          <p className="mt-4 mx-auto max-w-[40ch] font-display italic text-[16px] text-ink-2">
            This usually takes about 10–15 seconds.
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
          retryLabel={viewOnly ? undefined : 'Try another photo'}
        />
      )}
    </Modal>
  )
}
