'use client'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { usePathname } from 'next/navigation' // 1. Import hook

interface NavBarProps {
  onOpenAuth: () => void
}

export default function NavBar({ onOpenAuth }: NavBarProps) {
  const { user, signOut } = useAuth()
  const pathname = usePathname() // 2. Get current path

  // 3. Helper to determine if a link is active
  const getLinkClass = (path: string) => {
    // Base styles (always present)
    const baseStyle = "transition-all duration-200"
    
    // Active State (Current Page): White + Underlined
    const activeStyle = "text-white underline underline-offset-4 decoration-1"
    
    // Inactive State: Grey + Hover effects
    const inactiveStyle = "text-neutral-400 hover:text-white hover:underline hover:underline-offset-4 hover:decoration-1"

    return pathname === path ? `${baseStyle} ${activeStyle}` : `${baseStyle} ${inactiveStyle}`
  }

  return (
    <nav className="flex items-center gap-6 text-xs md:text-sm font-medium tracking-widest uppercase">
      
      {/* HOME */}
      <Link href="/" className={getLinkClass('/')}>
        Home
      </Link>

      {user ? (
        <>
          {/* MY CLOSET */}
          <Link href="/closet" className={getLinkClass('/closet')}>
            My Closet
          </Link>
          
          {/* ACCOUNT */}
          <Link href="/account" className={getLinkClass('/account')}>
            Account
          </Link>
          
          {/* LOGOUT (Action, not a page, so keeps default styling) */}
          <button 
            onClick={signOut} 
            className="text-primary-600 hover:text-error-500 hover:underline underline-offset-4 decoration-1 transition-all"
          >
            LOGOUT
          </button>
        </>
      ) : (
        /* LOGIN (Action) */
        <button 
          onClick={onOpenAuth}
          className="text-neutral-400 hover:text-white hover:underline hover:underline-offset-4 hover:decoration-1 transition-all"
        >
          LOGIN
        </button>
      )}
    </nav>
  )
}