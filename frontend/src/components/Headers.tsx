'use client'
import { useState } from 'react'
import NavBar from './NavBar'
import AuthModal from './AuthModal'
import Link from 'next/link'

export default function Header() {
  const [isAuthModalOpen, setAuthModalOpen] = useState(false)

  return (
    <>
      <header className="fixed top-0 w-full bg-primary-900 z-50 border-b border-primary-800">
        {/* CHANGES:
          1. Removed 'max-w-[1920px]' and 'mx-auto'
             -> This stops it from centering and limiting width.
          2. Added 'w-full'
             -> Forces it to span the entire browser width always.
          3. Increased padding to 'px-8 md:px-12' 
             -> Gives it that luxurious "breathing room" from the edge.
        */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full px-8 md:px-12 py-4 md:h-20">
          
          {/* LOGO SECTION - Sticks to Left */}
          <div className="mb-4 md:mb-0">
            <Link href="/" className="group block">
              <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-white leading-none select-none">
                SIY
              </h1>
            </Link>
          </div>

          {/* NAV SECTION - Sticks to Right */}
          <NavBar onOpenAuth={() => setAuthModalOpen(true)} />
          
        </div>
      </header>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}