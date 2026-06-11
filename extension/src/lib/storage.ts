/** Thin wrapper around chrome.storage.local for the persisted session. */
import { SESSION_KEY } from '../config'
import type { StoredSession } from './types'

export async function getStoredSession(): Promise<StoredSession | null> {
  const result = await chrome.storage.local.get(SESSION_KEY)
  return (result[SESSION_KEY] as StoredSession | undefined) ?? null
}

export async function setStoredSession(session: StoredSession): Promise<void> {
  await chrome.storage.local.set({ [SESSION_KEY]: session })
}

export async function clearStoredSession(): Promise<void> {
  await chrome.storage.local.remove(SESSION_KEY)
}
