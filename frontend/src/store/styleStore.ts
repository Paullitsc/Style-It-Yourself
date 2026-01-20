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
  ValidateItemResponse,
  ClothingItemResponse
} from '@/types'

// =============================================================================
// TYPES
// =============================================================================

export type StyleStep = 'upload' | 'metadata' | 'colors' | 'build' | 'summary'

export type AddItemStep = 'upload' | 'metadata' | 'colors' | 'validate' | null

// Required categories for a complete outfit
export const REQUIRED_CATEGORIES = ['Tops', 'Bottoms', 'Shoes']
export const OPTIONAL_CATEGORIES = ['Outerwear', 'Accessories']
export const ALL_OUTFIT_CATEGORIES = [...REQUIRED_CATEGORIES, ...OPTIONAL_CATEGORIES]

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

// Try-on result for a category
export interface TryOnResult {
  imageUrl: string
  timestamp: number
}

// State for the item currently being added in the build step
export interface AddingItemState {
  croppedImage: CroppedImage | null
  category: Category | null
  formality: number
  aesthetics: string[]
  ownership: 'owned' | 'wishlist'
  brand: string
  price: string
  sourceUrl: string
  detectedColors: DetectedColor[]
  selectedColorIndex: number
  adjustedColor: Color | null
}

// Outfit item with its image blob (for saving to backend)
export interface OutfitItemWithBlob {
  item: ClothingItemCreate
  imageBlob: Blob
  existingId?: string  // If set, item already exists in closet - don't create duplicate
}

