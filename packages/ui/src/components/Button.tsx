'use client'

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Button as ButtonPrimitive } from '../primitives/button'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

/** Our semantic names -> the shadcn primitive's cva variants. */
const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'destructive',
} as const satisfies Record<ButtonVariant, string>

/**
 * The primitive's sizes are shadcn's compact defaults (h-9 etc.). The editorial
 * system wants generous, wide buttons, so we override with explicit padding and
 * neutralise the primitive's fixed height.
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-auto px-[14px] py-[12px] min-w-[160px]',
  md: 'h-auto px-[22px] py-[18px] min-w-[220px]',
  lg: 'h-auto px-[28px] py-[22px] min-w-[260px]',
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
  return (
    <ButtonPrimitive
      ref={ref}
      type={type ?? 'button'}
      variant={variantMap[variant]}
      className={cn(
        // Editorial layout: label centred, icons pushed to the edges.
        'justify-between gap-[24px] tracking-[0.12em]',
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
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
    </ButtonPrimitive>
  )
})
