import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with conflict resolution: later classes win.
 * `cn('p-2', 'p-4')` -> 'p-4' (the old hand-rolled version emitted both).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
