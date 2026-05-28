'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getCloset, deleteClothingItem, deleteOutfit } from '@/lib/api'
import { cn } from '@/lib/cn'
import type {
  ClosetResponse,
  ClothingItemResponse,
  OutfitSummary,
} from '@/types'
import { CardSkeleton } from '@/components/ui'
import ItemDetailModal from './components/ItemDetailModal'
import OutfitDetailModal from './components/OutfitDetailModal'
import TryOnModal from '@/app/style/components/TryOnModal'

type ViewMode = 'items' | 'outfits'
type OwnershipFilter = 'all' | 'owned' | 'wishlist'
type SortOrder = 'newest' | 'oldest' | 'color'

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories']

const pad2 = (n: number) => String(n).padStart(2, '0')

export default function ClosetPage() {
  const { session } = useAuth()
  const [closetData, setClosetData] = useState<ClosetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeView, setActiveView] = useState<ViewMode>('items')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const switchView = (next: ViewMode) => {
    setActiveView(next)
    setCategoryFilter('All')
    setOwnershipFilter('all')
    setSortOrder('newest')
    setSearchQuery('')
  }

  const [selectedItem, setSelectedItem] =
    useState<ClothingItemResponse | null>(null)
  const [tryOnItem, setTryOnItem] = useState<ClothingItemResponse | null>(null)
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitSummary | null>(
    null,
  )

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

  const categoriesPresent = useMemo<string[]>(
    () => (closetData ? Object.keys(closetData.items_by_category) : []),
    [closetData],
  )

  const sortedCategories = useMemo<string[]>(() => {
    const present = new Set(categoriesPresent)
    return [
      ...CATEGORY_ORDER.filter((c) => present.has(c)),
      ...categoriesPresent
        .filter((c) => !CATEGORY_ORDER.includes(c))
        .sort(),
    ]
  }, [categoriesPresent])

  const sortItems = (items: ClothingItemResponse[]) => {
    const q = searchQuery.trim().toLowerCase()
    return [...items]
      .filter((i) => ownershipFilter === 'all' || i.ownership === ownershipFilter)
      .filter((i) => {
        if (!q) return true
        const haystack = [
          i.color?.name ?? '',
          i.category.l2,
          i.category.l1,
          (i.aesthetics ?? []).join(' '),
          i.brand ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => {
        if (sortOrder === 'color') return a.color.hsl.h - b.color.hsl.h
        const diff =
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }

  const outfitsSorted = useMemo(() => {
    if (!closetData) return [] as OutfitSummary[]
    return [...closetData.outfits].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [closetData])

  const hasItems = closetData ? closetData.total_items > 0 : false

  return (
    <ProtectedRoute>
      <div className="flex-1">
        <div className="max-w-[1440px] mx-auto grid grid-cols-[240px_1fr] gap-10 max-md:grid-cols-1 max-md:gap-6 px-10 max-md:px-6 pt-8 pb-24">
          {/* SIDEBAR */}
          <aside className="border-r border-ink pr-8 max-md:border-r-0 max-md:border-b max-md:border-ink max-md:pr-0 max-md:pb-8">
            <div className="sticky top-6 flex flex-col gap-7">
              {/* Tabs */}
              <div className="flex flex-col gap-2">
                <SideTab
                  active={activeView === 'items'}
                  onClick={() => switchView('items')}
                  label="Pieces"
                  count={closetData ? pad2(closetData.total_items) : '—'}
                />
                <SideTab
                  active={activeView === 'outfits'}
                  onClick={() => switchView('outfits')}
                  label="Outfits"
                  count={closetData ? pad2(closetData.total_outfits) : '—'}
                />
              </div>

              {/* Filters — only for Pieces tab, only when closet has items */}
              {activeView === 'items' && hasItems && (
                <>
                  <hr className="border-t border-rule-soft" />

                  {/* Search */}
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
                      Search
                    </div>
                    <div className="flex items-baseline gap-2 border-b border-ink pb-2">
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Color, brand, tag…"
                        aria-label="Search pieces"
                        className="flex-1 min-w-0 bg-transparent font-display italic text-[16px] text-ink placeholder:text-ink-3 placeholder:not-italic placeholder:font-mono placeholder:text-[11px] placeholder:tracking-[0.04em] focus:outline-none"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 hover:text-ink shrink-0"
                          aria-label="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <hr className="border-t border-rule-soft" />

                  <FilterGroup
                    label="Category"
                    options={(['All', ...sortedCategories] as string[]).map(
                      (c) => ({ value: c, label: c }),
                    )}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                  />

                  <hr className="border-t border-rule-soft" />

                  <FilterGroup
                    label="Show"
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'owned', label: 'Owned' },
                      { value: 'wishlist', label: 'Wishlist' },
                    ]}
                    value={ownershipFilter}
                    onChange={(v) => setOwnershipFilter(v as OwnershipFilter)}
                  />

                  <hr className="border-t border-rule-soft" />

                  <FilterGroup
                    label="Sort"
                    options={[
                      { value: 'newest', label: 'Newest' },
                      { value: 'oldest', label: 'Oldest' },
                      { value: 'color', label: 'Color' },
                    ]}
                    value={sortOrder}
                    onChange={(v) => setSortOrder(v as SortOrder)}
                  />
                </>
              )}

              {/* Add a piece */}
              <hr className="border-t border-ink mt-2" />
              <Link
                href="/style"
                className={cn(
                  'inline-flex items-center justify-between gap-3 px-4 py-3',
                  'border border-ink bg-paper text-ink',
                  'font-mono text-[11px] uppercase tracking-[0.12em]',
                  'transition-colors',
                  'hover:bg-ink hover:text-paper',
                )}
              >
                <span>Add a piece</span>
                <span aria-hidden="true">＋</span>
              </Link>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main>
            {isLoading && (
              <section
                aria-live="polite"
                aria-busy="true"
                className="space-y-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
                  Loading closet…
                </p>
                <div className="grid grid-cols-4 gap-6 max-md:grid-cols-2">
                  <CardSkeleton count={4} />
                </div>
              </section>
            )}

            {error && !isLoading && (
              <section className="py-16 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-accent mb-4">
                  Failed to load closet
                </p>
                <p className="font-display italic text-[18px] text-ink-2 mb-6">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={fetchCloset}
                  className="font-mono text-[11px] uppercase tracking-[0.12em] border border-ink px-[22px] py-[18px] bg-paper text-ink hover:bg-ink hover:text-paper transition-colors"
                >
                  Try again
                </button>
              </section>
            )}

            {!isLoading && !error && closetData && activeView === 'items' && (
              <ItemsView
                closetData={closetData}
                sortedCategories={sortedCategories}
                categoryFilter={categoryFilter}
                ownershipFilter={ownershipFilter}
                sortItems={sortItems}
                onClearFilters={() => {
                  setCategoryFilter('All')
                  setOwnershipFilter('all')
                  setSearchQuery('')
                }}
                hasSearchQuery={searchQuery.trim().length > 0}
                onItemClick={(item) => {
                  setTryOnItem(null)
                  setSelectedItem(item)
                }}
              />
            )}

            {!isLoading && !error && closetData && activeView === 'outfits' && (
              <OutfitsView
                outfits={outfitsSorted}
                onOutfitClick={setSelectedOutfit}
              />
            )}
          </main>

          {selectedItem && (
            <ItemDetailModal
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onDelete={handleDeleteItem}
              onTryOn={() => {
                setTryOnItem(selectedItem)
                setSelectedItem(null)
              }}
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

          {tryOnItem && session?.access_token && (
            <TryOnModal
              item={tryOnItem}
              itemImageUrl={tryOnItem.image_url}
              token={session.access_token}
              onClose={() => setTryOnItem(null)}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

// ============================================================================
// Sidebar sub-components
// ============================================================================

interface SideTabProps {
  active: boolean
  onClick: () => void
  label: string
  count: string
}

function SideTab({ active, onClick, label, count }: SideTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-baseline justify-between w-full text-left',
        'font-display leading-none transition-colors',
        active
          ? 'text-[32px] text-ink'
          : 'text-[24px] text-ink-3 hover:text-ink',
      )}
    >
      <span className={active ? 'italic' : ''}>{label}</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] opacity-50">
        {count}
      </span>
    </button>
  )
}

interface FilterGroupProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}

function FilterGroup({ label, options, value, onChange }: FilterGroupProps) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
        {label}
      </div>
      <ul className="flex flex-col gap-2">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onChange(opt.value)}
                aria-pressed={active}
                className={cn(
                  'flex items-center w-full text-left',
                  'font-mono text-[12px] uppercase tracking-[0.08em]',
                  'transition-colors',
                  active
                    ? 'text-ink font-bold'
                    : 'text-ink-3 font-normal hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'inline-block w-5 shrink-0',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden="true"
                >
                  →
                </span>
                {opt.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ============================================================================
// Items view
// ============================================================================

interface ItemsViewProps {
  closetData: ClosetResponse
  sortedCategories: string[]
  categoryFilter: string
  ownershipFilter: OwnershipFilter
  sortItems: (items: ClothingItemResponse[]) => ClothingItemResponse[]
  onClearFilters: () => void
  hasSearchQuery: boolean
  onItemClick: (item: ClothingItemResponse) => void
}

function ItemsView({
  closetData,
  sortedCategories,
  categoryFilter,
  ownershipFilter,
  sortItems,
  onClearFilters,
  hasSearchQuery,
  onItemClick,
}: ItemsViewProps) {
  if (closetData.total_items === 0) {
    return (
      <section className="py-16 text-center">
        <p className="font-display italic text-[32px] leading-snug">
          Empty closet.
        </p>
        <p className="font-display italic text-[18px] text-ink-2 mt-3">
          Tap <em className="italic">Add a piece</em> in the sidebar to upload
          your first one.
        </p>
      </section>
    )
  }

  const visibleCategories =
    categoryFilter === 'All'
      ? sortedCategories
      : sortedCategories.filter((c) => c === categoryFilter)

  const sections = visibleCategories
    .map((category) => ({
      category,
      filtered: sortItems(closetData.items_by_category[category] ?? []),
    }))
    .filter((s) => s.filtered.length > 0)

  const filtersActive =
    categoryFilter !== 'All' || ownershipFilter !== 'all' || hasSearchQuery
  if (sections.length === 0 && filtersActive) {
    return (
      <section className="py-16 text-center">
        <p className="font-display italic text-[32px] leading-snug">
          {hasSearchQuery
            ? 'No pieces match your search.'
            : 'No pieces match this filter.'}
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] underline decoration-ink underline-offset-4 hover:text-ink-2"
        >
          Clear filters
        </button>
      </section>
    )
  }

  return (
    <div>
      {sections.map(({ category, filtered }) => (
        <section key={category}>
          <header className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline pb-[14px] mb-5 border-b border-ink">
            <span className="font-display uppercase text-[28px] leading-none tracking-[-0.015em]">
              {category}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
              {pad2(filtered.length)}{' '}
              {filtered.length === 1 ? 'piece' : 'pieces'}
            </span>
          </header>

          <div className="grid grid-cols-4 gap-6 max-md:grid-cols-2 mb-10">
            {filtered.map((item) => (
              <ItemTile
                key={item.id}
                item={item}
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

interface ItemTileProps {
  item: ClothingItemResponse
  onClick: () => void
}

function ItemTile({ item, onClick }: ItemTileProps) {
  const displayName = item.color?.name
    ? `${item.color.name} ${item.category.l2}`
    : item.category.l2

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="group cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
      aria-label={`Open details for ${displayName}`}
    >
      <div className="relative aspect-[4/5] border border-ink overflow-hidden bg-paper-2 transition-transform duration-200 group-hover:-translate-y-[3px]">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 product__frame--placeholder" />
        )}

        {item.ownership === 'wishlist' && (
          <span className="absolute top-[10px] right-[10px] bg-accent text-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]">
            Wishlist
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Outfits view
// ============================================================================

interface OutfitsViewProps {
  outfits: OutfitSummary[]
  onOutfitClick: (outfit: OutfitSummary) => void
}

function OutfitsView({ outfits, onOutfitClick }: OutfitsViewProps) {
  if (outfits.length === 0) {
    return (
      <section className="py-16 text-center">
        <p className="font-display italic text-[32px] leading-snug">
          No outfits saved yet.
        </p>
        <p className="font-display italic text-[18px] text-ink-2 mt-3">
          Build your first outfit to save it here.
        </p>
      </section>
    )
  }

  return (
    <section>
      <header className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline pb-[14px] mb-5 border-b border-ink">
        <span className="font-display uppercase text-[28px] leading-none tracking-[-0.015em]">
          Saved <em className="italic text-ink-3">outfits</em>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          {pad2(outfits.length)} {outfits.length === 1 ? 'look' : 'looks'}
        </span>
      </header>

      <div className="grid grid-cols-4 gap-6 max-md:grid-cols-2">
        {outfits.map((outfit) => (
          <OutfitTile
            key={outfit.id}
            outfit={outfit}
            onClick={() => onOutfitClick(outfit)}
          />
        ))}
      </div>
    </section>
  )
}

interface OutfitTileProps {
  outfit: OutfitSummary
  onClick: () => void
}

function OutfitTile({ outfit, onClick }: OutfitTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
      aria-label={`Open ${outfit.name}`}
    >
      <div className="relative aspect-[4/5] border border-ink overflow-hidden bg-paper-2 transition-transform duration-200 group-hover:-translate-y-[3px]">
        {outfit.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={outfit.thumbnail_url}
            alt={`${outfit.name} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 product__frame--placeholder" />
        )}
      </div>
    </button>
  )
}
