/**
 * API client for SIY backend
 */

import type {
  RecommendationRequest,
  RecommendationResponse,
  ValidateItemRequest,
  ValidateItemResponse,
  ValidateOutfitRequest,
  ValidateOutfitResponse,
  TryOnSingleRequest,
  TryOnOutfitRequest,
  TryOnResponse,
  ClosetResponse,
  OutfitCreate,
  OutfitResponse,
  ClothingItemCreate,
  ClothingItemResponse,
} from '@/types'

// =============================================================================
// CONFIG
// =============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// =============================================================================
// HELPERS
// =============================================================================

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `API error: ${response.status}`)
  }
  
  return response.json()
}

async function fetchApiWithAuth<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  return fetchApi<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  })
}

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

/**
 * Get outfit recommendations based on a base item
 */
export async function getRecommendations(
  request: RecommendationRequest
): Promise<RecommendationResponse> {
  return fetchApi<RecommendationResponse>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a new item against existing outfit
 */
export async function validateItem(
  request: ValidateItemRequest
): Promise<ValidateItemResponse> {
  return fetchApi<ValidateItemResponse>('/api/validate-item', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * Validate a complete outfit
 */
export async function validateOutfit(
  request: ValidateOutfitRequest
): Promise<ValidateOutfitResponse> {
  return fetchApi<ValidateOutfitResponse>('/api/validate-outfit', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// =============================================================================
// TRY-ON (Auth Required)
// =============================================================================

/**
 * Generate AI try-on for a single item
 */
export async function tryOnSingle(
  request: TryOnSingleRequest,
  token: string
): Promise<TryOnResponse> {
  return fetchApiWithAuth<TryOnResponse>('/api/try-on/single', token, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * Generate AI try-on for a full outfit
 */
export async function tryOnOutfit(
  request: TryOnOutfitRequest,
  token: string
): Promise<TryOnResponse> {
  return fetchApiWithAuth<TryOnResponse>('/api/try-on/outfit', token, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// =============================================================================
// CLOSET (Auth Required)
// =============================================================================

/**
 * Get user's complete closet
 */
export async function getCloset(token: string): Promise<ClosetResponse> {
  return fetchApiWithAuth<ClosetResponse>('/api/closet', token, {
    method: 'GET',
  })
}

// =============================================================================
// OUTFITS (Auth Required)
// =============================================================================

/**
 * Save a new outfit
 */
export async function createOutfit(
  outfit: OutfitCreate,
  token: string
): Promise<OutfitResponse> {
  return fetchApiWithAuth<OutfitResponse>('/api/outfits', token, {
    method: 'POST',
    body: JSON.stringify(outfit),
  })
}

/**
 * Get a single outfit by ID
 */
export async function getOutfit(
  outfitId: string,
  token: string
): Promise<OutfitResponse> {
  return fetchApiWithAuth<OutfitResponse>(`/api/outfits/${outfitId}`, token, {
    method: 'GET',
  })
}

// =============================================================================
// CLOTHING ITEMS (Auth Required)
// =============================================================================

/**
 * Add a clothing item to closet
 */
export async function createClothingItem(
  item: ClothingItemCreate,
  imageFile: File,
  token: string
): Promise<ClothingItemResponse> {
  const formData = new FormData()
  formData.append('image', imageFile)
  formData.append('data', JSON.stringify(item))
  
  const response = await fetch(`${API_BASE_URL}/api/clothing-items`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `API error: ${response.status}`)
  }
  
  return response.json()
}