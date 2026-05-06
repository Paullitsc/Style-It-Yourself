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

  const baseLink = 'font-mono text-[11px] uppercase tracking-[0.08em] transition-colors'
  const activeLink = 'text-ink border-b border-ink pb-[2px]'
  const inactiveLink = 'text-ink-3 hover:text-ink'

  const linkClass = (path: string) =>
    `${baseLink} ${pathname === path ? activeLink : inactiveLink}`

  return (
    <nav className="flex items-center gap-[32px]">
      <Link href="/" className={linkClass('/')}>
        Home
      </Link>

      {user ? (
        <>
          <Link href="/closet" className={linkClass('/closet')}>
            My Closet
          </Link>

          <Link href="/account" className={linkClass('/account')}>
            Account
          </Link>

          <button
            onClick={signOut}
            className={`${baseLink} text-ink-3 hover:text-accent`}
          >
            Logout
          </button>
        </>
      ) : (
        <button
          onClick={onOpenAuth}
          className={`${baseLink} ${inactiveLink}`}
        >
          Login
        </button>
      )}
    </nav>
  )
}