const initialAddingItemState: AddingItemState = {
  croppedImage: null,
  category: null,
  formality: 2,
  aesthetics: [],
  ownership: 'owned',
  brand: '',
  price: '',
  sourceUrl: '',
  detectedColors: [],
  selectedColorIndex: 0,
  adjustedColor: null,
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
  
  // Step 3: Build Outfit
  outfitItems: OutfitItemWithBlob[]           // Items added beyond base (with blobs for upload)
  addingCategory: string | null              // Category being added ('Bottoms', etc.)
  addItemStep: AddItemStep                   // Current step in add item flow
  addingItem: AddingItemState                // Temp state for item being added
  itemValidation: ValidateItemResponse | null // Validation result for adding item
  tryOnResults: Record<string, TryOnResult>  // Try-on images by category L1
  
  // UI State
  error: string | null
  
  // Computed: Final base item (with blob)
  getBaseItem: () => ClothingItemCreate | null
  getBaseItemWithBlob: () => OutfitItemWithBlob | null
  
  // Validation
  isMetadataValid: () => boolean
  isColorValid: () => boolean
  
  // Outfit computed
  getFilledCategories: () => string[]
  isOutfitComplete: () => boolean
  getAllOutfitItems: () => ClothingItemCreate[]
  getAllOutfitItemsWithBlobs: () => OutfitItemWithBlob[]
  getAvailableCategories: () => string[]
  getTryOnForCategory: (categoryL1: string) => TryOnResult | null
  
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
  
  // Build outfit actions
  startAddingItem: (categoryL1: string) => void
  cancelAddingItem: () => void
  setAddItemStep: (step: AddItemStep) => void
  updateAddingItem: (updates: Partial<AddingItemState>) => void
  setAddingItemCroppedImage: (image: CroppedImage | null) => void
  setAddingItemCategory: (l1: string, l2: string) => void
  setAddingItemFormality: (value: number) => void
  toggleAddingItemAesthetic: (tag: string) => void
  setAddingItemOwnership: (value: 'owned' | 'wishlist') => void
  setAddingItemBrand: (value: string) => void
  setAddingItemPrice: (value: string) => void
  setAddingItemSourceUrl: (value: string) => void
  setAddingItemDetectedColors: (colors: DetectedColor[]) => void
  selectAddingItemColor: (index: number) => void
  setAddingItemAdjustedColor: (color: Color) => void
  setItemValidation: (validation: ValidateItemResponse | null) => void
  confirmAddItem: () => void
  removeOutfitItem: (categoryL1: string) => void
  addClosetItemToOutfit: (item: ClothingItemResponse) => void
  
  // Try-on actions
  setTryOnResult: (categoryL1: string, imageUrl: string) => void
  removeTryOnResult: (categoryL1: string) => void
  
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
  // Build outfit state
  outfitItems: [] as OutfitItemWithBlob[],
  addingCategory: null as string | null,
  addItemStep: null as AddItemStep,
  addingItem: { ...initialAddingItemState },
  itemValidation: null as ValidateItemResponse | null,
  tryOnResults: {} as Record<string, TryOnResult>,
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

  getBaseItemWithBlob: (): OutfitItemWithBlob | null => {
    const state = get()
    const baseItem = state.getBaseItem()
    
    if (!baseItem || !state.croppedImage) {
      return null
    }
    
    return {
      item: baseItem,
      imageBlob: state.croppedImage.croppedBlob,
    }
  },

  isMetadataValid: (): boolean => {
    const state = get()
    return state.category !== null && state.category.l1 !== '' && state.category.l2 !== ''
  },

  isColorValid: (): boolean => {
    const state = get()
    return state.adjustedColor !== null
  },

  // Outfit computed getters
  getFilledCategories: (): string[] => {
    const state = get()
    const baseItem = state.category?.l1
    const outfitCategories = state.outfitItems.map(oi => oi.item.category.l1)
    
    const filled: string[] = []
    if (baseItem) filled.push(baseItem)
    filled.push(...outfitCategories)
    
    return [...new Set(filled)] // Remove duplicates
  },

  isOutfitComplete: (): boolean => {
    const filledCategories = get().getFilledCategories()
    return REQUIRED_CATEGORIES.every(cat => filledCategories.includes(cat))
  },

  getAllOutfitItems: (): ClothingItemCreate[] => {
    const state = get()
    const baseItem = state.getBaseItem()
    if (!baseItem) return []
    return [baseItem, ...state.outfitItems.map(oi => oi.item)]
  },

  getAllOutfitItemsWithBlobs: (): OutfitItemWithBlob[] => {
    const state = get()
    const baseItemWithBlob = state.getBaseItemWithBlob()
    if (!baseItemWithBlob) return []
    return [baseItemWithBlob, ...state.outfitItems]
  },

  getAvailableCategories: (): string[] => {
    const filledCategories = get().getFilledCategories()
    return ALL_OUTFIT_CATEGORIES.filter(cat => !filledCategories.includes(cat))
  },

  getTryOnForCategory: (categoryL1: string): TryOnResult | null => {
    return get().tryOnResults[categoryL1] || null
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
    // Reset ALL downstream state when new image is uploaded
    category: null,          
    formality: 2,             
    aesthetics: [],         
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
  // STEP 3: BUILD OUTFIT - Adding Items
  // ---------------------------------------------------------------------------

  startAddingItem: (categoryL1) => {
    set({ 
      addingCategory: categoryL1,
      addItemStep: 'upload',
      addingItem: { 
        ...initialAddingItemState,
        // Pre-select the category L1
        category: { l1: categoryL1, l2: '' },
      },
      itemValidation: null,
    })
  },

  cancelAddingItem: () => {
    // Revoke image URL if exists
    const oldUrl = get().addingItem.croppedImage?.croppedUrl
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl)
    }
    
    set({
      addingCategory: null,
      addItemStep: null,
      addingItem: { ...initialAddingItemState },
      itemValidation: null,
    })
  },

  setAddItemStep: (addItemStep) => set({ addItemStep }),

  updateAddingItem: (updates) => set((state) => ({
    addingItem: { ...state.addingItem, ...updates }
  })),

  setAddingItemCroppedImage: (croppedImage) => {
    // Revoke old URL if exists
    const oldUrl = get().addingItem.croppedImage?.croppedUrl
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl)
    }
    
    set((state) => ({
      addingItem: {
        ...state.addingItem,
        croppedImage,
        detectedColors: [],
        selectedColorIndex: 0,
        adjustedColor: null,
      }
    }))
  },

  setAddingItemCategory: (l1, l2) => set((state) => ({
    addingItem: { ...state.addingItem, category: { l1, l2 } }
  })),

  setAddingItemFormality: (formality) => set((state) => ({
    addingItem: { ...state.addingItem, formality }
  })),

  toggleAddingItemAesthetic: (tag) => set((state) => {
    const aesthetics = state.addingItem.aesthetics
    const exists = aesthetics.includes(tag)
    if (exists) {
      return { addingItem: { ...state.addingItem, aesthetics: aesthetics.filter(t => t !== tag) } }
    }
    if (aesthetics.length >= 3) {
      return state
    }
    return { addingItem: { ...state.addingItem, aesthetics: [...aesthetics, tag] } }
  }),

  setAddingItemOwnership: (ownership) => set((state) => ({
    addingItem: { ...state.addingItem, ownership }
  })),

  setAddingItemBrand: (brand) => set((state) => ({
    addingItem: { ...state.addingItem, brand }
  })),

  setAddingItemPrice: (price) => set((state) => ({
    addingItem: { ...state.addingItem, price }
  })),

  setAddingItemSourceUrl: (sourceUrl) => set((state) => ({
    addingItem: { ...state.addingItem, sourceUrl }
  })),

  setAddingItemDetectedColors: (detectedColors) => set((state) => ({
    addingItem: {
      ...state.addingItem,
      detectedColors,
      selectedColorIndex: 0,
      adjustedColor: detectedColors.length > 0 ? {
        hex: detectedColors[0].hex,
        hsl: detectedColors[0].hsl,
        name: detectedColors[0].name,
        is_neutral: detectedColors[0].isNeutral,
      } : null,
    }
  })),

  selectAddingItemColor: (index) => set((state) => {
    const colors = state.addingItem.detectedColors
    if (index < 0 || index >= colors.length) return state
    
    return {
      addingItem: {
        ...state.addingItem,
        selectedColorIndex: index,
        adjustedColor: {
          hex: colors[index].hex,
          hsl: colors[index].hsl,
          name: colors[index].name,
          is_neutral: colors[index].isNeutral,
        },
      }
    }
  }),

  setAddingItemAdjustedColor: (adjustedColor) => set((state) => ({
    addingItem: { ...state.addingItem, adjustedColor }
  })),

  setItemValidation: (itemValidation) => set({ itemValidation }),

  confirmAddItem: () => {
    const state = get()
    const { addingItem } = state
    
    if (!addingItem.croppedImage || !addingItem.category || !addingItem.adjustedColor) {
      return
    }
    
    const newItem: ClothingItemCreate = {
      image_url: addingItem.croppedImage.croppedUrl,
      color: addingItem.adjustedColor,
      category: addingItem.category,
      formality: addingItem.formality,
      aesthetics: addingItem.aesthetics,
      ownership: addingItem.ownership,
    }
    
    if (addingItem.brand.trim()) {
      newItem.brand = addingItem.brand.trim()
    }
    if (addingItem.price.trim()) {
      const priceNum = parseFloat(addingItem.price)
      if (!isNaN(priceNum) && priceNum >= 0) {
        newItem.price = priceNum
      }
    }
    if (addingItem.sourceUrl.trim()) {
      newItem.source_url = addingItem.sourceUrl.trim()
    }
    
    // Store item with its blob for later upload
    const outfitItemWithBlob: OutfitItemWithBlob = {
      item: newItem,
      imageBlob: addingItem.croppedImage.croppedBlob,
    }
    
    set((s) => ({
      outfitItems: [...s.outfitItems, outfitItemWithBlob],
      addingCategory: null,
      addItemStep: null,
      addingItem: { ...initialAddingItemState },
      itemValidation: null,
    }))
  },

  removeOutfitItem: (categoryL1) => {
    const state = get()
    // Also remove try-on result for this category
    const newTryOnResults = { ...state.tryOnResults }
    if (newTryOnResults[categoryL1]?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(newTryOnResults[categoryL1].imageUrl)
    }
    delete newTryOnResults[categoryL1]
    
    set({
      outfitItems: state.outfitItems.filter(oi => oi.item.category.l1 !== categoryL1),
      tryOnResults: newTryOnResults,
    })
  },

  addClosetItemToOutfit: (item) => {
    const outfitItem: ClothingItemCreate = {
      image_url: item.image_url,
      color: item.color,
      category: item.category,
      formality: item.formality,
      aesthetics: item.aesthetics,
      ownership: item.ownership as 'owned' | 'wishlist',
      brand: item.brand || undefined,
      price: item.price || undefined,
      source_url: item.source_url || undefined,
    }

    // Preserve the existing item ID to avoid creating duplicates
    const existingId = item.id

    fetch(item.image_url)
      .then(res => res.blob())
      .then(blob => {
        set((state) => ({
          outfitItems: [...state.outfitItems, { item: outfitItem, imageBlob: blob, existingId }],
        }))
      })
      .catch(() => {
        const emptyBlob = new Blob([], { type: 'image/jpeg' })
        set((state) => ({
          outfitItems: [...state.outfitItems, { item: outfitItem, imageBlob: emptyBlob, existingId }],
        }))
      })
  },

  // ---------------------------------------------------------------------------
  // TRY-ON RESULTS
  // ---------------------------------------------------------------------------

  setTryOnResult: (categoryL1, imageUrl) => set((state) => {
    // Revoke old URL if it's a blob
    const oldResult = state.tryOnResults[categoryL1]
    if (oldResult?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(oldResult.imageUrl)
    }
    
    return {
      tryOnResults: {
        ...state.tryOnResults,
        [categoryL1]: {
          imageUrl,
          timestamp: Date.now(),
        },
      },
    }
  }),

  removeTryOnResult: (categoryL1) => set((state) => {
    const newResults = { ...state.tryOnResults }
    if (newResults[categoryL1]?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(newResults[categoryL1].imageUrl)
    }
    delete newResults[categoryL1]
    return { tryOnResults: newResults }
  }),

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  setError: (error) => set({ error }),

  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------

  reset: () => {
    // Revoke old URLs if exist
    const state = get()
    
    if (state.croppedImage?.croppedUrl) {
      URL.revokeObjectURL(state.croppedImage.croppedUrl)
    }
    if (state.pendingUpload?.previewUrl) {
      URL.revokeObjectURL(state.pendingUpload.previewUrl)
    }
    if (state.addingItem.croppedImage?.croppedUrl) {
      URL.revokeObjectURL(state.addingItem.croppedImage.croppedUrl)
    }
    // Revoke outfit item URLs
    state.outfitItems.forEach(oi => {
      if (oi.item.image_url?.startsWith('blob:')) {
        URL.revokeObjectURL(oi.item.image_url)
      }
    })
    // Revoke try-on result URLs
    Object.values(state.tryOnResults).forEach(result => {
      if (result.imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(result.imageUrl)
      }
    })
    
    set(initialState)
  },
}))