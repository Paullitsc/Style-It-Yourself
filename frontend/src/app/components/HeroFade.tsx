'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * Fades and drifts the hero out as the reader scrolls toward the fold, so
 * the first frame hands off to the manifesto instead of hard-cutting.
 * Dependency-free: one passive scroll listener behind requestAnimationFrame.
 * Honors prefers-reduced-motion by doing nothing.
 */
export default function HeroFade({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const update = () => {
      raf = 0
      const fold = window.innerHeight * 0.85
      const progress = Math.min(1, Math.max(0, window.scrollY / fold))
      el.style.opacity = String(1 - progress)
      el.style.transform = `translateY(${progress * -28}px)`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} className="will-change-[opacity,transform]">
      {children}
    </div>
  )
}
