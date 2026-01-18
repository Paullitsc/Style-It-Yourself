'use client'

import { Download, RotateCcw } from 'lucide-react'

interface TryOnResultProps {
  imageUrl: string
  processingTime?: number
  onRetry: () => void
  onDownload: () => void
  retryLabel?: string
  onDone?: () => void
}

export default function TryOnResult({ 
  imageUrl, 
  processingTime, 
  onRetry, 
  onDownload,
  retryLabel = "Try Another Photo",
  onDone
}: TryOnResultProps) {
  return (
    <div className="space-y-6">
      {/* Result Image */}
      <div className="w-full max-h-[70vh] bg-primary-800 rounded-lg overflow-hidden border border-primary-700 flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Try-on result"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Processing time */}
      {processingTime !== undefined && processingTime > 0 && (
        <p className="text-center text-xs text-neutral-500">
          Generated in {processingTime.toFixed(1)}s
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {retryLabel && (
            <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 px-4 py-3
                border border-primary-600 text-neutral-400 hover:text-white hover:border-primary-500
                text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
            >
            <RotateCcw size={14} />
            {retryLabel}
            </button>
        )}
        <button
            onClick={onDownload}
            className="flex items-center justify-center gap-2 px-4 py-3
            bg-accent-500 text-primary-900 hover:bg-accent-400
            text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
        >
            <Download size={14} />
            Download
        </button>
        {onDone && (
            <button
            onClick={onDone}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3
                bg-white text-primary-900 hover:bg-neutral-200
                text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
            >
            Done
            </button>
        )}
        </div>
    </div>
  )
}