'use client'

import { useEffect, useState } from 'react'
import { FileUploadInput } from '@/components/ui'

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

  if (previewUrl) {
    return (
      <div className="space-y-4">
        <div
          className={`relative border border-ink bg-paper-2 overflow-hidden ${
            compact ? 'aspect-[4/5] max-w-[260px]' : 'aspect-[4/5] max-w-[420px] mx-auto'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-contain"
          />
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-2 border border-ink bg-paper text-ink hover:bg-ink hover:text-paper transition-colors"
            >
              Change
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <FileUploadInput
      label={label}
      dropLabel={compact ? label : `${label} ${subLabel}`}
      onFileSelect={onFileSelect}
      onClear={onClear}
      selectedFile={previewFile}
      disabled={disabled}
      accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/avif"
      maxSizeMB={10}
      hint="PNG · JPG · WEBP · AVIF · Max 10MB"
    />
  )
}
