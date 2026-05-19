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
import { CardSkeleton } from '@/components/ui'
import ItemDetailModal from './components/ItemDetailModal'
import OutfitDetailModal from './components/OutfitDetailModal'
import TryOnModal from '@/app/style/components/TryOnModal'

type ViewMode = 'items' | 'outfits'
type OwnershipFilter = 'all' | 'owned' | 'wishlist'
type SortOrder = 'newest' | 'oldest' | 'color'

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories']

const FORMALITY_SHORT: Record<number, string> = {
  1: 'Casual',
  2: 'Smart-cas',
  3: 'Business',
  4: 'Formal',
  5: 'Black tie',
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatMonthShort = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short' })

const formatDay = (d: Date) =>
  d.toLocaleDateString('en-US', { day: 'numeric' })

const formatMonthDay = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function ClosetPage() {
  const { session } = useAuth()
  const [closetData, setClosetData] = useState<ClosetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeView, setActiveView] = useState<ViewMode>('items')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

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
      pieces: '—',
      piecesSmall: '—',
      outfits: '—',
      outfitsSmall: 'saved looks',
      categories: '—',
      categoriesSmall: '—',
      dominantHue: { name: '—', hex: '#808080' },
      lastAddedMonth: '—',
      lastAddedDay: '',
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

    return {
      pieces: pad2(closetData.total_items),
      piecesSmall: `across ${totalCategories} ${totalCategories === 1 ? 'category' : 'categories'}`,
      outfits: pad2(closetData.total_outfits),
      outfitsSmall: 'saved looks',
      categories: pad2(totalCategories),
      categoriesSmall: mostCommonCategory.toLowerCase(),
      dominantHue: hue,
      lastAddedMonth: formatMonthShort(lastItem),
      lastAddedDay: formatDay(lastItem),
    }
  }, [closetData, allItems, categoriesPresent])

  const sortItems = (items: ClothingItemResponse[]) =>
    [...items]
      .filter((i) => ownershipFilter === 'all' || i.ownership === ownershipFilter)
      .sort((a, b) => {
        if (sortOrder === 'color') return a.color.hsl.h - b.color.hsl.h
        const diff =
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })

  const outfitsSorted = useMemo(() => {
    if (!closetData) return [] as OutfitSummary[]
    return [...closetData.outfits].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [closetData])

  return (
    <ProtectedRoute>
      <div className="flex-1">
        <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 pt-7 pb-24">
          {/* HEAD */}
          <section className="py-12 pb-7 border-b border-ink">
            <h1 className="m-0 font-display font-normal uppercase text-[clamp(72px,9vw,128px)] leading-[0.92] tracking-[-0.025em]">
              The <em className="italic text-ink-3">closet,</em>
              <br />
              edited.
            </h1>
            <p className="mt-[18px] max-w-[36ch] font-display italic text-[20px] leading-[1.35] text-ink-2">
              Every piece you&apos;ve uploaded, every outfit you&apos;ve built — sorted, scored, and ready to wear.
            </p>
          </section>

          {/* LEDGER */}
          <section className="grid grid-cols-5 max-md:grid-cols-2 border-b border-ink">
            <LedgerCell
              label="Pieces"
              value={<span>{ledger.pieces}</span>}
              small={ledger.piecesSmall}
            />
            <LedgerCell
              label="Outfits"
              value={<span>{ledger.outfits}</span>}
              small={ledger.outfitsSmall}
            />
            <LedgerCell
              label="Categories"
              value={<span>{ledger.categories}</span>}
              small={ledger.categoriesSmall}
            />
            <LedgerCell
              label="Dominant hue"
              value={
                <span>
                  <i
                    className="inline-block w-[22px] h-[22px] border border-ink align-[-3px] mr-2"
                    style={{ backgroundColor: ledger.dominantHue.hex }}
                    aria-hidden="true"
                  />
                  <em className="italic text-ink-3">
                    {ledger.dominantHue.name}
                  </em>
                </span>
              }
            />
            <LedgerCell
              label="Last added"
              value={
                ledger.lastAddedMonth === '—' ? (
                  <span>—</span>
                ) : (
                  <span>
                    {ledger.lastAddedMonth}{' '}
                    <em className="italic text-ink-3">{ledger.lastAddedDay}</em>
                  </span>
                )
              }
            />
          </section>

          {/* TABS */}
          <nav className="flex border-b border-ink">
            <TabButton
              active={activeView === 'items'}
              onClick={() => setActiveView('items')}
            >
              Pieces{' '}
              <span className="opacity-60">
                {pad2(closetData?.total_items ?? 0)}
              </span>
            </TabButton>
            <TabButton
              active={activeView === 'outfits'}
              onClick={() => setActiveView('outfits')}
            >
              Outfits{' '}
              <span className="opacity-60">
                {pad2(closetData?.total_outfits ?? 0)}
              </span>
            </TabButton>
          </nav>

          {/* FILTERBAR */}
          {activeView === 'items' && (
            <div className="grid grid-cols-[1fr_auto_auto] max-md:grid-cols-1 gap-6 py-[22px] border-b border-ink items-center">
              <div className="flex flex-wrap gap-2">
                {(['All', ...sortedCategories] as string[]).map((cat) => (
                  <Chip
                    key={cat}
                    active={categoryFilter === cat}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </Chip>
                ))}
              </div>
              <SegmentedControl
                label="Show"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'owned', label: 'Owned' },
                  { value: 'wishlist', label: 'Wishlist' },
                ]}
                value={ownershipFilter}
                onChange={(v) => setOwnershipFilter(v as OwnershipFilter)}
              />
              <SegmentedControl
                label="Sort"
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'color', label: 'Color' },
                ]}
                value={sortOrder}
                onChange={(v) => setSortOrder(v as SortOrder)}
              />
            </div>
          )}

          {/* CONTENT */}
          {isLoading && (
            <section
              aria-live="polite"
              aria-busy="true"
              className="pt-8 space-y-4"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
                Loading closet…
              </p>
              <div className="grid grid-cols-5 gap-6 max-md:grid-cols-3">
                <CardSkeleton count={5} />
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
                className="font-mono text-[11px] uppercase tracking-[0.12em] border border-ink px-[22px] py-[18px] hover:bg-ink hover:text-paper transition-colors"
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
              sortItems={sortItems}
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
              outfits={outfitsSorted}
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
        </div>
      </div>
    </ProtectedRoute>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface LedgerCellProps {
  label: string
  value: React.ReactNode
  small?: string
}

function LedgerCell({ label, value, small }: LedgerCellProps) {
  return (
    <div className="border-r border-ink last:border-r-0 max-md:border-r-0 max-md:[&:nth-child(odd)]:border-r max-md:border-b max-md:last:border-b-0 max-md:[&:nth-last-child(2)]:border-b-0 px-[22px] py-[18px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-[6px]">
        — {label} —
      </div>
      <div className="font-display text-[32px] leading-none tracking-[-0.01em]">
        {value}
        {small && (
          <small className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3 ml-[6px]">
            {small}
          </small>
        )}
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-7 py-[18px] border-r border-ink last:border-r-0',
        'font-mono text-[11px] uppercase tracking-[0.14em]',
        'inline-flex gap-3 items-baseline',
        'transition-colors duration-200',
        active
          ? 'bg-ink text-paper'
          : 'text-ink-3 hover:bg-paper-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

interface ChipProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 border border-ink',
        'font-mono text-[10px] uppercase tracking-[0.12em]',
        'transition-colors duration-200',
        active ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-2',
      )}
    >
      {children}
    </button>
  )
}

