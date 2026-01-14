/**
 * Zustand store for the styling flow
 * Manages state for: upload → metadata → colors → build
 */

import { create } from 'zustand'
import type { 
  ClothingItemCreate, 
  CategoryRecommendation, 
  Color,
  Category,
} from '@/types'

// =============================================================================
// TYPES
// =============================================================================

export type StyleStep = 'upload' | 'metadata' | 'colors' | 'build'

export interface CroppedImage {
  originalFile: File
  croppedBlob: Blob
  croppedUrl: string  // Object URL for preview
}

export interface DetectedColor {
  hex: string
  name: string
  hsl: { h: number; s: number; l: number }
  isNeutral: boolean
}

export interface PendingUpload {
  file: File
  previewUrl: string
}

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface StyleState {
  // Current step
  currentStep: StyleStep
  
  // Pending upload from home page
  pendingUpload: PendingUpload | null
  
  // Step 1: Upload & Crop
  croppedImage: CroppedImage | null
  
  // Step 2A: Metadata
  category: Category | null
  formality: number
  aesthetics: string[]
  ownership: 'owned' | 'wishlist'
  brand: string
  price: string  // Store as string for input, convert to number when needed
  sourceUrl: string
  
  // Step 2B: Colors
  detectedColors: DetectedColor[]
  selectedColorIndex: number
  adjustedColor: Color | null
  
  // Step 2C: Recommendations
  recommendations: CategoryRecommendation[]
  isLoadingRecommendations: boolean
  
  // UI State
  error: string | null
  
  // Computed: Final base item
  getBaseItem: () => ClothingItemCreate | null
  
  // Validation
  isMetadataValid: () => boolean
  isColorValid: () => boolean
  
  // Actions
  setStep: (step: StyleStep) => void
  setPendingUpload: (file: File | null) => void
  clearPendingUpload: () => void
  setCroppedImage: (image: CroppedImage | null) => void
  setCategory: (l1: string, l2: string) => void
  clearCategory: () => void
  setFormality: (value: number) => void
  toggleAesthetic: (tag: string) => void
  setOwnership: (value: 'owned' | 'wishlist') => void
  setBrand: (value: string) => void
  setPrice: (value: string) => void
  setSourceUrl: (value: string) => void
  setDetectedColors: (colors: DetectedColor[]) => void
  selectColor: (index: number) => void
  setAdjustedColor: (color: Color) => void
  setRecommendations: (recs: CategoryRecommendation[]) => void
  setLoadingRecommendations: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  currentStep: 'upload' as StyleStep,
  pendingUpload: null as PendingUpload | null,
  croppedImage: null,
  category: null,
  formality: 2,
  aesthetics: [] as string[],
  ownership: 'owned' as const,
  brand: '',
  price: '',
  sourceUrl: '',
  detectedColors: [] as DetectedColor[],
  selectedColorIndex: 0,
  adjustedColor: null,
  recommendations: [] as CategoryRecommendation[],
  isLoadingRecommendations: false,
  error: null,
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useStyleStore = create<StyleState>((set, get) => ({
  ...initialState,

  // ---------------------------------------------------------------------------
  // COMPUTED GETTERS
  // ---------------------------------------------------------------------------

  getBaseItem: (): ClothingItemCreate | null => {
    const state = get()
    
    if (!state.croppedImage || !state.category || !state.adjustedColor) {
      return null
    }
    
    const item: ClothingItemCreate = {
      image_url: state.croppedImage.croppedUrl,
      color: state.adjustedColor,
      category: state.category,
      formality: state.formality,
      aesthetics: state.aesthetics,
      ownership: state.ownership,
    }
    
    // Add optional fields if provided
    if (state.brand.trim()) {
      item.brand = state.brand.trim()
    }
    if (state.price.trim()) {
      const priceNum = parseFloat(state.price)
      if (!isNaN(priceNum) && priceNum >= 0) {
        item.price = priceNum
      }
    }
    if (state.sourceUrl.trim()) {
      item.source_url = state.sourceUrl.trim()
    }
    
    return item
  },

  isMetadataValid: (): boolean => {
    const state = get()
    return state.category !== null && state.category.l1 !== '' && state.category.l2 !== ''
  },

  isColorValid: (): boolean => {
    const state = get()
    return state.adjustedColor !== null
  },

  // ---------------------------------------------------------------------------
  // STEP NAVIGATION
  // ---------------------------------------------------------------------------

  setStep: (step) => set({ currentStep: step, error: null }),

  // ---------------------------------------------------------------------------
  // PENDING UPLOAD (from home page)
  // ---------------------------------------------------------------------------

  setPendingUpload: (file) => {
    // Revoke old URL if exists
    const oldUrl = get().pendingUpload?.previewUrl
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl)
    }
    
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      set({ pendingUpload: { file, previewUrl } })
    } else {
      set({ pendingUpload: null })
    }
  },

  clearPendingUpload: () => {
    const oldUrl = get().pendingUpload?.previewUrl
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl)
    }
    set({ pendingUpload: null })
  },

  // ---------------------------------------------------------------------------
  // STEP 1: IMAGE
  // ---------------------------------------------------------------------------

  setCroppedImage: (croppedImage) => {
    // Revoke old URL if exists
    const oldUrl = get().croppedImage?.croppedUrl
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl)
    }
    
    set({ 
      croppedImage,
      // Reset downstream state when new image is uploaded
      detectedColors: [],
      selectedColorIndex: 0,
      adjustedColor: null,
      recommendations: [],
    })
  },

  // ---------------------------------------------------------------------------
  // STEP 2A: METADATA
  // ---------------------------------------------------------------------------

  setCategory: (l1, l2) => set({ 
    category: { l1, l2 } 
  }),
  
  clearCategory: () => set({ category: null }),
  
  setFormality: (formality) => set({ formality }),
  
  toggleAesthetic: (tag) => set((state) => {
    const exists = state.aesthetics.includes(tag)
    if (exists) {
      return { aesthetics: state.aesthetics.filter((t) => t !== tag) }
    }
    if (state.aesthetics.length >= 3) {
      return state // Max 3 aesthetics
    }
    return { aesthetics: [...state.aesthetics, tag] }
  }),
  
  setOwnership: (ownership) => set({ ownership }),
  
  setBrand: (brand) => set({ brand }),
  
  setPrice: (price) => set({ price }),
  
  setSourceUrl: (sourceUrl) => set({ sourceUrl }),

  // ---------------------------------------------------------------------------
  // STEP 2B: COLORS
  // ---------------------------------------------------------------------------

  setDetectedColors: (detectedColors) => set({ 
    detectedColors,
    selectedColorIndex: 0,
    // Auto-set adjusted color to first detected color
    adjustedColor: detectedColors.length > 0 ? {
      hex: detectedColors[0].hex,
      hsl: detectedColors[0].hsl,
      name: detectedColors[0].name,
      is_neutral: detectedColors[0].isNeutral,
    } : null,
  }),
  
  selectColor: (index) => {
    const colors = get().detectedColors
    if (index >= 0 && index < colors.length) {
      set({ 
        selectedColorIndex: index,
        adjustedColor: {
          hex: colors[index].hex,
          hsl: colors[index].hsl,
          name: colors[index].name,
          is_neutral: colors[index].isNeutral,
        },
      })
    }
  },
  
  setAdjustedColor: (adjustedColor) => set({ adjustedColor }),

  // ---------------------------------------------------------------------------
  // STEP 2C: RECOMMENDATIONS
  // ---------------------------------------------------------------------------

  setRecommendations: (recommendations) => set({ recommendations }),
  
  setLoadingRecommendations: (isLoadingRecommendations) => set({ isLoadingRecommendations }),

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  setError: (error) => set({ error }),

  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------

  reset: () => {
    // Revoke old URLs if exist
    const oldCroppedUrl = get().croppedImage?.croppedUrl
    if (oldCroppedUrl) {
      URL.revokeObjectURL(oldCroppedUrl)
    }
    const oldPendingUrl = get().pendingUpload?.previewUrl
    if (oldPendingUrl) {
      URL.revokeObjectURL(oldPendingUrl)
    }
    
    set(initialState)
  },
}))