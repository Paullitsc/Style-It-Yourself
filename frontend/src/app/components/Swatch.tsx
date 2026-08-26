import type { Color } from '@/types'

export default function Swatch({ color }: { color: Color }) {
  return (
    <span className="flex items-center gap-[10px] min-w-0">
      <span
        aria-hidden="true"
        className="w-[13px] h-[13px] shrink-0 rounded-[2px] border border-rule-soft"
        style={{ backgroundColor: color.hex }}
      />
      <span className="truncate">{color.name}</span>
      <span className="text-ink-3 shrink-0">{color.hsl.h}°</span>
    </span>
  )
}
