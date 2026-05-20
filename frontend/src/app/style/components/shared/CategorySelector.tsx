'use client'

import { cn } from '@/lib/cn'

interface CategorySelectorProps {
  l1Options?: string[]
  l2Options: string[]
  selectedL1?: string
  selectedL2?: string
  onSelectL1?: (l1: string) => void
  onSelectL2: (l2: string) => void
  hideL1?: boolean
}

export default function CategorySelector({
  l1Options = [],
  l2Options,
  selectedL1,
  selectedL2,
  onSelectL1,
  onSelectL2,
  hideL1 = false,
}: CategorySelectorProps) {
  const showL2 = !hideL1 ? selectedL1 && l2Options.length > 0 : l2Options.length > 0

  return (
    <div className="flex flex-col gap-7">
      {!hideL1 && l1Options.length > 0 && (
        <FieldGroup label="Category" required>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {l1Options.map((l1) => (
              <ChipButton
                key={l1}
                active={selectedL1 === l1}
                onClick={() => onSelectL1?.(l1)}
              >
                {l1}
              </ChipButton>
            ))}
          </div>
        </FieldGroup>
      )}

      {showL2 && (
        <FieldGroup label="Sub-category" required>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {l2Options.map((l2) => (
              <ChipButton
                key={l2}
                active={selectedL2 === l2}
                onClick={() => onSelectL2(l2)}
              >
                {l2}
              </ChipButton>
            ))}
          </div>
        </FieldGroup>
      )}
    </div>
  )
}

interface FieldGroupProps {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}

function FieldGroup({ label, required, hint, children }: FieldGroupProps) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          {label}
          {required && <span className="text-accent ml-1">*</span>}
        </label>
        {hint && (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 opacity-70">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

interface ChipButtonProps {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

function ChipButton({ active, onClick, disabled, children }: ChipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'pb-[2px] border-b-2 transition-colors duration-200',
        'font-mono text-[11px] uppercase tracking-[0.12em]',
        disabled
          ? 'border-transparent text-ink-3 opacity-40 cursor-not-allowed'
          : active
          ? 'border-ink text-ink font-bold'
          : 'border-transparent text-ink-3 font-normal hover:text-ink hover:border-ink',
      )}
    >
      {children}
    </button>
  )
}

export { ChipButton, FieldGroup }
