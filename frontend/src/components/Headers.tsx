'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import NavBar from './NavBar'
import AuthModal from './AuthModal'
import Link from 'next/link'

export default function Header() {
  const [isAuthModalOpen, setAuthModalOpen] = useState(false)
  const pathname = usePathname()

  // Landing supplies its own editorial masthead per the artboard.
  if (pathname === '/') return null

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-paper border-b border-ink">
        <div className="flex items-center justify-between px-8 md:px-12 py-[20px]">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink hover:text-ink-2 transition-colors"
          >
            Style It Yourself · Est. 2025
          </Link>

          <NavBar onOpenAuth={() => setAuthModalOpen(true)} />
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
