'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getCloset, deleteClothingItem, deleteOutfit } from '@/lib/api'
import type { ClosetResponse, ClothingItemResponse, OutfitSummary } from '@/types'
import { Shirt, Package, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
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

  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

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

  const getSortedItems = (items: ClothingItemResponse[]) =>
    [...items].sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-80px)] w-full max-w-[1920px] mx-auto px-6 py-12 md:px-12">
        <div className="mb-8 flex flex-col justify-between gap-6 border-b border-primary-800 pb-6 md:flex-row md:items-end">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500">
              Your Wardrobe
            </p>
            <h1 className="mb-2 text-4xl font-black uppercase tracking-tighter text-white md:text-5xl">
              My <span className="text-accent-500">Closet</span>
            </h1>
            {closetData && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-900">
                  {closetData.total_items} Items
                </span>
                <span className="h-3 w-px bg-primary-700" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-900">
                  {closetData.total_outfits} Outfits
                </span>
              </div>
            )}
          </div>

          <div className="flex">
            <button
              type="button"
              onClick={() => { setActiveView('items'); setActiveCategory('All') }}
              className={cn(
                'rounded-l-[var(--radius-sm)] rounded-r-none border px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors',
                activeView === 'items'
                  ? 'border-accent-500 bg-accent-500 text-primary-900'
                  : 'border-primary-700 bg-transparent text-neutral-700 hover:text-white'
              )}
            >
              Items {closetData && `(${closetData.total_items})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveView('outfits')}
              className={cn(
                'rounded-r-[var(--radius-sm)] rounded-l-none border border-l-0 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors',
                activeView === 'outfits'
                  ? 'border-accent-500 bg-accent-500 text-primary-900'
                  : 'border-primary-700 bg-transparent text-neutral-700 hover:text-white'
              )}
            >
              Outfits {closetData && `(${closetData.total_outfits})`}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <p className="text-sm uppercase tracking-wide text-neutral-500">Loading closet...</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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
                  <>
                    {/* Filter + Sort bar */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                      {/* Category filter pills */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveCategory('All')}
                          className={cn(
                            'rounded-[2px] border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                            activeCategory === 'All'
                              ? 'border-accent-500 bg-accent-500/10 text-accent-500'
                              : 'border-primary-600 bg-transparent text-neutral-900 hover:border-primary-500 hover:text-white'
                          )}
                        >
                          All
                        </button>
                        {getSortedCategories().map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                              'rounded-[2px] border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                              activeCategory === cat
                                ? 'border-accent-500 bg-accent-500/10 text-accent-500'
                                : 'border-primary-600 bg-transparent text-neutral-900 hover:border-primary-500 hover:text-white'
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Sort segmented control */}
                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => setSortOrder('newest')}
                          className={cn(
                            'rounded-l-[2px] rounded-r-none border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                            sortOrder === 'newest'
                              ? 'border-accent-500 bg-accent-500/10 text-accent-500'
                              : 'border-primary-600 bg-transparent text-neutral-900 hover:text-white'
                          )}
                        >
                          Newest
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortOrder('oldest')}
                          className={cn(
                            'rounded-r-[2px] rounded-l-none border border-l-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                            sortOrder === 'oldest'
                              ? 'border-accent-500 bg-accent-500/10 text-accent-500'
                              : 'border-primary-600 bg-transparent text-neutral-900 hover:text-white'
                          )}
                        >
                          Oldest
                        </button>
                      </div>
                    </div>

                    {activeCategory === 'All' ? (
                      <div className="space-y-12">
                        {getSortedCategories().map((categoryL1) => {
                          const items = getSortedItems(closetData.items_by_category[categoryL1] || [])
                          if (items.length === 0) return null

                          return (
                            <div key={categoryL1}>
                              <div className="mb-4 flex items-center gap-3">
                                <div className="h-5 w-[3px] flex-shrink-0 rounded-sm bg-accent-500" aria-hidden="true" />
                                <span className="text-xs font-extrabold uppercase tracking-widest text-white">{categoryL1}</span>
                                <span className="font-mono text-xs text-neutral-900">{String(items.length).padStart(2, '0')}</span>
                                <div className="h-px flex-1 bg-gradient-to-r from-primary-700 to-transparent" aria-hidden="true" />
                              </div>

                              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                                {items.map((item) => (
                                  <ItemCard
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    title={item.category.l2}
                                    imageUrl={item.image_url}
                                    imageAlt={item.category.l2}
                                    colorHex={item.color?.hex}
                                    colorName={item.color?.name}
                                    formality={item.formality}
                                    aesthetics={item.aesthetics}
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
                    ) : (
                      <div>
                        <div className="mb-4 flex items-center gap-3">
                          <div className="h-5 w-[3px] flex-shrink-0 rounded-sm bg-accent-500" aria-hidden="true" />
                          <span className="text-xs font-extrabold uppercase tracking-widest text-white">{activeCategory}</span>
                          <span className="font-mono text-xs text-neutral-900">
                            {String((closetData.items_by_category[activeCategory] || []).length).padStart(2, '0')}
                          </span>
                          <div className="h-px flex-1 bg-gradient-to-r from-primary-700 to-transparent" aria-hidden="true" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                          {getSortedItems(closetData.items_by_category[activeCategory] || []).map((item) => (
                            <ItemCard
                              key={item.id}
                              onClick={() => setSelectedItem(item)}
                              title={item.category.l2}
                              imageUrl={item.image_url}
                              imageAlt={item.category.l2}
                              colorHex={item.color?.hex}
                              colorName={item.color?.name}
                              formality={item.formality}
                              aesthetics={item.aesthetics}
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
                    )}
                  </>
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
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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
