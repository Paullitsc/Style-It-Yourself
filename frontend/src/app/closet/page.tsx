'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getCloset, deleteClothingItem, deleteOutfit } from '@/lib/api'
import type { ClosetResponse, ClothingItemResponse, OutfitSummary } from '@/types'
import { Shirt, Package, AlertCircle } from 'lucide-react'
import {
  Button,
  CardSkeleton,
  ItemCard,
  OutfitCard,
  StatusBadge,
} from '@/components/ui'
import ItemDetailModal from './components/ItemDetailModal'
import OutfitDetailModal from './components/OutfitDetailModal'

type ViewMode = 'items' | 'outfits'

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories']

export default function ClosetPage() {
  const { session } = useAuth()
  const [activeView, setActiveView] = useState<ViewMode>('items')
  const [closetData, setClosetData] = useState<ClosetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleDeleteItem = async (itemId: string) => {
    if (!session?.access_token) return
    await deleteClothingItem(itemId, session.access_token)
    await fetchCloset()
  }

  const handleDeleteOutfit = async (outfitId: string) => {
    if (!session?.access_token) return
    await deleteOutfit(outfitId, session.access_token)
    await fetchCloset()
  }

  useEffect(() => {
    fetchCloset()
  }, [session?.access_token])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const getSortedCategories = () => {
    if (!closetData?.items_by_category) return []

    const categories = Object.keys(closetData.items_by_category)
    return CATEGORY_ORDER.filter((category) => categories.includes(category)).concat(
      categories.filter((category) => !CATEGORY_ORDER.includes(category)).sort()
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-80px)] w-full max-w-[1920px] mx-auto px-6 py-12 md:px-12">
        <div className="mb-8 flex flex-col justify-between gap-6 border-b border-primary-800 pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="mb-2 text-3xl font-bold uppercase tracking-tighter text-white md:text-4xl">My Closet</h1>
            {closetData && (
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                {closetData.total_items} Items • {closetData.total_outfits} Outfits
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant={activeView === 'items' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveView('items')}
            >
              Items {closetData && `(${closetData.total_items})`}
            </Button>
            <Button
              variant={activeView === 'outfits' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveView('outfits')}
            >
              Outfits {closetData && `(${closetData.total_outfits})`}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <p className="text-sm uppercase tracking-wide text-neutral-500">Loading closet...</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              <CardSkeleton count={8} />
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex h-[500px] flex-col items-center justify-center gap-6 text-center">
            <div className="rounded-full bg-primary-800 p-6">
              <AlertCircle size={48} className="text-error-500" />
            </div>
            <div>
              <h3 className="mb-2 text-xl font-bold uppercase tracking-widest text-white">Failed to Load Closet</h3>
              <p className="mb-6 text-sm text-neutral-500">{error}</p>
              <Button onClick={fetchCloset}>Try Again</Button>
            </div>
          </div>
        )}

        {!isLoading && !error && closetData && (
          <>
            {activeView === 'items' && (
              <>
                {closetData.total_items === 0 ? (
                  <div className="flex h-[500px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-primary-700 bg-primary-800/20 text-center">
                    <div className="mb-6 rounded-full bg-primary-800 p-6 text-neutral-500">
                      <Shirt size={48} strokeWidth={1} />
                    </div>
                    <h3 className="mb-2 text-xl font-bold uppercase tracking-widest text-white">Your closet is empty</h3>
                    <p className="mx-auto max-w-xs text-xs uppercase tracking-wide text-neutral-500">
                      Start building outfits to add items to your closet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {getSortedCategories().map((categoryL1) => {
                      const items = closetData.items_by_category[categoryL1] || []
                      if (items.length === 0) return null

                      return (
                        <div key={categoryL1}>
                          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
                            {categoryL1} ({items.length})
                          </h2>

                          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                            {items.map((item) => (
                              <ItemCard
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                title={item.category.l2}
                                subtitle={item.category.l1}
                                imageUrl={item.image_url}
                                imageAlt={item.category.l2}
                                colorHex={item.color?.hex}
                                fallbackIcon={<Shirt size={32} className="text-neutral-600" aria-hidden="true" />}
                                badge={
                                  item.ownership === 'wishlist' ? (
                                    <StatusBadge status="wishlist" size="sm" />
                                  ) : undefined
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {activeView === 'outfits' && (
              <>
                {closetData.total_outfits === 0 ? (
                  <div className="flex h-[500px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-primary-700 bg-primary-800/20 text-center">
                    <div className="mb-6 rounded-full bg-primary-800 p-6 text-neutral-500">
                      <Package size={48} strokeWidth={1} />
                    </div>
                    <h3 className="mb-2 text-xl font-bold uppercase tracking-widest text-white">No saved outfits yet</h3>
                    <p className="mx-auto max-w-xs text-xs uppercase tracking-wide text-neutral-500">
                      Build your first outfit to save it here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {closetData.outfits.map((outfit) => (
                      <OutfitCard
                        key={outfit.id}
                        onClick={() => setSelectedOutfit(outfit)}
                        name={outfit.name}
                        createdAt={formatDate(outfit.created_at)}
                        thumbnailUrl={outfit.thumbnail_url}
                        itemCount={outfit.item_count}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={handleDeleteItem}
          />
        )}

        {selectedOutfit && session?.access_token && (
          <OutfitDetailModal
            outfit={selectedOutfit}
            token={session.access_token}
            onClose={() => setSelectedOutfit(null)}
            onDelete={handleDeleteOutfit}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
