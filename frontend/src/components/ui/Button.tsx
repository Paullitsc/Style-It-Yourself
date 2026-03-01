'use client'

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-white text-primary-900 border-white hover:bg-neutral-200 focus-visible:ring-white',
  secondary: 'bg-primary-800 text-white border-primary-600 hover:bg-primary-700 focus-visible:ring-accent-500',
  ghost: 'bg-transparent text-neutral-300 border-transparent hover:bg-primary-800 hover:text-white focus-visible:ring-accent-500',
  danger: 'bg-error-500 text-white border-error-500 hover:bg-error-600 focus-visible:ring-error-400',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-[var(--size-control-sm)] px-[var(--space-3)] text-[11px]',
  md: 'h-[var(--size-control-md)] px-[var(--space-4)] text-xs',
  lg: 'h-[var(--size-control-lg)] px-[var(--space-5)] text-sm',
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
        'inline-flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] border font-bold uppercase tracking-widest',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900',
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
          className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] animate-spin rounded-full border-2 border-current border-t-transparent"
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
