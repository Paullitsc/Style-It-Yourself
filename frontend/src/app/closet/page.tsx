'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getCloset, deleteClothingItem, deleteOutfit } from '@/lib/api'
import { dominantHueName } from '@/lib/colorUtils'
import { cn } from '@/lib/cn'
import type {
  ClosetResponse,
  ClothingItemResponse,
  OutfitSummary,
} from '@/types'
import {
  Button,
  CardSkeleton,
  ItemCard,
  OutfitCard,
  StatusBadge,
} from '@/components/ui'
import ItemDetailModal from './components/ItemDetailModal'
import OutfitDetailModal from './components/OutfitDetailModal'
import TryOnModal from '@/app/style/components/TryOnModal'

type ViewMode = 'items' | 'outfits'
type FilterMode = 'category' | 'show'
type OwnershipFilter = 'all' | 'owned' | 'wishlist'

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories']

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

const formatMonthDay = (date: Date) =>
  date
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()

const daysAgo = (date: Date) => {
  const ms = Date.now() - date.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export default function ClosetPage() {
  const { session } = useAuth()
  const [closetData, setClosetData] = useState<ClosetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeView, setActiveView] = useState<ViewMode>('items')
  const [activeFilter, setActiveFilter] = useState<FilterMode>('category')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all')

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

  const allItems = useMemo<ClothingItemResponse[]>(
    () =>
      closetData ? Object.values(closetData.items_by_category).flat() : [],
    [closetData],
  )

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

  const ledger = useMemo(() => {
    const empty = {
      pieces: { primary: '—', secondary: '—' },
      outfits: { primary: '—', secondary: '—' },
      categories: { primary: '—', secondary: '—' },
      dominantHue: {
        primary: '—',
        secondary: '—',
        swatch: null as string | null,
      },
      lastAdded: { primary: '—', secondary: '—' },
      established: null as string | null,
    }
    if (!closetData || closetData.total_items === 0) return empty

    const totalCategories = categoriesPresent.length
    const mostCommonCategory =
      categoriesPresent
        .map((c) => ({
          c,
          n: (closetData.items_by_category[c] ?? []).length,
        }))
        .sort((a, b) => b.n - a.n)[0]?.c ?? '—'

    const hue = dominantHueName(allItems.map((i) => ({ color: i.color })))

    const sortedByDate = allItems
      .map((i) => new Date(i.created_at))
      .sort((a, b) => b.getTime() - a.getTime())
    const lastItem = sortedByDate[0]
    const firstItem = sortedByDate[sortedByDate.length - 1]

    return {
      pieces: {
        primary: pad2(closetData.total_items),
        secondary: `${totalCategories} ${
          totalCategories === 1 ? 'category' : 'categories'
        }`,
      },
      outfits: {
        primary: pad2(closetData.total_outfits),
        secondary: 'saved',
      },
      categories: {
        primary: pad2(totalCategories),
        secondary: mostCommonCategory.toLowerCase(),
      },
      dominantHue: {
        primary: hue.name.toUpperCase(),
        secondary: hue.hex.toUpperCase(),
        swatch: hue.hex as string | null,
      },
      lastAdded: {
        primary: formatMonthDay(lastItem),
        secondary: `${daysAgo(lastItem)}d ago`,
      },
      established: formatMonthYear(firstItem),
    }
  }, [closetData, allItems, categoriesPresent])

  const filterItems = (items: ClothingItemResponse[]) =>
    [...items]
      .filter((i) => ownershipFilter === 'all' || i.ownership === ownershipFilter)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

  const outfitsByMonth = useMemo(() => {
    if (!closetData)
      return [] as Array<{
        key: string
        label: string
        outfits: OutfitSummary[]
      }>
    const groups = new Map<string, OutfitSummary[]>()
    for (const o of closetData.outfits) {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
      const list = groups.get(key) ?? []
      list.push(o)
      groups.set(key, list)
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, outfits]) => {
        const sample = new Date(outfits[0].created_at)
        return {
          key,
          label: formatMonthYear(sample).toUpperCase(),
          outfits: outfits.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        }
      })
  }, [closetData])

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-[1440px] px-[var(--gutter)] py-12 text-ink">
        {/* HERO */}
        <section className="mb-10">
          <h1 className="t-display-l">Your closet.</h1>
          <p className="t-body-l text-ink-2 mt-3">
            {closetData && closetData.total_items > 0 && ledger.established
              ? `${closetData.total_items} ${
                  closetData.total_items === 1 ? 'piece' : 'pieces'
                }. Established ${ledger.established}.`
              : 'Empty closet. Add your first piece below.'}
          </p>
        </section>

        <hr className="border-t border-ink" />

        {/* LEDGER */}
        <section className="grid grid-cols-5 max-md:grid-cols-2 py-6 mb-8">
          {[
            { label: 'PIECES', ...ledger.pieces, swatch: null as string | null },
            { label: 'OUTFITS', ...ledger.outfits, swatch: null as string | null },
            {
              label: 'CATEGORIES',
              ...ledger.categories,
              swatch: null as string | null,
            },
            { label: 'DOMINANT HUE', ...ledger.dominantHue },
            {
              label: 'LAST ADDED',
              ...ledger.lastAdded,
              swatch: null as string | null,
            },
          ].map((cell, i) => (
            <div
              key={cell.label}
              className={cn(
                'flex flex-col gap-2 px-6',
                i !== 0 && 'border-l border-ink max-md:border-l-0',
                'max-md:py-3',
              )}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
                {cell.label}
              </span>
              <div className="flex items-center gap-2">
                {cell.swatch && (
                  <span
                    className="inline-block w-[14px] h-[14px] border border-ink"
                    style={{ backgroundColor: cell.swatch }}
                    aria-hidden="true"
                  />
                )}
                <span className="t-display-s">{cell.primary}</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                {cell.secondary}
              </span>
            </div>
          ))}
        </section>

        <hr className="border-t border-ink" />

        {/* TABS + FILTERBAR */}
        <section className="py-6">
          <div className="flex items-center gap-8 mb-6">
            <button
              type="button"
              onClick={() => setActiveView('items')}
              className={cn(
                'font-mono text-[11px] uppercase tracking-[0.08em] pb-1',
                activeView === 'items'
                  ? 'text-ink border-b-2 border-ink'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Pieces
            </button>
            <button
              type="button"
              onClick={() => setActiveView('outfits')}
              className={cn(
                'font-mono text-[11px] uppercase tracking-[0.08em] pb-1',
                activeView === 'outfits'
                  ? 'text-ink border-b-2 border-ink'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Outfits
            </button>
          </div>

          {activeView === 'items' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.04em]">
                <span className="text-ink-3">Filter</span>
                <span className="text-ink-3">·</span>
                <button
                  type="button"
                  onClick={() => setActiveFilter('category')}
                  className={cn(
                    'pb-[2px]',
                    activeFilter === 'category'
                      ? 'text-ink border-b border-ink'
                      : 'text-ink-3 hover:text-ink',
                  )}
                >
                  Category
                </button>
                <span className="text-ink-3">·</span>
                <button
                  type="button"
                  onClick={() => setActiveFilter('show')}
                  className={cn(
                    'pb-[2px]',
                    activeFilter === 'show'
                      ? 'text-ink border-b border-ink'
                      : 'text-ink-3 hover:text-ink',
                  )}
                >
                  Show
                </button>
              </div>

              {activeFilter === 'category' && (
                <div className="flex flex-wrap gap-2">
                  {(['All', ...sortedCategories] as string[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        'border border-ink px-[10px] py-[6px]',
                        'font-mono text-[10px] uppercase tracking-[0.08em]',
                        categoryFilter === cat
                          ? 'bg-ink text-paper'
                          : 'bg-transparent text-ink hover:bg-ink hover:text-paper',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {activeFilter === 'show' && (
                <div className="flex flex-wrap gap-2">
                  {(['all', 'owned', 'wishlist'] as OwnershipFilter[]).map(
                    (opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOwnershipFilter(opt)}
                        className={cn(
                          'border border-ink px-[10px] py-[6px]',
                          'font-mono text-[10px] uppercase tracking-[0.08em]',
                          ownershipFilter === opt
                            ? 'bg-ink text-paper'
                            : 'bg-transparent text-ink hover:bg-ink hover:text-paper',
                        )}
                      >
                        {opt === 'all'
                          ? 'All'
                          : opt === 'owned'
                            ? 'Owned'
                            : 'Wishlist'}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* CONTENT */}
        {isLoading && (
          <section aria-live="polite" aria-busy="true" className="space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
              Loading closet…
            </p>
            <div className="grid grid-cols-6 gap-[var(--col-gap)] max-md:grid-cols-3">
              <CardSkeleton count={6} />
            </div>
          </section>
        )}

        {error && !isLoading && (
          <section className="py-16 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-accent mb-4">
              Failed to load closet
            </p>
            <p className="t-body text-ink-2 mb-6">{error}</p>
            <Button onClick={fetchCloset}>Try again</Button>
          </section>
        )}

        {!isLoading && !error && closetData && activeView === 'items' && (
          <ItemsView
            closetData={closetData}
            sortedCategories={sortedCategories}
            categoryFilter={categoryFilter}
            filterItems={filterItems}
            onItemClick={(item) => {
              setTryOnItem(null)
              setSelectedItem(item)
            }}
            onTryOn={(item) => {
              setSelectedItem(null)
              setTryOnItem(item)
            }}
          />
        )}

        {!isLoading && !error && closetData && activeView === 'outfits' && (
          <OutfitsView
            outfitsByMonth={outfitsByMonth}
            onOutfitClick={setSelectedOutfit}
          />
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

        {tryOnItem && session?.access_token && (
          <TryOnModal
            item={tryOnItem}
            itemImageUrl={tryOnItem.image_url}
            token={session.access_token}
            onClose={() => setTryOnItem(null)}
          />
        )}
      </main>
    </ProtectedRoute>
  )
}

interface ItemsViewProps {
  closetData: ClosetResponse
  sortedCategories: string[]
  categoryFilter: string
  filterItems: (items: ClothingItemResponse[]) => ClothingItemResponse[]
  onItemClick: (item: ClothingItemResponse) => void
  onTryOn: (item: ClothingItemResponse) => void
}

function ItemsView({
  closetData,
  sortedCategories,
  categoryFilter,
  filterItems,
  onItemClick,
  onTryOn,
}: ItemsViewProps) {
  if (closetData.total_items === 0) {
    return (
      <section className="py-16 text-center">
        <p className="font-display text-[28px] leading-snug">Empty closet.</p>
        <p className="t-body text-ink-2 mt-3">Add your first piece below.</p>
      </section>
    )
  }

  const visibleCategories =
    categoryFilter === 'All'
      ? sortedCategories
      : sortedCategories.filter((c) => c === categoryFilter)

  return (
    <div>
      {visibleCategories.map((category) => {
        const allInCategory = closetData.items_by_category[category] ?? []
        const filtered = filterItems(allInCategory)
        if (filtered.length === 0 && allInCategory.length === 0) return null
        return (
          <section key={category} className="mb-12">
            <hr className="border-t border-rule-soft" />
            <header className="font-mono text-[11px] uppercase tracking-[0.04em] mt-6 mb-6">
              {category} · {pad2(filtered.length)}{' '}
              {filtered.length === 1 ? 'piece' : 'pieces'}
            </header>
            <div className="grid grid-cols-6 gap-[var(--col-gap)] max-md:grid-cols-3">
              {filtered.map((item, i) => (
                <ItemCard
                  key={item.id}
                  index={pad2(i + 1)}
                  title={item.category.l2}
                  imageUrl={item.image_url}
                  imageAlt={item.category.l2}
                  colorName={item.color?.name}
                  formality={item.formality}
                  onClick={() => onItemClick(item)}
                  onTryOn={() => onTryOn(item)}
                  badge={
                    item.ownership === 'wishlist' ? (
                      <StatusBadge status="wishlist" size="sm" />
                    ) : undefined
                  }
                />
              ))}
              <AddSlot />
            </div>
          </section>
        )
      })}
    </div>
  )
}

function AddSlot() {
  return (
    <Link
      href="/style"
      className="group flex flex-col gap-3"
      aria-label="Add a new piece"
    >
      <div className="relative aspect-[4/5] border border-dashed border-ink flex items-center justify-center transition-colors group-hover:bg-paper-2">
        <span className="font-mono text-[24px] text-ink leading-none">+</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[18px] leading-tight text-ink-2">
          Add piece
        </span>
      </div>
    </Link>
  )
}

interface OutfitsViewProps {
  outfitsByMonth: Array<{
    key: string
    label: string
    outfits: OutfitSummary[]
  }>
  onOutfitClick: (outfit: OutfitSummary) => void
}

function OutfitsView({ outfitsByMonth, onOutfitClick }: OutfitsViewProps) {
  if (outfitsByMonth.length === 0) {
    return (
      <section className="py-16 text-center">
        <p className="font-display text-[28px] leading-snug">
          No outfits saved yet.
        </p>
        <p className="t-body text-ink-2 mt-3">
          Build your first outfit to save it here.
        </p>
      </section>
    )
  }

  return (
    <div>
      {outfitsByMonth.map((group) => (
        <section key={group.key} className="mb-12">
          <hr className="border-t border-rule-soft" />
          <header className="font-mono text-[11px] uppercase tracking-[0.04em] mt-6 mb-6">
            {group.label} · {pad2(group.outfits.length)}{' '}
            {group.outfits.length === 1 ? 'look' : 'looks'}
          </header>
          <div className="grid grid-cols-6 gap-[var(--col-gap)] max-md:grid-cols-3">
            {group.outfits.map((outfit, i) => (
              <OutfitCard
                key={outfit.id}
                index={pad2(i + 1)}
                name={outfit.name}
                createdAt={new Date(outfit.created_at)
                  .toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                  .toUpperCase()}
                thumbnailUrl={outfit.thumbnail_url}
                itemCount={outfit.item_count}
                onClick={() => onOutfitClick(outfit)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