interface SegOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  label: string
  options: SegOption[]
  value: string
  onChange: (v: string) => void
}

function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div className="flex items-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mr-2">
        {label}
      </span>
      <div className="flex">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-[14px] py-2 border border-ink',
              i !== 0 && 'border-l-0',
              'font-mono text-[10px] uppercase tracking-[0.12em]',
              'transition-colors duration-200',
              value === opt.value
                ? 'bg-ink text-paper'
                : 'bg-transparent text-ink hover:bg-paper-2',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ItemsViewProps {
  closetData: ClosetResponse
  sortedCategories: string[]
  categoryFilter: string
  sortItems: (items: ClothingItemResponse[]) => ClothingItemResponse[]
  onItemClick: (item: ClothingItemResponse) => void
  onTryOn: (item: ClothingItemResponse) => void
}

function ItemsView({
  closetData,
  sortedCategories,
  categoryFilter,
  sortItems,
  onItemClick,
  onTryOn,
}: ItemsViewProps) {
  if (closetData.total_items === 0) {
    return (
      <section className="py-16 text-center">
        <p className="font-display italic text-[32px] leading-snug">
          Empty closet.
        </p>
        <p className="font-display italic text-[18px] text-ink-2 mt-3">
          Add your first piece below.
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
    .map((section, i, arr) => ({
      ...section,
      startIndex: arr
        .slice(0, i)
        .reduce((sum, s) => sum + s.filtered.length, 0),
    }))

  return (
    <div>
      {sections.map(({ category, filtered, startIndex }) => (
        <section key={category}>
          <header className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline pt-9 pb-[18px] mb-6 border-b border-ink">
            <span className="font-display uppercase text-[36px] leading-none tracking-[-0.015em]">
              {category}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
              {pad2(filtered.length)}{' '}
              {filtered.length === 1 ? 'piece' : 'pieces'}
            </span>
            <span className="h-px bg-ink" aria-hidden="true" />
          </header>

          <div className="grid grid-cols-5 gap-6 max-md:grid-cols-2 mb-12">
            {filtered.map((item, i) => (
              <ItemTile
                key={item.id}
                item={item}
                index={startIndex + i + 1}
                onClick={() => onItemClick(item)}
                onTryOn={() => onTryOn(item)}
              />
            ))}
            <AddSlot />
          </div>
        </section>
      ))}
    </div>
  )
}

interface ItemTileProps {
  item: ClothingItemResponse
  index: number
  onClick: () => void
  onTryOn: () => void
}

function ItemTile({ item, index, onClick, onTryOn }: ItemTileProps) {
  const aesthetics = (item.aesthetics ?? []).slice(0, 2).join(' · ')
  const formality = item.formality ?? 0

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
      className="group flex flex-col gap-2 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
      aria-label={`Open details for ${item.category.l2}`}
    >
      <div className="relative aspect-[4/5] border border-ink overflow-hidden bg-paper-2 transition-transform duration-200 group-hover:-translate-y-[3px]">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.category.l2}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 product__frame--placeholder" />
        )}

        <span className="absolute top-[10px] left-[10px] font-mono text-[9px] uppercase tracking-[0.1em] bg-paper border border-ink px-[6px] py-[4px]">
          No. {pad2(index)}
        </span>

        {item.ownership === 'wishlist' && (
          <span className="absolute top-[10px] right-[10px] bg-accent text-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]">
            Wishlist
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTryOn()
          }}
          className="absolute bottom-[10px] right-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-ink text-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] border border-ink hover:bg-paper hover:text-ink"
          aria-label={`Try on ${item.category.l2}`}
        >
          Try on
        </button>

        {item.color?.hex && item.color?.name && (
          <span className="absolute bottom-[10px] left-[10px] inline-flex gap-[6px] items-center font-mono text-[9px] uppercase tracking-[0.08em] bg-paper border border-ink px-2 py-1">
            <i
              className="w-2 h-2 border border-ink"
              style={{ backgroundColor: item.color.hex }}
              aria-hidden="true"
            />
            {item.color.name}
          </span>
        )}
      </div>

      <div className="flex justify-between items-baseline gap-3">
        <span className="font-display text-[18px] leading-none">
          {item.category.l2}
        </span>
        {formality > 0 && (
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
            {FORMALITY_SHORT[formality]}
          </span>
        )}
      </div>

      <div className="flex justify-between items-baseline gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 truncate">
          {aesthetics || '—'}
        </span>
        <span className="flex gap-[2px] shrink-0" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <i
              key={n}
              className={cn(
                'w-[6px] h-[6px] border border-ink',
                n <= formality ? 'bg-ink' : 'bg-paper-3',
              )}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

