'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import AuthModal from './AuthModal'
import { cn } from '@siy/ui'

const baseLink =
  'font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] transition-colors'
const inactiveLink = 'border-b border-transparent hover:border-ink'
const activeLink = 'border-b border-ink'

export default function Header() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isAuthModalOpen, setAuthModalOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const linkClass = (href: string) =>
    cn(baseLink, isActive(href) ? activeLink : inactiveLink)

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper">
        {/* Stacks to two centered rows below md; --masthead-h in global.css
            carries a matching media override, so keep the two in sync. */}
        <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 pt-4 pb-6 grid grid-cols-[1fr_auto_1fr] items-center max-md:flex max-md:flex-col max-md:gap-1.5 max-md:pt-3 max-md:pb-4">
          <div className="max-md:hidden" />

          <Link
            href="/"
            className="font-display text-[22px] max-md:text-[20px] leading-none text-center text-ink"
          >
            Style It Yourself
          </Link>

          <nav className="flex gap-6 justify-end max-md:gap-4 max-md:justify-center max-md:flex-wrap">
            <Link
              href="/style"
              className={linkClass('/style')}
              aria-current={isActive('/style') ? 'page' : undefined}
            >
              Style
            </Link>
            <Link
              href="/notes"
              className={linkClass('/notes')}
              aria-current={isActive('/notes') ? 'page' : undefined}
            >
              Notes
            </Link>
            {user && (
              <Link
                href="/closet"
                className={linkClass('/closet')}
                aria-current={isActive('/closet') ? 'page' : undefined}
              >
                Closet
              </Link>
            )}
            {user && (
              <Link
                href="/account"
                className={linkClass('/account')}
                aria-current={isActive('/account') ? 'page' : undefined}
              >
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
                className={cn(baseLink, inactiveLink)}
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
                className={cn(baseLink, inactiveLink)}
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
