import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-md)] bg-primary-700/80', className)}
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
          className="overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800"
          aria-hidden="true"
        >
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
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
