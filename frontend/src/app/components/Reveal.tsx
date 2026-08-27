'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * Fades content up once as it first enters the viewport. No state: the
 * IntersectionObserver writes styles straight to the element, so the
 * reveal never re-renders anything. Honors prefers-reduced-motion by
 * showing immediately.
 */
export default function Reveal({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const show = () => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      show()
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          show()
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: 'translateY(24px)',
        transition:
          'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {children}
    </div>
  )
}
