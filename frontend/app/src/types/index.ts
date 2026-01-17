/**
 * TypeScript type definitions
 * Mirrors backend Pydantic schemas
 */

// SHARED / BASE TYPES

export interface HSL {
    h: number  // 0-360
    s: number  // 0-100
    l: number  // 0-100
  }
  
  export interface Color {
    hex: string        // e.g., "#1e3a5f"
    hsl: HSL
    name: string       // e.g., "navy", "beige"
    is_neutral: boolean
  }
  
  export interface Category {
    l1: string  // e.g., "Tops", "Bottoms"
    l2: string  // e.g., "T-Shirts", "Jeans"
  }
  
  export interface ClothingItemBase {
    color: Color
    category: Category
    formality: number  // 1-5
    aesthetics: string[]
  }
  
  export interface ClothingItemCreate extends ClothingItemBase {
    image_url: string
    brand?: string
    price?: number
    source_url?: string
    ownership?: 'owned' | 'wishlist'
  }
  
  export interface ClothingItemResponse extends ClothingItemCreate {
    id: string
    user_id?: string
    created_at: string
  }
  
  
  // POST /api/recommendations
  
  export interface RecommendationRequest {
    base_color: Color
    base_formality: number
    base_aesthetics: string[]
    base_category: Category
  }
  
  export interface RecommendedColor {
    hex: string
    name: string
    harmony_type: 'analogous' | 'complementary' | 'neutral'
  }
  
  export interface FormalityRange {
    min: number
    max: number
  }
  
  export interface CategoryRecommendation {
    category_l1: string
    colors: RecommendedColor[]
    formality_range: FormalityRange
    aesthetics: string[]
    suggested_l2: string[]
    example: string
  }
  
  export interface RecommendationResponse {
    recommendations: CategoryRecommendation[]
  }
  
  
  // POST /api/validate-item
  
  export interface ValidateItemRequest {
    new_item: ClothingItemBase
    base_item: ClothingItemBase
    current_outfit: ClothingItemBase[]
  }
  
  export interface ValidateItemResponse {
    color_status: 'ok' | 'warning'
    formality_status: 'ok' | 'warning' | 'mismatch'
    aesthetic_status: 'cohesive' | 'warning'
    pairing_status: 'ok' | 'warning'
    warnings: string[]
  }
  
  
  // POST /api/validate-outfit
  
  export interface ValidateOutfitRequest {
    outfit: ClothingItemBase[]
    base_item: ClothingItemBase
  }
  
  export interface ValidateOutfitResponse {
    is_complete: boolean
    cohesion_score: number  // 0-100
    verdict: string
    warnings: string[]
    color_strip: string[]  // hex codes
  }
  
  
  // POST /api/outfits & GET /api/outfits/{id}
  
  export interface OutfitCreate {
    name: string
    items: ClothingItemCreate[]
  }
  
  export interface OutfitResponse {
    id: string
    name: string
    items: ClothingItemResponse[]
    generated_image_url?: string
    created_at: string
  }
  
  export interface OutfitSummary {
    id: string
    name: string
    thumbnail_urls: string[]
    created_at: string
  }
  
  
  // GET /api/closet
  
  export interface ClosetResponse {
    outfits: OutfitSummary[]
    items: ClothingItemResponse[]
    generated_images: GeneratedImage[]
  }
  
  export interface GeneratedImage {
    outfit_id: string
    outfit_name: string
    image_url: string
  }
  
  
  // POST /api/try-on
  
  export interface TryOnSingleRequest {
    user_photo_url: string
    item: ClothingItemCreate
  }
  
  export interface TryOnOutfitRequest {
    user_photo_url: string
    outfit: OutfitCreate
  }
  
  export interface TryOnResponse {
    success: boolean
    generated_image_url?: string
    error?: string
  }
  
  
  // AUTH / USER
  
  export interface User {
    id: string
    email: string
    name?: string
    avatar_url?: string
  }
  
  
  // CONSTANTS (mirror backend)
  
  export const CATEGORY_TAXONOMY: Record<string, string[]> = {
    "Tops": ["T-Shirts", "Polos", "Casual Shirts", "Dress Shirts", "Sweaters", "Hoodies", "Blazers"],
    "Bottoms": ["Jeans", "Chinos", "Dress Pants", "Shorts", "Joggers", "Skirts"],
    "Shoes": ["Sneakers", "Loafers", "Oxfords", "Boots", "Sandals", "Heels"],
    "Accessories": ["Watches", "Belts", "Bags", "Hats", "Scarves", "Jewelry", "Sunglasses"],
    "Outerwear": ["Jackets", "Coats", "Vests"],
    "Full Body": ["Dresses", "Suits"],
  }
  
  export const FORMALITY_LEVELS: Record<number, string> = {
    1: "Casual",
    2: "Smart Casual",
    3: "Business Casual",
    4: "Formal",
    5: "Black Tie",
  }
  
  export const AESTHETIC_TAGS: string[] = [
    "Minimalist",
    "Streetwear",
    "Classic",
    "Preppy",
    "Bohemian",
    "Athleisure",
    "Vintage",
    "Edgy",
  ]