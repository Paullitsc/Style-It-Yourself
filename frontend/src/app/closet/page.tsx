'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getCloset } from '@/lib/api'
import type { ClosetResponse, ClothingItemResponse, OutfitSummary } from '@/types'
import { CATEGORY_TAXONOMY } from '@/types'
import { Shirt, Package, AlertCircle } from 'lucide-react'
import ItemDetailModal from './components/ItemDetailModal'
import OutfitDetailModal from './components/OutfitDetailModal'

type ViewMode = 'items' | 'outfits'

// Category display order
const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories', 'Full Body']

export default function ClosetPage() {
  const { session } = useAuth()
  const [activeView, setActiveView] = useState<ViewMode>('items')
  const [closetData, setClosetData] = useState<ClosetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState<ClothingItemResponse | null>(null)
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitSummary | null>(null)

  const fetchCloset = async () => {
    if (!session?.access_token) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getCloset(session.access_token)
      setClosetData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load closet')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCloset()
  }, [session?.access_token])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // Get sorted categories
  const getSortedCategories = () => {
    if (!closetData?.items_by_category) return []
    
    const categories = Object.keys(closetData.items_by_category)
    return CATEGORY_ORDER.filter(cat => categories.includes(cat))
      .concat(categories.filter(cat => !CATEGORY_ORDER.includes(cat)).sort())
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-80px)] w-full max-w-[1920px] mx-auto px-6 md:px-12 py-12">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-primary-800 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter text-white mb-2">
              My Closet
            </h1>
            {closetData && (
              <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">
                {closetData.total_items} Items • {closetData.total_outfits} Outfits
              </p>
            )}
          </div>

          {/* VIEW TOGGLE */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('items')}
              className={`px-6 py-3 border text-xs font-bold uppercase tracking-wider transition-colors ${
                activeView === 'items'
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-neutral-500 border-primary-700 hover:text-white hover:border-primary-500'
              }`}
            >
              Items {closetData && `(${closetData.total_items})`}
            </button>
            <button
              onClick={() => setActiveView('outfits')}
              className={`px-6 py-3 border text-xs font-bold uppercase tracking-wider transition-colors ${
                activeView === 'outfits'
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-neutral-500 border-primary-700 hover:text-white hover:border-primary-500'
              }`}
            >
              Outfits {closetData && `(${closetData.total_outfits})`}
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-[500px] gap-4">
            <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full" />
            <p className="text-neutral-500 text-sm uppercase tracking-wide">Loading closet...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-[500px] gap-6 text-center">
            <div className="bg-primary-800 p-6 rounded-full">
              <AlertCircle size={48} className="text-error-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
                Failed to Load Closet
              </h3>
              <p className="text-neutral-500 text-sm mb-6">{error}</p>
              <button
                onClick={fetchCloset}
                className="px-6 py-3 bg-accent-500 text-primary-900 hover:bg-accent-400 
                  text-xs font-bold uppercase tracking-widest transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {!isLoading && !error && closetData && (
          <>
            {/* ITEMS VIEW */}
            {activeView === 'items' && (
              <>
                {closetData.total_items === 0 ? (
                  // Empty state
                  <div className="w-full h-[500px] border border-dashed border-primary-700 bg-primary-800/20 rounded-lg 
                    flex flex-col items-center justify-center text-center">
                    <div className="bg-primary-800 p-6 rounded-full mb-6 text-neutral-500">
                      <Shirt size={48} strokeWidth={1} />
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
                      Your closet is empty
                    </h3>
                    <p className="text-neutral-500 text-xs uppercase tracking-wide max-w-xs mx-auto">
                      Start building outfits to add items to your closet
                    </p>
                  </div>
                ) : (
                  // Items grid by category
                  <div className="space-y-12">
                    {getSortedCategories().map((categoryL1) => {
                      const items = closetData.items_by_category[categoryL1] || []
                      if (items.length === 0) return null
                      
                      return (
                        <div key={categoryL1}>
                          {/* Category header */}
                          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
                            {categoryL1} ({items.length})
                          </h2>
                          
                          {/* Items grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="bg-primary-800 rounded-lg border border-primary-700 overflow-hidden 
                                  transition-all hover:border-primary-600 cursor-pointer hover:scale-[1.02]"
                              >
                                {/* Image */}
                                <div className="aspect-[3/4] relative bg-primary-900">
                                  {item.image_url ? (
                                    <img
                                      src={item.image_url}
                                      alt={item.category.l2}
                                      className="w-full h-full object-contain p-3"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Shirt size={32} className="text-neutral-600" />
                                    </div>
                                  )}
                                  
                                  {/* Color dot */}
                                  {item.color?.hex && (
                                    <div
                                      className="absolute bottom-2 left-2 w-5 h-5 rounded-full border-2 border-primary-900 shadow-md"
                                      style={{ backgroundColor: item.color.hex }}
                                    />
                                  )}
                                </div>
                                
                                {/* Details */}
                                <div className="p-3 border-t border-primary-700">
                                  <p className="text-xs font-medium text-white truncate">
                                    {item.category.l2}
                                  </p>
                                  <p className="text-[10px] text-neutral-500 uppercase truncate mt-0.5">
                                    {item.category.l1}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* OUTFITS VIEW */}
            {activeView === 'outfits' && (
              <>
                {closetData.total_outfits === 0 ? (
                  // Empty state
                  <div className="w-full h-[500px] border border-dashed border-primary-700 bg-primary-800/20 rounded-lg 
                    flex flex-col items-center justify-center text-center">
                    <div className="bg-primary-800 p-6 rounded-full mb-6 text-neutral-500">
                      <Package size={48} strokeWidth={1} />
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
                      No saved outfits yet
                    </h3>
                    <p className="text-neutral-500 text-xs uppercase tracking-wide max-w-xs mx-auto">
                      Build your first outfit to save it here
                    </p>
                  </div>
                ) : (
                  // Outfits grid
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {closetData.outfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        onClick={() => setSelectedOutfit(outfit)}
                        className="bg-primary-800 rounded-lg border border-primary-700 overflow-hidden 
                          transition-all hover:border-primary-600 cursor-pointer hover:scale-[1.02]"
                      >
                        {/* Thumbnail */}
                        <div className="aspect-[3/4] relative bg-primary-900">
                          {outfit.thumbnail_url ? (
                            <img
                              src={outfit.thumbnail_url}
                              alt={outfit.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={32} className="text-neutral-600" />
                            </div>
                          )}
                          
                          {/* Item count badge */}
                          <div className="absolute top-2 right-2 px-2 py-1 bg-primary-900/90 border border-primary-700 
                            rounded text-[10px] font-bold uppercase tracking-wide text-white">
                            {outfit.item_count} {outfit.item_count === 1 ? 'item' : 'items'}
                          </div>
                        </div>
                        
                        {/* Details */}
                        <div className="p-3 border-t border-primary-700">
                          <p className="text-xs font-medium text-white truncate mb-1">
                            {outfit.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 uppercase">
                            {formatDate(outfit.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Item Detail Modal */}
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}

        {/* Outfit Detail Modal */}
        {selectedOutfit && session?.access_token && (
          <OutfitDetailModal
            outfit={selectedOutfit}
            token={session.access_token}
            onClose={() => setSelectedOutfit(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}