/** Extension-side wrapper around the backend extension endpoints. */
import { API_BASE_URL } from '../config'
import { disconnect, getAccessToken, NotAuthenticatedError } from './auth'
import type {
  AnalyzeResponse,
  Category,
  ClothingItemResponse,
  Color,
  ImportItemRequest,
  MatchResponse,
  RawProduct,
} from './types'

async function authedFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })

  if (response.status === 401) {
    await disconnect()
    throw new NotAuthenticatedError('Session expired — please reconnect.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'Request failed' }))
    const detail = (body as { detail?: unknown }).detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((d: { msg?: string }) => d.msg ?? JSON.stringify(d))
              .join('; ')
          : `API error ${response.status}`
    throw new Error(message)
  }

  return (await response.json()) as T
}

export function analyzeProduct(
  raw: RawProduct,
  imageUrl?: string | null,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  return authedFetch<AnalyzeResponse>('/api/extension/analyze-product', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      page_url: raw.url,
      image_url: imageUrl ?? raw.images[0] ?? raw.image,
      title: raw.title,
      price: raw.price,
      brand: raw.brand,
    }),
  })
}

export function importItem(request: ImportItemRequest): Promise<ClothingItemResponse> {
  return authedFetch<ClothingItemResponse>('/api/extension/import-item', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export interface MatchCandidate {
  color: Color
  category: Category
  formality: number
  aesthetics: string[]
}

export function matchProduct(
  candidate: MatchCandidate,
  imageUrl: string | null,
  limit = 4,
): Promise<MatchResponse> {
  return authedFetch<MatchResponse>('/api/extension/match-product', {
    method: 'POST',
    body: JSON.stringify({ candidate, image_url: imageUrl, limit }),
  })
}
