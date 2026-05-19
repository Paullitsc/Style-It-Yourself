'use client'

import { cn } from '@/lib/cn'

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
  retryLabel = 'Try another photo',
  onDone,
}: TryOnResultProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Result image */}
      <div className="w-full max-h-[70vh] border border-ink bg-paper-2 overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Try-on result"
          className="w-full h-full object-contain"
        />
      </div>

      {processingTime !== undefined && processingTime > 0 && (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          Generated in {processingTime.toFixed(1)}s
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {retryLabel && (
          <button
            type="button"
            onClick={onRetry}
            className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
          >
            ↺ {retryLabel}
          </button>
        )}

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onDownload}
            className={cn(
              'inline-flex items-center gap-3 px-[18px] py-[12px]',
              'border border-ink bg-paper text-ink',
              'font-mono text-[11px] uppercase tracking-[0.12em]',
              'transition-colors hover:bg-ink hover:text-paper',
            )}
          >
            <span>Download</span>
            <span aria-hidden="true">↓</span>
          </button>

          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className={cn(
                'inline-flex items-center justify-between gap-6 px-[18px] py-[12px]',
                'border border-ink bg-ink text-paper',
                'font-mono text-[11px] uppercase tracking-[0.12em]',
                'transition-colors hover:bg-paper hover:text-ink',
              )}
            >
              <span>Done</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
