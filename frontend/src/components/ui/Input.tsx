'use client'

import { useId, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ChevronDown, Upload, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FieldProps {
  id?: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
}

function getDescribedBy(id: string, hint?: string, error?: string) {
  const ids = []
  if (hint) ids.push(`${id}-hint`)
  if (error) ids.push(`${id}-error`)
  return ids.length > 0 ? ids.join(' ') : undefined
}

function FieldMeta({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-[var(--space-1)] text-[11px] text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-[var(--space-1)] text-[11px] text-error-400" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldProps {
  leftIcon?: ReactNode
}

export function TextInput({
  id,
  label,
  hint,
  error,
  required,
  className,
  leftIcon,
  type = 'text',
  ...props
}: TextInputProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const describedBy = getDescribedBy(fieldId, hint, error)

  return (
    <div className={cn('space-y-[var(--space-1)]', className)}>
      <label htmlFor={fieldId} className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
        {required && <span className="ml-[2px] text-accent-500">*</span>}
      </label>

      <div className="relative">
        {leftIcon && <span className="pointer-events-none absolute left-[var(--space-3)] top-1/2 -translate-y-1/2 text-neutral-600">{leftIcon}</span>}
        <input
          id={fieldId}
          type={type}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'h-[var(--size-control-md)] w-full rounded-[var(--radius-md)] border border-primary-700 bg-primary-800 text-sm text-white',
            'placeholder-neutral-600 transition-colors focus:border-accent-500 focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            leftIcon ? 'pl-[calc(var(--space-3)*2+var(--size-icon-sm))] pr-[var(--space-3)]' : 'px-[var(--space-3)]'
          )}
          {...props}
        />
      </div>

      <FieldMeta id={fieldId} hint={hint} error={error} />
    </div>
  )
}

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {
  options: SelectOption[]
  placeholder?: string
}

export function SelectInput({
  id,
  label,
  hint,
  error,
  required,
  className,
  options,
  placeholder,
  ...props
}: SelectInputProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const describedBy = getDescribedBy(fieldId, hint, error)

  return (
    <div className={cn('space-y-[var(--space-1)]', className)}>
      <label htmlFor={fieldId} className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
        {required && <span className="ml-[2px] text-accent-500">*</span>}
      </label>

      <div className="relative">
        <select
          id={fieldId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'h-[var(--size-control-md)] w-full appearance-none rounded-[var(--radius-md)] border border-primary-700 bg-primary-800 px-[var(--space-3)] pr-[calc(var(--space-3)*2+var(--size-icon-md))] text-sm text-white',
            'transition-colors focus:border-accent-500 focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60'
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-[var(--space-3)] top-1/2 -translate-y-1/2 text-neutral-500"
          size={16}
          aria-hidden="true"
        />
      </div>

      <FieldMeta id={fieldId} hint={hint} error={error} />
    </div>
  )
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true

  const accepted = accept
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  if (accepted.length === 0) return true

  const fileType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()

  return accepted.some((pattern) => {
    if (pattern.startsWith('.')) {
      return fileName.endsWith(pattern)
    }

    if (pattern.endsWith('/*')) {
      return fileType.startsWith(pattern.replace('*', ''))
    }

    return fileType === pattern
  })
}

export interface FileUploadInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value' | 'size'>,
    FieldProps {
  onFileSelect: (file: File) => void
  onClear?: () => void
  selectedFile?: File | null
  maxSizeMB?: number
  dropLabel?: string
}

export function FileUploadInput({
  id,
  label,
  hint,
  error,
  required,
  className,
  onFileSelect,
  onClear,
  selectedFile,
  maxSizeMB = 10,
  dropLabel = 'Drop file here or click to browse',
  accept,
  disabled,
  ...props
}: FileUploadInputProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const resolvedError = error ?? validationError ?? undefined
  const describedBy = getDescribedBy(fieldId, hint, resolvedError)

  const validateAndSelect = (file: File) => {
    setValidationError(null)

    if (!matchesAccept(file, accept)) {
      setValidationError('Selected file type is not allowed.')
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setValidationError(`File must be smaller than ${maxSizeMB}MB.`)
      return
    }

    onFileSelect(file)
  }

  return (
    <div className={cn('space-y-[var(--space-1)]', className)}>
      <label htmlFor={fieldId} className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
        {required && <span className="ml-[2px] text-accent-500">*</span>}
      </label>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (disabled) return
          const file = event.dataTransfer.files?.[0]
          if (file) validateAndSelect(file)
        }}
        className={cn(
          'flex min-h-[120px] w-full flex-col items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-lg)] border-2 border-dashed px-[var(--space-4)] py-[var(--space-5)] text-center transition-all',
          isDragging
            ? 'border-accent-500 bg-accent-500/10'
            : 'border-primary-600 bg-primary-800/30 hover:border-primary-500 hover:bg-primary-800/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        aria-describedby={describedBy}
        aria-invalid={Boolean(resolvedError)}
      >
        <Upload size={24} className={cn('text-neutral-500', isDragging && 'text-accent-500')} aria-hidden="true" />
        <span className="text-sm text-white">{dropLabel}</span>
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">
          {accept ? accept : 'Any file type'} • Max {maxSizeMB}MB
        </span>
      </button>

      <input
        ref={inputRef}
        id={fieldId}
        type="file"
        accept={accept}
        required={required}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) validateAndSelect(file)
          event.currentTarget.value = ''
        }}
        disabled={disabled}
        {...props}
      />

      {selectedFile && (
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-primary-700 bg-primary-800 px-[var(--space-3)] py-[var(--space-2)]">
          <p className="truncate text-sm text-white">{selectedFile.name}</p>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-[var(--radius-sm)] p-[var(--space-1)] text-neutral-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label="Remove selected file"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <FieldMeta id={fieldId} hint={hint} error={resolvedError} />
    </div>
  )
}

export default TextInput
