import type { HTMLAttributes, ReactNode } from 'react'
import { Shirt, Package, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800',
        interactive && 'transition-all hover:border-primary-600',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-primary-700 p-[var(--space-4)]', className)} {...props} />
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[var(--space-4)]', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-primary-700 p-[var(--space-4)]', className)} {...props} />
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
}

export function ItemCard({
  title,
  imageUrl,
  imageAlt,
  colorHex,
  colorName,
  formality,
  aesthetics,
  badge,
  onClick,
  className,
  fallbackIcon,
  onTryOn,
}: ItemCardProps) {
  const imageArea = (
    <div className="relative aspect-[3/4] overflow-hidden bg-primary-900">
      {imageUrl ? (
        <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-600">
          {fallbackIcon ?? <Shirt size={30} strokeWidth={1.5} aria-hidden="true" />}
        </div>
      )}

      {badge && <div className="absolute right-[var(--space-2)] top-[var(--space-2)]">{badge}</div>}

      {/* Hover overlay — slides up from bottom */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out',
          'bg-gradient-to-t from-primary-900/95 via-primary-900/60 to-transparent',
          'px-[var(--space-3)] pb-[var(--space-3)] pt-[var(--space-10)]'
        )}
      >
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white">{title}</p>
        {colorHex && colorName && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full border border-primary-700"
              style={{ backgroundColor: colorHex }}
              aria-hidden="true"
            />
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-700">
              {colorName}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {formality !== undefined && (
            <span className="rounded-[2px] border border-accent-700 bg-accent-900/30 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-accent-500">
              {FORMALITY_LABELS[formality] ?? `Lvl ${formality}`}
            </span>
          )}
          {aesthetics?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-[2px] border border-primary-600 bg-primary-800/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-neutral-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group w-full overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800 text-left',
          'transition-all hover:scale-[1.02] hover:border-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900',
          className
        )}
        aria-label={`Open item details for ${title}`}
      >
        <div className="relative">
          {imageArea}
          {onTryOn && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTryOn() }}
              className={cn(
                'absolute left-[var(--space-2)] top-[var(--space-2)]',
                'flex h-7 w-7 items-center justify-center rounded-full',
                'border border-primary-600 bg-primary-900/80 backdrop-blur',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                'text-accent-500 hover:bg-accent-500 hover:text-primary-900 hover:border-accent-500',
              )}
              aria-label="Try on this item"
            >
              <Sparkles size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </button>
    )
  }

  return (
    <Card className={cn('group', className)}>
      <div className="relative">
        {imageArea}
        {onTryOn && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTryOn() }}
            className={cn(
              'absolute left-[var(--space-2)] top-[var(--space-2)]',
              'flex h-7 w-7 items-center justify-center rounded-full',
              'border border-primary-600 bg-primary-900/80 backdrop-blur',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
              'text-accent-500 hover:bg-accent-500 hover:text-primary-900 hover:border-accent-500',
            )}
            aria-label="Try on this item"
          >
            <Sparkles size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </Card>
  )
}

interface OutfitCardProps {
  name: string
  createdAt?: string
  thumbnailUrl?: string | null
  itemCount: number
  onClick?: () => void
  className?: string
}

export function OutfitCard({
  name,
  createdAt,
  thumbnailUrl,
  itemCount,
  onClick,
  className,
}: OutfitCardProps) {
  const imageArea = (
    <div className="relative aspect-[3/4] overflow-hidden bg-primary-900">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={`${name} preview`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-600">
          <Package size={30} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}

      {/* Hover overlay — slides up from bottom */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out',
          'bg-gradient-to-t from-primary-900/95 via-primary-900/60 to-transparent',
          'px-[var(--space-3)] pb-[var(--space-3)] pt-[var(--space-10)]'
        )}
      >
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white">{name}</p>
        <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-700">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          {createdAt ? ` · ${createdAt}` : ''}
        </p>
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group w-full overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800 text-left',
          'transition-all hover:scale-[1.02] hover:border-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900',
          className
        )}
        aria-label={`Open outfit details for ${name}`}
      >
        {imageArea}
      </button>
    )
  }

  return (
    <Card className={cn('group', className)}>
      {imageArea}
    </Card>
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
