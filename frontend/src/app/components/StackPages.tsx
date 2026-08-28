'use client'

import { Children, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * Phia-style stacked pages: each child section pins at the bottom of the
 * viewport when scrolled through, then the next section slides up over it
 * while the pinned one zooms out and dims.
 *
 * Mechanics, dependency-free:
 * - Every page wrapper is `position: sticky` with `top: viewport - height`,
 *   so viewport-sized pages pin under the masthead and taller ones scroll
 *   through fully before pinning bottom-aligned.
 * - One rAF-throttled scroll listener maps how far the NEXT page has
 *   covered the current one (0..1) to a scale on the covered page plus a
 *   paper veil that dims it. A veil, not element opacity: a transparent
 *   page would let the pages pinned beneath it ghost through.
 * - Later siblings paint above earlier ones (sticky positioning + DOM
 *   order), so pages must carry an opaque background.
 * - prefers-reduced-motion keeps the stacking but drops scale/fade.
 */
export default function StackPages({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const pages = Array.from(root.children) as HTMLElement[]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setOffsets = () => {
      for (const el of pages) {
        el.style.top = `${window.innerHeight - el.offsetHeight}px`
      }
    }
    setOffsets()
    const ro = new ResizeObserver(setOffsets)
    pages.forEach((p) => ro.observe(p))
    window.addEventListener('resize', setOffsets)

    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      pages.forEach((el, i) => {
        const next = pages[i + 1]
        if (!next) return
        const covered = Math.min(1, Math.max(0, (vh - next.getBoundingClientRect().top) / vh))
        el.style.transform = covered > 0 ? `scale(${1 - 0.06 * covered})` : ''
        const veil = el.lastElementChild as HTMLElement
        veil.style.opacity = String(0.6 * covered)
      })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    if (!reduced) {
      update()
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    return () => {
      window.removeEventListener('resize', setOffsets)
      window.removeEventListener('scroll', onScroll)
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref}>
      {Children.map(children, (child) => (
        <div className="sticky relative will-change-transform">
          {child}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-paper"
            style={{ opacity: 0 }}
          />
        </div>
      ))}
    </div>
  )
}
