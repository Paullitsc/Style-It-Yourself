/**
 * Content script — the only piece that touches the product page DOM.
 *
 * It stays passive (just registers a message listener) until the popup asks for
 * product context, then runs the layered extractor and replies. The popup will
 * inject this file on demand if it isn't already present (see lib/messaging.ts).
 */
import { extractProduct } from './lib/productExtractor'
import type { ExtractProductResult } from './lib/types'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ((message as { type?: string })?.type !== 'EXTRACT_PRODUCT') return

  let result: ExtractProductResult
  try {
    result = { ok: true, product: extractProduct() }
  } catch (error) {
    result = { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  sendResponse(result)
  // Response is synchronous; no need to return true.
})
