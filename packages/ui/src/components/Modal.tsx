'use client'

import { useEffect, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert01Icon } from '@hugeicons/core-free-icons'
import { cn } from '../lib/cn'
import { Button } from './Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../primitives/dialog'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
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

/**
 * Editorial dialog built on Radix (via ../primitives/dialog).
 *
 * Radix owns focus trapping, focus restore, scroll lock, `aria-modal`, and
 * Escape handling — this used to be ~150 lines of hand-rolled logic here.
 * The public props are unchanged so existing callers need no edits.
 */
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
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={showCloseButton}
        // Sections carry their own padding and hairline rules, so the panel
        // itself must not add shadcn's default p-6/gap-4.
        className={cn('gap-0 p-0', sizeClasses[size], panelClassName, className)}
        onEscapeKeyDown={(event) => {
          if (!closeOnEsc) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (!closeOnBackdrop) event.preventDefault()
        }}
        onOpenAutoFocus={(event) => {
          if (initialFocusRef?.current) {
            event.preventDefault()
            initialFocusRef.current.focus()
          }
        }}
      >
        {/* Radix requires an accessible name; render one even when the caller
            supplies no visible title. */}
        {title ? (
          <div className="flex items-center justify-between border-b border-ink px-[var(--space-6)] py-[var(--space-4)]">
            <DialogTitle className="font-display text-[24px] text-ink">
              {title}
            </DialogTitle>
          </div>
        ) : (
          <DialogTitle className="sr-only">Dialog</DialogTitle>
        )}

        {description ? (
          <DialogDescription className="px-[var(--space-6)] pt-[var(--space-4)] font-display text-[18px] leading-relaxed text-ink-2">
            {description}
          </DialogDescription>
        ) : null}

        {children}

        {footer && (
          <div className="border-t border-ink px-[var(--space-6)] py-[var(--space-4)]">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  return typeof (value as Promise<unknown>)?.then === 'function'
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
      <div className="flex items-start gap-[var(--space-3)] px-[var(--space-6)] py-[var(--space-5)]">
        {tone === 'danger' && (
          <HugeiconsIcon
            icon={Alert01Icon}
            size={18}
            strokeWidth={1}
            className="mt-[2px] shrink-0 text-accent"
            aria-hidden="true"
          />
        )}
        <p className="font-display text-[18px] leading-relaxed text-ink-2">
          {description}
        </p>
      </div>
    </Modal>
  )
}
