/** Thin wrapper around chrome.storage.local for the persisted session. */
import { PINNED_EVENT_KEY, PINNED_EVENT_TTL_MS, SESSION_KEY } from '../config'
import type { PinnedEvent, StoredSession } from './types'

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

/** Reads the pinned event, dropping (and clearing) it once past the TTL so a
 * stale intent from a prior shopping trip never silently steers a match. */
export async function getPinnedEvent(): Promise<PinnedEvent | null> {
  const result = await chrome.storage.local.get(PINNED_EVENT_KEY)
  const pin = (result[PINNED_EVENT_KEY] as PinnedEvent | undefined) ?? null
  if (!pin) return null
  if (Date.now() - pin.pinnedAt > PINNED_EVENT_TTL_MS) {
    await clearPinnedEvent()
    return null
  }
  return pin
}

export async function setPinnedEvent(eventId: string): Promise<void> {
  const pin: PinnedEvent = { eventId, pinnedAt: Date.now() }
  await chrome.storage.local.set({ [PINNED_EVENT_KEY]: pin })
}

export async function clearPinnedEvent(): Promise<void> {
  await chrome.storage.local.remove(PINNED_EVENT_KEY)
}
