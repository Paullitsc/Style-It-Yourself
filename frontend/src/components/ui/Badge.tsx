import type { HTMLAttributes } from 'react'
import { FORMALITY_LEVELS } from '@/types'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeSize = 'sm' | 'md'

type StatusType = 'owned' | 'wishlist' | 'success' | 'warning' | 'error' | 'info'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-primary-800 text-neutral-300 border-primary-700',
  accent: 'bg-accent-500/15 text-accent-400 border-accent-500/40',
  success: 'bg-success-500/15 text-success-400 border-success-500/40',
  warning: 'bg-warning-500/15 text-warning-400 border-warning-500/40',
  danger: 'bg-error-500/15 text-error-400 border-error-500/40',
  info: 'bg-primary-700/80 text-neutral-100 border-primary-600',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-[var(--space-2)] py-[2px] text-[9px]',
  md: 'px-[var(--space-2)] py-[var(--space-1)] text-[10px]',
}

const categoryToneMap: Record<string, BadgeTone> = {
  tops: 'info',
  bottoms: 'neutral',
  shoes: 'accent',
  outerwear: 'warning',
  accessories: 'success',
}

const statusToneMap: Record<StatusType, BadgeTone> = {
  owned: 'success',
  wishlist: 'accent',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
}

const statusLabelMap: Record<StatusType, string> = {
  owned: 'Owned',
  wishlist: 'Wishlist',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  size?: BadgeSize
}

export function Badge({ tone = 'neutral', size = 'md', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] border font-bold uppercase tracking-wider',
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

interface StatusBadgeProps extends Omit<BadgeProps, 'children' | 'tone'> {
  status: StatusType
  label?: string
}

export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  return (
    <Badge tone={statusToneMap[status]} {...props}>
      {label ?? statusLabelMap[status]}
    </Badge>
  )
}

interface CategoryBadgeProps extends Omit<BadgeProps, 'children' | 'tone'> {
  category: string
}

export function CategoryBadge({ category, ...props }: CategoryBadgeProps) {
  const tone = categoryToneMap[category.toLowerCase()] ?? 'neutral'
  return <Badge tone={tone} {...props}>{category}</Badge>
}

interface FormalityBadgeProps extends Omit<BadgeProps, 'children' | 'tone'> {
  level: number
  tone?: BadgeTone
}

export function FormalityBadge({ level, tone = 'info', ...props }: FormalityBadgeProps) {
  return (
    <Badge tone={tone} {...props}>
      {FORMALITY_LEVELS[level] ?? `Level ${level}`}
    </Badge>
  )
}

export default Badge
