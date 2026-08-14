import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import { Skeleton as SkeletonPrimitive } from '../primitives/skeleton'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <SkeletonPrimitive
      className={cn(className)}
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
