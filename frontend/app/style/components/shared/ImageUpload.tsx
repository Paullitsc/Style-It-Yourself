'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { Upload } from 'lucide-react'

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
  label = "Drop your image",
  subLabel = "or click to browse",
  compact = false,
  disabled = false,
  previewFile = null,
  onClear
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Create preview URL when previewFile changes
  useEffect(() => {
    if (previewFile) {
      const url = URL.createObjectURL(previewFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [previewFile])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }
    onFileSelect(file)
  }, [onFileSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const containerClasses = compact
    ? `h-64 rounded-lg border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-4`
    : `relative w-full max-w-xl h-96 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-6`

  const activeClasses = isDragging 
    ? 'border-accent-500 bg-accent-500/10 scale-[1.02]' 
    : 'border-primary-600 bg-primary-800/30 hover:border-primary-500 hover:bg-primary-800/50'

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden bg-primary-800 border border-primary-700 flex items-center justify-center">
          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                if (!disabled) {
                  fileInputRef.current?.click()
                }
              }}
              disabled={disabled}
              className="px-4 py-2 bg-white text-primary-900 font-bold text-xs uppercase rounded hover:bg-neutral-200 disabled:opacity-50 transition-all"
            >
              Change
            </button>
            {onClear && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
                disabled={disabled}
                className="px-4 py-2 bg-error-500 text-white font-bold text-xs uppercase rounded hover:bg-error-600 disabled:opacity-50 transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
      onClick={() => !disabled && fileInputRef.current?.click()}
      onDrop={(e) => !disabled && handleDrop(e)}
      onDragOver={(e) => { if (!disabled) { e.preventDefault(); setIsDragging(true) } }}
      onDragLeave={(e) => { if (!disabled) { e.preventDefault(); setIsDragging(false) } }}
      className={`${containerClasses} ${activeClasses} ${disabledClasses}`}
    >
      <div className={`
        rounded-full transition-all duration-300
        ${compact ? '' : 'p-6'}
        ${isDragging ? 'bg-accent-500/20' : compact ? '' : 'bg-primary-800'}
      `}>
        <Upload 
          size={compact ? 32 : 32} 
          className={isDragging ? 'text-accent-500' : 'text-neutral-500'} 
        />
      </div>

      <div className="text-center">
        <h3 className={`
          font-bold uppercase tracking-widest transition-colors
          ${compact ? 'text-base' : 'text-lg mb-2'}
          ${isDragging ? 'text-accent-500' : 'text-white'}
        `}>
          {isDragging ? 'Drop it here!' : label}
        </h3>
        <p className="text-neutral-500 text-sm">
          {compact ? '' : 'or '}<span className={compact ? '' : "text-white underline underline-offset-4"}>{subLabel}</span>
        </p>
      </div>

      <p className="text-neutral-600 text-xs uppercase tracking-wider">
        PNG, JPG, WEBP • Max 10MB
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />
        </div>
      )}
    </div>
  )
}