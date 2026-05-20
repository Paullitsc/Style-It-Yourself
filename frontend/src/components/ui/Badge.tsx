import type { HTMLAttributes } from 'react'
import { FORMALITY_LEVELS } from '@/types'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeSize = 'sm' | 'md'

type StatusType = 'owned' | 'wishlist' | 'success' | 'warning' | 'error' | 'info'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-ink text-ink',
  accent: 'border-accent text-accent',
  success: 'border-ink text-ink',
  warning: 'border-ink text-ink',
  danger: 'border-accent text-accent',
  info: 'border-ink text-ink',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-[8px] py-[2px] text-[9px]',
  md: 'px-[10px] py-[6px] text-[10px]',
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
        'inline-flex items-center font-mono uppercase tracking-[0.08em] border bg-transparent',
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
