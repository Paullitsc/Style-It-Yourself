'use client'

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
  hideL1 = false
}: CategorySelectorProps) {
  return (
    <div className="space-y-6">
      {/* Level 1 Categories */}
      {!hideL1 && l1Options.length > 0 && (
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
            Category <span className="text-accent-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {l1Options.map((l1) => (
              <button
                key={l1}
                onClick={() => onSelectL1?.(l1)}
                className={`
                  px-4 py-2.5 text-xs font-medium uppercase tracking-wider border transition-all duration-200
                  ${selectedL1 === l1
                    ? 'bg-white text-primary-900 border-white'
                    : 'bg-transparent text-neutral-400 border-primary-600 hover:border-neutral-400 hover:text-white'
                  }
                `}
              >
                {l1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Level 2 Categories */}
      {(!hideL1 ? selectedL1 : true) && l2Options.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500 mb-3">
            Sub-Category <span className="text-accent-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {l2Options.map((l2) => (
              <button
                key={l2}
                onClick={() => onSelectL2(l2)}
                className={`
                  px-4 py-2.5 text-xs font-medium uppercase tracking-wider border transition-all duration-200
                  ${selectedL2 === l2
                    ? 'bg-accent-500 text-primary-900 border-accent-500'
                    : 'bg-transparent text-neutral-400 border-primary-600 hover:border-accent-500/50 hover:text-accent-500'
                  }
                `}
              >
                {l2}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}