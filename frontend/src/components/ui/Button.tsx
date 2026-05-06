'use client'

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper border-ink hover:bg-paper hover:text-ink',
  secondary: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-paper',
  ghost: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-paper',
  danger: 'bg-accent text-accent-ink border-accent hover:bg-paper hover:text-accent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-[14px] py-[12px] min-w-[160px]',
  md: 'px-[22px] py-[18px] min-w-[220px]',
  lg: 'px-[28px] py-[22px] min-w-[260px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    type,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'inline-flex items-center justify-between gap-[24px]',
        'font-mono text-[11px] uppercase tracking-[0.12em]',
        'border transition-[background-color,color] duration-200',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="h-[12px] w-[12px] animate-spin rounded-full border border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  )
})

export default Button
