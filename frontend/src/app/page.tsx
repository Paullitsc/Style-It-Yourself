'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import AuthModal from '@/components/AuthModal'
import { Button } from '@/components/ui'

const CREDITS = [
  { label: 'How it works', value: 'HSL color theory' },
  { label: 'Try-on', value: 'Google Nano Banana Pro Model' },
  { label: 'Pricing', value: 'Free' },
  { label: 'Why', value: 'Style more, buy less' },
]

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAuthModalOpen, setAuthModalOpen] = useState(false)

  const handleBegin = () => {
    router.push(user ? '/closet' : '/style')
  }

  const scrollToCredits = () => {
    document
      .getElementById('credits')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const navLinkClass =
    'font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors'

  return (
    <>
      {/* -mt-20 cancels the pt-20 baked into layout.tsx's <main> so the
          landing starts at the viewport top, matching the artboard. */}
      <div className="-mt-20 min-h-screen bg-paper text-ink flex flex-col">
        <div className="max-w-[1320px] w-full mx-auto px-14 max-md:px-6 pt-7 pb-7 flex-1 flex flex-col">
          {/* MASTHEAD */}
          <header className="grid grid-cols-[1fr_auto_1fr] items-center py-2 pb-6 border-b border-ink">
            <div />
            <Link
              href="/"
              className="font-display italic text-[22px] leading-none text-center text-ink"
            >
              Style It Yourself
            </Link>
            <nav className="flex gap-6 justify-end">
              <Link href="/style" className={navLinkClass}>
                Style
              </Link>
              {user && (
                <Link href="/closet" className={navLinkClass}>
                  Closet
                </Link>
              )}
              {user ? (
                <Link href="/account" className={navLinkClass}>
                  Account
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className={navLinkClass}
                >
                  Login
                </button>
              )}
            </nav>
          </header>

          {/* STAGE */}
          <section className="py-24 max-md:py-16 text-center">
            {/* HEADLINE */}
            <h1 className="font-display font-normal uppercase text-[clamp(96px,16vw,240px)] leading-[0.85] tracking-[-0.025em] m-0">
              Style it,
              <br />
              <em className="italic text-ink-3">yourself.</em>
            </h1>

            {/* LEDE */}
            <p className="max-w-[540px] mx-auto mt-10 font-display italic text-[22px] leading-[1.35] text-ink-2">
              A quiet tool for putting clothes together with intention — color,
              formality, and a working sense of taste.
            </p>
          </section>

          {/* CREDITS */}
          <footer
            id="credits"
            className="mt-auto pt-[22px] border-t border-ink grid grid-cols-4 max-md:grid-cols-2 gap-y-6 font-mono text-[10px] uppercase tracking-[0.1em]"
          >
            {CREDITS.map((credit, i) => (
              <div
                key={credit.label}
                className={
                  i === CREDITS.length - 1 ? 'text-right max-md:text-left' : ''
                }
              >
                <b className="block text-ink-3 font-medium mb-[6px]">
                  {credit.label}
                </b>
                {credit.value}
              </div>
            ))}
          </footer>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  )
}
