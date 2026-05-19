'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import AuthModal from './AuthModal'
import { cn } from '@/lib/cn'

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
      <header className="border-b border-ink bg-paper">
        <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 pt-4 pb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <div />

          <Link
            href="/"
            className="font-display italic text-[22px] leading-none text-center text-ink"
          >
            Style It Yourself
          </Link>

          <nav className="flex gap-6 justify-end">
            <Link
              href="/style"
              className={linkClass('/style')}
              aria-current={isActive('/style') ? 'page' : undefined}
            >
              Style
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
