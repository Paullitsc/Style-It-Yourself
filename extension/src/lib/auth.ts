/**
 * Auth helpers. The web app hands the extension a full Supabase session (via
 * background.ts onMessageExternal). Here we read it, transparently refresh the
 * access token when it nears expiry, and surface a typed error when the user
 * needs to reconnect.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config'
import { clearStoredSession, getStoredSession, setStoredSession } from './storage'
import type { StoredSession } from './types'

export class NotAuthenticatedError extends Error {
  constructor(message = 'Not connected to Style It Yourself.') {
    super(message)
    this.name = 'NotAuthenticatedError'
  }
}

/** 60s safety margin so a token isn't used in the second before it expires. */
const EXPIRY_SKEW_SECONDS = 60

export async function isConnected(): Promise<boolean> {
  return (await getStoredSession()) !== null
}

export async function getStoredUser(): Promise<StoredSession['user'] | null> {
  const session = await getStoredSession()
  return session?.user ?? null
}

function isExpired(session: StoredSession): boolean {
  if (!session.expires_at) return true
  const now = Math.floor(Date.now() / 1000)
  return now >= session.expires_at - EXPIRY_SKEW_SECONDS
}

/** Return a valid access token, refreshing if needed. Throws if reconnect required. */
export async function getAccessToken(): Promise<string> {
  let session = await getStoredSession()
  if (!session) throw new NotAuthenticatedError()
  if (isExpired(session)) {
    session = await refreshSession(session)
  }
  return session.access_token
}

async function refreshSession(session: StoredSession): Promise<StoredSession> {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    },
  )

  if (!response.ok) {
    await clearStoredSession()
    throw new NotAuthenticatedError('Session expired — please reconnect.')
  }

  const data = await response.json()
  const refreshed: StoredSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? session.refresh_token,
    expires_at:
      data.expires_at ??
      Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    user: session.user,
  }
  await setStoredSession(refreshed)
  return refreshed
}

export async function disconnect(): Promise<void> {
  await clearStoredSession()
}
