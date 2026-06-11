/**
 * Background service worker.
 *
 * Primary job: the auth handoff. The web app's /extension/connect page calls
 * `chrome.runtime.sendMessage(extensionId, { type: 'SIY_CONNECT', session })`.
 * We verify the sender is our web app origin, normalize the Supabase session,
 * and persist it. The popup then reads it from chrome.storage.local.
 */
import { WEB_APP_URL } from './config'
import { setStoredSession } from './lib/storage'
import type { StoredSession } from './lib/types'

interface SupabaseSessionLike {
  access_token?: string
  refresh_token?: string
  expires_at?: number
  expires_in?: number
  user?: { id?: string; email?: string | null }
}

function toStoredSession(raw: unknown): StoredSession | null {
  const session = raw as SupabaseSessionLike | null
  if (!session?.access_token || !session?.refresh_token) return null
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at:
      session.expires_at ??
      Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    user: {
      id: session.user?.id ?? '',
      email: session.user?.email ?? null,
    },
  }
}

function senderAllowed(sender: chrome.runtime.MessageSender): boolean {
  const origin = sender.origin ?? (sender.url ? safeOrigin(sender.url) : '')
  return !!origin && origin === WEB_APP_URL
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if ((message as { type?: string })?.type !== 'SIY_CONNECT') {
    sendResponse({ ok: false, error: 'Unknown message.' })
    return
  }

  if (!senderAllowed(sender)) {
    sendResponse({ ok: false, error: 'Origin not allowed.' })
    return
  }

  const stored = toStoredSession((message as { session?: unknown }).session)
  if (!stored) {
    sendResponse({ ok: false, error: 'Invalid session payload.' })
    return
  }

  setStoredSession(stored)
    .then(() => sendResponse({ ok: true }))
    .catch((error) =>
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
    )
  return true // async sendResponse
})
