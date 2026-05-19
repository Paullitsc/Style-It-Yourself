import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border border-ink bg-paper',
        interactive && 'transition-colors hover:bg-paper-2',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-ink p-[var(--space-4)]', className)} {...props} />
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[var(--space-4)]', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-ink p-[var(--space-4)]', className)} {...props} />
}

const FORMALITY_LABELS: Record<number, string> = {
  1: 'Casual',
  2: 'Smart Casual',
  3: 'Business Casual',
  4: 'Formal',
  5: 'Black Tie',
}

interface ItemCardProps {
  title: string
  subtitle?: string
  imageUrl?: string | null
  imageAlt: string
  colorHex?: string
  colorName?: string
  formality?: number
  aesthetics?: string[]
  badge?: ReactNode
  onClick?: () => void
  className?: string
  fallbackIcon?: ReactNode
  onTryOn?: () => void
  index?: string
}

export function ItemCard({
  title,
  imageUrl,
  imageAlt,
  colorName,
  formality,
  badge,
  onClick,
  className,
  onTryOn,
  index,
}: ItemCardProps) {
  const metaText =
    colorName ??
    (formality !== undefined ? FORMALITY_LABELS[formality] : '')

  const frame = (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden bg-paper-2',
        !imageUrl && 'product__frame--placeholder',
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className="h-full w-full object-cover"
        />
      ) : null}

      {index && (
        <span className="absolute top-3 left-3 font-mono text-[11px] uppercase tracking-[0.04em] text-ink">
          {index}
        </span>
      )}

      {badge && (
        <div className="absolute bottom-3 right-3">{badge}</div>
      )}

      {onTryOn && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTryOn()
          }}
          className={cn(
            'absolute top-3 right-3',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            'font-mono text-[10px] uppercase tracking-[0.08em]',
            'bg-ink text-paper px-3 py-2 border border-ink',
            'hover:bg-paper hover:text-ink',
          )}
          aria-label={`Try on ${title}`}
        >
          Try on
        </button>
      )}
    </div>
  )

  const meta = (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-display text-[18px] leading-tight text-ink">
        {title}
      </span>
      {metaText && (
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          {metaText}
        </span>
      )}
    </div>
  )

  const containerClasses = cn(
    'group flex flex-col gap-3 text-left',
    onClick && 'cursor-pointer',
    'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
    className,
  )

  if (!onClick) {
    return (
      <article className={containerClasses}>
        {frame}
        {meta}
      </article>
    )
  }

  // onTryOn renders a <button> inside the frame, so the outer interactive
  // element must be a <div role="button"> to avoid nested buttons.
  if (onTryOn) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        className={containerClasses}
        aria-label={`Open item details for ${title}`}
      >
        {frame}
        {meta}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={containerClasses}
      aria-label={`Open item details for ${title}`}
    >
      {frame}
      {meta}
    </button>
  )
}

interface OutfitCardProps {
  name: string
  createdAt?: string
  thumbnailUrl?: string | null
  itemCount: number
  onClick?: () => void
  className?: string
  index?: string
}

export function OutfitCard({
  name,
  createdAt,
  thumbnailUrl,
  itemCount,
  onClick,
  className,
  index,
}: OutfitCardProps) {
  const frame = (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden bg-paper-2',
        !thumbnailUrl && 'product__frame--placeholder',
      )}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`${name} preview`}
          className="h-full w-full object-cover"
        />
      ) : null}

      {index && (
        <span className="absolute top-3 left-3 font-mono text-[11px] uppercase tracking-[0.04em] text-ink">
          {index}
        </span>
      )}

      <span className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
        {itemCount} {itemCount === 1 ? 'piece' : 'pieces'}
      </span>
    </div>
  )

  const meta = (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-display text-[18px] leading-tight text-ink">
        {name}
      </span>
      {createdAt && (
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          {createdAt}
        </span>
      )}
    </div>
  )

  const containerClasses = cn(
    'group flex flex-col gap-3 text-left w-full',
    onClick && 'cursor-pointer',
    'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
    className,
  )

  if (!onClick) {
    return (
      <article className={containerClasses}>
        {frame}
        {meta}
      </article>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={containerClasses}
      aria-label={`Open outfit details for ${name}`}
    >
      {frame}
      {meta}
    </button>
  )
}

interface RecommendationCardProps {
  title: string
  description?: string
  swatchHex?: string
  meta?: ReactNode
  action?: ReactNode
  onClick?: () => void
  className?: string
}

export function RecommendationCard({
  title,
  description,
  swatchHex,
  meta,
  action,
  onClick,
  className,
}: RecommendationCardProps) {
  const content = (
    <div className="flex items-center gap-[var(--space-3)] p-[var(--space-3)] text-left">
      {swatchHex ? (
        <div
          className="h-8 w-8 rounded-full border-2 border-primary-600"
          style={{ backgroundColor: swatchHex }}
          aria-hidden="true"
        />
      ) : (
        <div className="h-8 w-8 rounded-full border border-primary-700 bg-primary-700/70" aria-hidden="true" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        {description && <p className="truncate text-[10px] uppercase text-neutral-500">{description}</p>}
      </div>

      {meta}
      {action}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800',
          'transition-all hover:border-primary-500',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900',
          className
        )}
        aria-label={title}
      >
        {content}
      </button>
    )
  }

  return <Card className={className}>{content}</Card>
}

export default Card
