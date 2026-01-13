'use client'

import { useStyleStore, type StyleStep } from '@/store/styleStore'
import { Check } from 'lucide-react'

const STEPS: { key: StyleStep; label: string; number: number }[] = [
  { key: 'upload', label: 'Upload', number: 1 },
  { key: 'metadata', label: 'Describe', number: 2 },
  { key: 'colors', label: 'Confirm Color', number: 3 },
]

export default function StepIndicator() {
  const { currentStep } = useStyleStore()
  
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isFuture = index > currentIndex

        return (
          <div key={step.key} className="flex items-center">
            {/* Step Circle */}
            <div className="flex items-center gap-3">
              <div
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center
                  text-xs font-bold uppercase tracking-wider
                  transition-all duration-300
                  ${isCompleted 
                    ? 'bg-accent-500 text-primary-900' 
                    : isCurrent 
                      ? 'bg-white text-primary-900 ring-2 ring-accent-500 ring-offset-2 ring-offset-primary-900' 
                      : 'bg-primary-700 text-neutral-500'
                  }
                `}
              >
                {isCompleted ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  step.number
                )}
              </div>
              
              {/* Step Label */}
              <span
                className={`
                  hidden md:block text-xs font-medium uppercase tracking-widest
                  transition-colors duration-300
                  ${isCompleted 
                    ? 'text-accent-500' 
                    : isCurrent 
                      ? 'text-white' 
                      : 'text-neutral-600'
                  }
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < STEPS.length - 1 && (
              <div
                className={`
                  w-8 md:w-16 h-[2px] mx-2 md:mx-4
                  transition-colors duration-300
                  ${index < currentIndex ? 'bg-accent-500' : 'bg-primary-700'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}