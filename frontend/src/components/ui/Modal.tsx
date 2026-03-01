'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

let openModalCount = 0

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  showCloseButton?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  className?: string
  panelClassName?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = true,
  initialFocusRef,
  className,
  panelClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  const generatedTitleId = useId()
  const generatedDescriptionId = useId()
  const titleId = title ? generatedTitleId : undefined
  const descriptionId = description ? generatedDescriptionId : undefined

  useEffect(() => {
    if (!isOpen) return

    lastFocusedRef.current = document.activeElement as HTMLElement | null
    openModalCount++
    if (openModalCount === 1) document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
        return
      }

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      if (focusable && focusable.length > 0) {
        focusable[0].focus()
        return
      }

      panelRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(timer)
      openModalCount--
      if (openModalCount === 0) document.body.style.overflow = ''
      lastFocusedRef.current?.focus()
    }
  }, [initialFocusRef, isOpen])

  if (!isOpen) return null

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && closeOnEsc) {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    if (!focusable || focusable.length === 0) {
      event.preventDefault()
      panelRef.current?.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={cn('fixed inset-0 z-[70] flex items-center justify-center p-[var(--space-4)]', className)}>
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-primary-700 bg-primary-900 shadow-2xl',
          sizeClasses[size],
          panelClassName
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-primary-800 px-[var(--space-6)] py-[var(--space-4)]">
            <div>
              {title && (
                <h2 id={titleId} className="text-lg font-bold uppercase tracking-widest text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-[var(--space-1)] text-sm text-neutral-500">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-[var(--radius-sm)] p-[var(--space-1)] text-neutral-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                aria-label="Close dialog"
              >
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="overflow-y-auto p-[var(--space-6)] scrollbar-hide">{children}</div>

        {footer && <div className="border-t border-primary-800 px-[var(--space-6)] py-[var(--space-4)]">{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  isConfirming?: boolean
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isConfirming,
}: ConfirmationModalProps) {
  const [internalPending, setInternalPending] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setInternalPending(false)
    }
  }, [isOpen])

  const pending = isConfirming ?? internalPending

  const handleConfirm = async () => {
    try {
      const maybePromise = onConfirm()
      if (isPromiseLike(maybePromise)) {
        setInternalPending(true)
        await maybePromise
      }
    } finally {
      setInternalPending(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-[var(--space-3)]">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={handleConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-[var(--space-3)]">
        {tone === 'danger' && (
          <AlertTriangle size={18} className="mt-[2px] shrink-0 text-error-400" aria-hidden="true" />
        )}
        <p className="text-sm leading-relaxed text-neutral-300">{description}</p>
      </div>
    </Modal>
  )
}

export default Modal
