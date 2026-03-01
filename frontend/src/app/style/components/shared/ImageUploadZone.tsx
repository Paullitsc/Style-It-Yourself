'use client'

import { useEffect, useState } from 'react'
import { Button, FileUploadInput } from '@/components/ui'

interface ImageUploadZoneProps {
  onFileSelect: (file: File) => void
  label?: string
  subLabel?: string
  compact?: boolean
  disabled?: boolean
  previewFile?: File | null
  onClear?: () => void
}

export default function ImageUploadZone({
  onFileSelect,
  label = 'Drop your image',
  subLabel = 'or click to browse',
  compact = false,
  disabled = false,
  previewFile = null,
  onClear,
}: ImageUploadZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (previewFile) {
      const url = URL.createObjectURL(previewFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }

    setPreviewUrl(null)
  }, [previewFile])

  return (
    <div className="space-y-[var(--space-3)]">
      {previewUrl ? (
        <div
          className={`relative overflow-y-auto rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800 scrollbar-hide ${
            compact ? 'max-h-64' : 'max-h-96'
          }`}
        >
          <img src={previewUrl} alt="Preview" className="h-auto w-full" />
          {onClear && (
            <div className="absolute right-[var(--space-3)] top-[var(--space-3)]">
              <Button variant="secondary" size="sm" onClick={onClear}>
                Change
              </Button>
            </div>
          )}
        </div>
      ) : (
        <FileUploadInput
          label={label}
          dropLabel={compact ? label : `${label} ${subLabel}`}
          onFileSelect={onFileSelect}
          onClear={onClear}
          selectedFile={previewFile}
          disabled={disabled}
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          maxSizeMB={10}
          className={compact ? '' : 'max-w-xl'}
          hint="PNG, JPG, WEBP • Max 10MB"
        />
      )}
    </div>
  )
}
