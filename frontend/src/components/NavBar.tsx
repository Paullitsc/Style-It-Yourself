'use client'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { usePathname } from 'next/navigation'

interface NavBarProps {
  onOpenAuth: () => void
}

export default function NavBar({ onOpenAuth }: NavBarProps) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const baseLink =
    'font-mono text-[11px] uppercase tracking-[0.08em] transition-colors'
  const activeLink = 'text-ink border-b border-ink pb-[2px]'
  const inactiveLink = 'text-ink-3 hover:text-ink'

  const linkClass = (path: string) =>
    `${baseLink} ${pathname === path ? activeLink : inactiveLink}`

  if (!user) {
    return (
      <nav className="flex items-center gap-[32px]">
        <button onClick={onOpenAuth} className={`${baseLink} ${inactiveLink}`}>
          Log in
        </button>
        <Link href="/style" className={`${baseLink} text-ink`}>
          Enter →
        </Link>
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-[32px]">
      <Link href="/closet" className={linkClass('/closet')}>
        Closet
      </Link>
      <Link href="/account" className={linkClass('/account')}>
        Account
      </Link>
      <button
        onClick={signOut}
        className={`${baseLink} text-ink-3 hover:text-accent`}
      >
        Log out
      </button>
    </nav>
  )
}
