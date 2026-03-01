import type { HTMLAttributes, ReactNode } from 'react'
import { Shirt, Package } from 'lucide-react'
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

interface ItemCardProps {
  title: string
  subtitle?: string
  imageUrl?: string | null
  imageAlt: string
  colorHex?: string
  badge?: ReactNode
  onClick?: () => void
  className?: string
  fallbackIcon?: ReactNode
}

export function ItemCard({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  colorHex,
  badge,
  onClick,
  className,
  fallbackIcon,
}: ItemCardProps) {
  const content = (
    <>
      <div className="relative aspect-[3/4] bg-primary-900">
        {imageUrl ? (
          <img src={imageUrl} alt={imageAlt} className="h-full w-full object-contain p-[var(--space-3)]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-600">
            {fallbackIcon ?? <Shirt size={30} strokeWidth={1.5} aria-hidden="true" />}
          </div>
        )}

        {colorHex && (
          <div
            className="absolute bottom-[var(--space-2)] left-[var(--space-2)] h-5 w-5 rounded-full border-2 border-primary-900"
            style={{ backgroundColor: colorHex }}
            aria-hidden="true"
          />
        )}

        {badge && <div className="absolute right-[var(--space-2)] top-[var(--space-2)]">{badge}</div>}
      </div>

      <div className="border-t border-primary-700 p-[var(--space-3)] text-left">
        <p className="truncate text-xs font-medium text-white">{title}</p>
        {subtitle && <p className="mt-[2px] truncate text-[10px] uppercase text-neutral-500">{subtitle}</p>}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800 text-left',
          'transition-all hover:scale-[1.02] hover:border-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900',
          className
        )}
        aria-label={`Open item details for ${title}`}
      >
        {content}
      </button>
    )
  }

  return <Card className={className}>{content}</Card>
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
  const content = (
    <>
      <div className="relative aspect-[3/4] bg-primary-900">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={`${name} preview`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-600">
            <Package size={30} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}

        <div className="absolute right-[var(--space-2)] top-[var(--space-2)] rounded-[var(--radius-sm)] border border-primary-700 bg-primary-900/90 px-[var(--space-2)] py-[2px] text-[10px] font-bold uppercase tracking-wider text-white">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </div>
      </div>

      <div className="border-t border-primary-700 p-[var(--space-3)] text-left">
        <p className="truncate text-xs font-medium text-white">{name}</p>
        {createdAt && <p className="mt-[2px] text-[10px] uppercase text-neutral-500">{createdAt}</p>}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full overflow-hidden rounded-[var(--radius-lg)] border border-primary-700 bg-primary-800 text-left',
          'transition-all hover:scale-[1.02] hover:border-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900',
          className
        )}
        aria-label={`Open outfit details for ${name}`}
      >
        {content}
      </button>
    )
  }

  return <Card className={className}>{content}</Card>
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
