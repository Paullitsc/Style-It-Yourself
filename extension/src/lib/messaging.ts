/**
 * Pull product context from the active tab.
 *
 * The content script is declared for all http(s) pages, but a freshly-installed
 * extension won't have it on already-open tabs — so if messaging fails we inject
 * it on demand via chrome.scripting and retry once.
 */
import type { ExtractProductResult, RawProduct } from './types'

const BLOCKED_URL = /^(chrome|edge|brave|about|view-source|chrome-extension):/i
const WEBSTORE = /^https:\/\/chrome\.google\.com\/webstore/i

export async function getActiveTabProduct(): Promise<RawProduct> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error('No active tab found.')

  const url = tab.url ?? ''
  if (BLOCKED_URL.test(url) || WEBSTORE.test(url)) {
    throw new Error('This page can’t be read. Open a product page first.')
  }

  const ask = () =>
    chrome.tabs.sendMessage<unknown, ExtractProductResult>(tab.id!, {
      type: 'EXTRACT_PRODUCT',
    })

  let result: ExtractProductResult
  try {
    result = await ask()
  } catch {
    // Content script not present yet — inject and retry.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js'],
    })
    result = await ask()
  }

  if (!result?.ok || !result.product) {
    throw new Error(result?.error || 'Could not read product details.')
  }
  return result.product
}