function AddSlot() {
  return (
    <Link
      href="/style"
      className="group flex flex-col gap-2"
      aria-label="Add a new piece"
    >
      <div className="relative aspect-[4/5] border border-dashed border-ink bg-paper-2 flex items-center justify-center transition-colors group-hover:bg-paper-3">
        <span className="font-mono text-[28px] text-ink leading-none">＋</span>
      </div>
      <div className="flex justify-between items-baseline gap-3">
        <span className="font-display italic text-[18px] leading-none text-ink-2">
          Add a piece
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
          →
        </span>
      </div>
    </Link>
  )
}

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
      <header className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline pt-9 pb-[18px] mb-6 border-b border-ink">
        <span className="font-display uppercase text-[36px] leading-none tracking-[-0.015em]">
          Saved <em className="italic text-ink-3">outfits</em>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          {pad2(outfits.length)} {outfits.length === 1 ? 'look' : 'looks'}
        </span>
        <span className="h-px bg-ink" aria-hidden="true" />
      </header>

      <div className="grid grid-cols-4 gap-7 max-md:grid-cols-2">
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
      className="text-left border border-ink bg-paper cursor-pointer transition-transform duration-200 hover:-translate-y-[3px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
      aria-label={`Open ${outfit.name}`}
    >
      <div className="relative aspect-[5/4] border-b border-ink overflow-hidden bg-paper-2">
        {outfit.thumbnail_url ? (
          <img
            src={outfit.thumbnail_url}
            alt={`${outfit.name} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 product__frame--placeholder" />
        )}
      </div>
      <div className="px-[18px] pt-[18px] pb-4">
        <div className="flex justify-between items-baseline mb-[10px]">
          <span className="font-display text-[24px] leading-none">
            {outfit.name}
          </span>
        </div>
        <div className="flex gap-[14px] font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 pt-[10px] border-t border-ink">
          <span>
            {outfit.item_count} {outfit.item_count === 1 ? 'piece' : 'pieces'}
          </span>
          <span>{formatMonthDay(new Date(outfit.created_at))}</span>
        </div>
      </div>
    </button>
  )
}
