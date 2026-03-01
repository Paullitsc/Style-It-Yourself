'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { tryOnSingle, uploadUserPhoto } from '@/lib/api'
import type { ClothingItemBase } from '@/types'
import ImageUploadZone from './shared/ImageUploadZone'
import TryOnResult from './shared/TryOnResult'
import { Button, Card, Modal, StatusBadge } from '@/components/ui'

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
  const [resultUrl, setResultUrl] = useState<string | null>(existingTryOnUrl || null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!userPhotoFile) return
    setStep('generating')
    setError(null)

    try {
      const userPhotoUrl = await uploadUserPhoto(userPhotoFile, token)

      const itemUploadFormData = new FormData()
      itemUploadFormData.append('image', itemImageBlob)

      const itemUploadResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/try-on/upload-photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: itemUploadFormData,
        }
      )

      if (!itemUploadResponse.ok) {
        throw new Error('Failed to upload item image')
      }

      const itemUploadData = await itemUploadResponse.json()
      const itemUploadUrl = itemUploadData.url

      const response = await tryOnSingle(
        {
          user_photo_url: userPhotoUrl,
          item_image_url: itemUploadUrl,
          item,
        },
        token
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
    if (resultUrl) {
      window.open(resultUrl, '_blank')
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={viewOnly ? 'Try-On Result' : 'Virtual Try-On'}
      size="md"
    >
      {step === 'upload' && (
        <div className="space-y-[var(--space-6)]">
          <Card className="p-[var(--space-4)]">
            <div className="flex gap-[var(--space-4)]">
              <img
                src={itemImageUrl}
                alt="Item"
                className="h-20 w-16 rounded-[var(--radius-sm)] bg-primary-900 object-contain"
              />
              <div>
                <p className="text-xs uppercase text-neutral-500">Trying On</p>
                <p className="font-bold text-white">{item.category.l2}</p>
                <div className="mt-[var(--space-2)] flex items-center gap-[var(--space-2)]">
                  <div
                    className="h-3 w-3 rounded-full border border-primary-600"
                    style={{ backgroundColor: item.color.hex }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-neutral-400">{item.color.name}</span>
                  <StatusBadge status="info" size="sm" label={`${item.formality}/5`} />
                </div>
              </div>
            </div>
          </Card>

          <ImageUploadZone
            onFileSelect={setUserPhotoFile}
            label="Upload full body photo"
            compact={true}
            disabled={!!userPhotoFile}
            previewFile={userPhotoFile}
            onClear={() => setUserPhotoFile(null)}
          />

          {userPhotoFile && (
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-primary-700 bg-primary-800 p-[var(--space-3)]">
              <span className="max-w-[220px] truncate text-sm text-white">{userPhotoFile.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setUserPhotoFile(null)}>
                Change
              </Button>
            </div>
          )}

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
            Generate Try-On
          </Button>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-[var(--space-12)] text-center">
          <div className="relative mb-[var(--space-6)] h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary-800" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-accent-500 border-t-transparent" />
            <Sparkles className="absolute inset-0 m-auto animate-pulse text-accent-500" size={24} aria-hidden="true" />
          </div>
          <h4 className="mb-[var(--space-2)] text-lg font-bold text-white">Generating...</h4>
          <p className="max-w-xs text-sm text-neutral-500">
            AI is fitting the {item.category.l2} onto your photo. This usually takes about 10-15 seconds.
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
          retryLabel={viewOnly ? undefined : 'Try Another Photo'}
        />
      )}
    </Modal>
  )
}
