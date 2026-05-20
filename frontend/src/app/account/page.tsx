'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const formatDate = (value: string | undefined) => {
    if (!value) return null
    try {
      return new Date(value).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  const memberSince = formatDate(user?.created_at)
  const lastSignIn = formatDate(user?.last_sign_in_at)

  return (
    <ProtectedRoute>
      <div className="flex-1">
        <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 pt-10 pb-24">
          {/* HEAD */}
          <section className="border-b border-ink pb-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
              Account
            </p>
            <h1 className="m-0 font-display font-normal uppercase text-[clamp(72px,9vw,128px)] leading-[0.92] tracking-[-0.025em]">
              Your <em className="italic text-ink-3">account,</em>
              <br />
              in brief.
            </h1>
            <p className="mt-[18px] max-w-[40ch] font-display italic text-[20px] leading-[1.35] text-ink-2">
              The basics on file. Nothing fancy — sign out below when
              you&apos;re done.
            </p>
          </section>

          {/* METADATA */}
          <section className="grid grid-cols-[260px_1fr] max-md:grid-cols-1 gap-y-7 gap-x-10 pt-10">
            <MetaRow label="Email">
              <span className="font-display text-[24px] leading-none break-all">
                {user?.email ?? '—'}
              </span>
            </MetaRow>

            {memberSince && (
              <MetaRow label="Member since">
                <span className="font-display text-[24px] leading-none">
                  {memberSince}
                </span>
              </MetaRow>
            )}

            {lastSignIn && (
              <MetaRow label="Last sign-in">
                <span className="font-display text-[24px] leading-none">
                  {lastSignIn}
                </span>
              </MetaRow>
            )}

            {user?.id && (
              <MetaRow label="User ID">
                <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-3 break-all">
                  {user.id}
                </span>
              </MetaRow>
            )}
          </section>

          {/* SIGN OUT */}
          <section className="border-t border-ink mt-12 pt-7">
            <button
              type="button"
              onClick={handleSignOut}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent pb-[2px] border-b border-transparent hover:border-accent transition-colors"
            >
              Sign out
            </button>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  )
}

interface MetaRowProps {
  label: string
  children: ReactNode
}

function MetaRow({ label, children }: MetaRowProps) {
  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 pt-2">
        {label}
      </div>
      <div>{children}</div>
    </>
  )
}
