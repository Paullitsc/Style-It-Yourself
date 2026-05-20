import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type SkeletonProps = HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-paper-2', className)}
      style={{
        backgroundImage:
          'repeating-linear-gradient(135deg, var(--color-paper-2) 0 22px, var(--color-paper-3) 22px 24px)',
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

interface CardSkeletonProps {
  count?: number
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border border-ink bg-paper"
          aria-hidden="true"
        >
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="space-y-[var(--space-2)] p-[var(--space-3)]">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </>
  )
}

interface TextSkeletonProps {
  lines?: number
}

export function TextSkeleton({ lines = 3 }: TextSkeletonProps) {
  return (
    <div className="space-y-[var(--space-2)]" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

export default Skeleton
