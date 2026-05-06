import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface HairlineProps extends HTMLAttributes<HTMLHRElement> {
  soft?: boolean
}

export function Hairline({ soft = false, className, ...props }: HairlineProps) {
  return (
    <hr
      className={cn(
        'border-0 border-t',
        soft ? 'border-rule-soft' : 'border-ink',
        className
      )}
      {...props}
    />
  )
}

export default Hairline
