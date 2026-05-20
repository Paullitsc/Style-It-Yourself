'use client'

import { useStyleStore, type StyleStep } from '@/store/styleStore'
import { cn } from '@/lib/cn'

const STEPS: { key: StyleStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'metadata', label: 'Describe' },
  { key: 'colors', label: 'Confirm color' },
]

const pad2 = (n: number) => String(n).padStart(2, '0')

export default function StepIndicator() {
  const { currentStep } = useStyleStore()
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

  return (
    <nav
      aria-label="Style flow progress"
      className="flex items-baseline justify-center gap-8 max-md:gap-4"
    >
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex
        const isComplete = i < currentIndex
        return (
          <div key={step.key} className="flex items-baseline gap-4 max-md:gap-2">
            <span
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
                isActive
                  ? 'text-ink font-bold'
                  : isComplete
                  ? 'text-ink'
                  : 'text-ink-3 font-normal',
              )}
            >
              {pad2(i + 1)} / {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'inline-block h-px w-12 max-md:w-6 translate-y-[-3px]',
                  isComplete ? 'bg-ink' : 'bg-rule-soft',
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
