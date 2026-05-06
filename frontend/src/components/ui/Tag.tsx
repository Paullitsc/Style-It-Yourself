import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  selected?: boolean
  children: ReactNode
}

export function Tag({ selected = false, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[8px] px-[10px] py-[6px]',
        'font-mono text-[10px] uppercase tracking-[0.08em]',
        'border border-ink bg-transparent text-ink',
        'transition-colors',
        selected && 'bg-ink text-paper',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export default Tag
