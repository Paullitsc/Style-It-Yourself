/**
 * Zustand state management
 * Handles: outfit building state, user state, UI state
 */

import { create } from 'zustand'
import type {
  User,
  ClothingItemBase,
  ClothingItemCreate,
  CategoryRecommendation,
  ValidateOutfitResponse,
} from '@/types'


// AUTH STORE
// Manages user authentication state

interface AuthState {
  user: User | null
  isLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // TODO: Initial state
  // - user: null
  // - isLoading: true (checking session on mount)

  // TODO: setUser action
  // - Update user state

  // TODO: setLoading action
  // - Update isLoading state

  // TODO: logout action
  // - Clear user state
  // - Clear any persisted session data

  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null }),
}))


// OUTFIT BUILDER STORE
// Manages the piece-first styling flow

interface OutfitBuilderState {
  // Base item (first item user uploads)
  baseItem: ClothingItemCreate | null
  
  // Items added to outfit (excluding base)
  outfitItems: ClothingItemCreate[]
  
  // Recommendations from API
  recommendations: CategoryRecommendation[]
  
  // Validation result
  validation: ValidateOutfitResponse | null
  
  // Current step in the flow
  currentStep: 'upload' | 'metadata' | 'recommendations' | 'summary'
  
  // Actions
  setBaseItem: (item: ClothingItemCreate | null) => void
  addOutfitItem: (item: ClothingItemCreate) => void
  removeOutfitItem: (index: number) => void
  setRecommendations: (recs: CategoryRecommendation[]) => void
  setValidation: (validation: ValidateOutfitResponse | null) => void
  setCurrentStep: (step: OutfitBuilderState['currentStep']) => void
  reset: () => void
}

export const useOutfitBuilderStore = create<OutfitBuilderState>((set) => ({
  // TODO: Initial state
  // - All null/empty
  // - currentStep: 'upload'

  // TODO: setBaseItem action
  // - Set the base item
  // - Reset outfitItems, recommendations, validation when base changes

  // TODO: addOutfitItem action
  // - Add item to outfitItems array

  // TODO: removeOutfitItem action
  // - Remove item at index from outfitItems array

  // TODO: setRecommendations action
  // - Store recommendations from API

  // TODO: setValidation action
  // - Store validation result from API

  // TODO: setCurrentStep action
  // - Update current step

  // TODO: reset action
  // - Clear all state back to initial

  baseItem: null,
  outfitItems: [],
  recommendations: [],
  validation: null,
  currentStep: 'upload',
  
  setBaseItem: (item) => set({ 
    baseItem: item,
    outfitItems: [],
    recommendations: [],
    validation: null,
  }),
  addOutfitItem: (item) => set((state) => ({ 
    outfitItems: [...state.outfitItems, item] 
  })),
  removeOutfitItem: (index) => set((state) => ({
    outfitItems: state.outfitItems.filter((_, i) => i !== index)
  })),
  setRecommendations: (recommendations) => set({ recommendations }),
  setValidation: (validation) => set({ validation }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  reset: () => set({
    baseItem: null,
    outfitItems: [],
    recommendations: [],
    validation: null,
    currentStep: 'upload',
  }),
}))

// UI STORE
// Manages modals, toasts, loading states

interface UIState {
  // Auth modal
  isAuthModalOpen: boolean
  authModalMode: 'login' | 'signup'
  
  // Global loading
  isLoading: boolean
  loadingMessage: string | null
  
  // Toast notifications
  toast: {
    message: string
    type: 'success' | 'error' | 'info'
  } | null
  
  // Actions
  openAuthModal: (mode?: 'login' | 'signup') => void
  closeAuthModal: () => void
  setLoading: (loading: boolean, message?: string) => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
  hideToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // TODO: Initial state
  // - All modals closed
  // - No loading, no toast

  // TODO: openAuthModal action
  // - Set isAuthModalOpen: true
  // - Set authModalMode (default: 'login')

  // TODO: closeAuthModal action
  // - Set isAuthModalOpen: false

  // TODO: setLoading action
  // - Set isLoading and optional loadingMessage

  // TODO: showToast action
  // - Set toast with message and type
  // - Consider auto-hide after timeout

  // TODO: hideToast action
  // - Clear toast

  isAuthModalOpen: false,
  authModalMode: 'login',
  isLoading: false,
  loadingMessage: null,
  toast: null,
  
  openAuthModal: (mode = 'login') => set({ 
    isAuthModalOpen: true, 
    authModalMode: mode 
  }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setLoading: (isLoading, loadingMessage = undefined) => set({ 
    isLoading, 
    loadingMessage 
  }),
  showToast: (message, type) => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
}))