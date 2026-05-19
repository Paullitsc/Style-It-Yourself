'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import AuthModal from './AuthModal'

const linkClass =
  'font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors'

export default function Header() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isAuthModalOpen, setAuthModalOpen] = useState(false)

  const isLanding = pathname === '/'
  const onStyle = pathname.startsWith('/style')
  const onCloset = pathname.startsWith('/closet')
  const onAccount = pathname.startsWith('/account')

  return (
    <>
      <header className="border-b border-ink bg-paper">
        <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 pt-4 pb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em]">
            {!isLanding && (
              <Link
                href="/"
                className="pb-[2px] border-b border-transparent hover:border-ink transition-colors"
              >
                ← Back
              </Link>
            )}
          </div>

          <Link
            href="/"
            className="font-display italic text-[22px] leading-none text-center text-ink"
          >
            Style It Yourself
          </Link>

          <nav className="flex gap-6 justify-end">
            {!onStyle && (
              <Link href="/style" className={linkClass}>
                Style
              </Link>
            )}
            {user && !onCloset && (
              <Link href="/closet" className={linkClass}>
                Closet
              </Link>
            )}
            {user && !onAccount && (
              <Link href="/account" className={linkClass}>
                Account
              </Link>
            )}
            {user ? (
              <Link
                href="#logout"
                onClick={(e) => {
                  e.preventDefault()
                  signOut()
                }}
                className={linkClass}
              >
                Log out
              </Link>
            ) : (
              <Link
                href="#login"
                onClick={(e) => {
                  e.preventDefault()
                  setAuthModalOpen(true)
                }}
                className={linkClass}
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  )
}
