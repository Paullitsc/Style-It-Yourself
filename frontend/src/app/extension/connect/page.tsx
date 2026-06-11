'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import AuthModal from '@/components/AuthModal'

type HandoffStatus =
  | 'idle' // waiting on session / extId
  | 'no-ext-id' // page opened without an extId param
  | 'signed-out' // user must log in first
  | 'sending' // posting the session to the extension
  | 'done' // extension acknowledged
  | 'no-extension' // chrome.runtime not available (extension not installed)
  | 'error'

interface ChromeRuntimeLike {
  runtime?: {
    sendMessage?: (
      extensionId: string,
      message: unknown,
      callback: (response?: { ok?: boolean; error?: string }) => void,
    ) => void
    lastError?: { message?: string }
  }
}

function getChromeRuntime(): ChromeRuntimeLike['runtime'] | undefined {
  return (window as unknown as { chrome?: ChromeRuntimeLike }).chrome?.runtime
}

function ConnectFlow() {
  const { session } = useAuth()
  const searchParams = useSearchParams()
  const extId = searchParams.get('extId')

  const [status, setStatus] = useState<HandoffStatus>('idle')
  const [authOpen, setAuthOpen] = useState(false)

  // The state updates live in this callback (not the effect body) so we don't
  // trip react-hooks/set-state-in-effect, and it doubles as the retry handler.
  const performHandoff = useCallback(() => {
    if (!extId) {
      setStatus('no-ext-id')
      return
    }
    if (!session) {
      setStatus('signed-out')
      return
    }

    const runtime = getChromeRuntime()
    if (!runtime?.sendMessage) {
      setStatus('no-extension')
      return
    }

    setStatus('sending')
    try {
      runtime.sendMessage(extId, { type: 'SIY_CONNECT', session }, (response) => {
        const lastError = getChromeRuntime()?.lastError
        setStatus(lastError || !response?.ok ? 'error' : 'done')
      })
    } catch {
      setStatus('error')
    }
  }, [extId, session])

  // Run on mount and whenever the session arrives/changes (e.g. after login).
  // Deferred to a microtask so the status updates happen outside the synchronous
  // effect body (the handoff is a side effect, not render-derived state).
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) performHandoff()
    })
    return () => {
      active = false
    }
  }, [performHandoff])

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-[520px] border border-ink bg-paper p-10 max-md:p-7">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          Browser extension
        </span>
        <h1 className="mt-3 font-display text-[clamp(34px,5vw,52px)] leading-[0.98] tracking-[-0.02em]">
          Connect the <em className="italic text-ink-3">extension</em>.
        </h1>

        <hr className="my-7 border-t border-ink" />

        <StatusBody
          status={status}
          onLogin={() => setAuthOpen(true)}
          onRetry={performHandoff}
        />
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

function StatusBody({
  status,
  onLogin,
  onRetry,
}: {
  status: HandoffStatus
  onLogin: () => void
  onRetry: () => void
}) {
  switch (status) {
    case 'sending':
    case 'idle':
      return <Line>Connecting your account to the extension…</Line>

    case 'done':
      return (
        <div className="space-y-4">
          <p className="font-display text-[22px] leading-snug">
            You’re <em className="italic text-ink-3">connected</em>.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
            You can close this tab and reopen the extension. It will now add and
            match pieces against your closet.
          </p>
        </div>
      )

    case 'signed-out':
      return (
        <div className="space-y-5">
          <p className="font-display text-[20px] leading-snug text-ink-2">
            Sign in to hand the extension a secure session.
          </p>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex items-center justify-between gap-6 px-[22px] py-[16px] border border-ink bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.12em] hover:bg-paper hover:text-ink transition-colors"
          >
            <span>Log in to continue</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )

    case 'no-ext-id':
      return (
        <Note>
          Open this page from the extension’s{' '}
          <em className="italic">Connect Style It Yourself</em> button so it can
          identify itself.
        </Note>
      )

    case 'no-extension':
      return (
        <Note>
          We couldn’t detect the extension. Make sure it’s installed and enabled,
          then reopen this page from its Connect button.
        </Note>
      )

    case 'error':
      return (
        <div className="space-y-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
            Couldn’t reach the extension.
          </p>
          <p className="font-display text-[18px] text-ink-2 leading-snug">
            Make sure it’s installed, then try again.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="font-mono text-[11px] uppercase tracking-[0.12em] border border-ink px-[22px] py-[16px] bg-paper text-ink hover:bg-ink hover:text-paper transition-colors"
          >
            Try again
          </button>
        </div>
      )
  }
}

function Line({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display italic text-[20px] text-ink-2 leading-snug">
      {children}
    </p>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[18px] text-ink-2 leading-snug">{children}</p>
  )
}

export default function ExtensionConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center px-6 py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
            Loading…
          </p>
        </div>
      }
    >
      <ConnectFlow />
    </Suspense>
  )
}
