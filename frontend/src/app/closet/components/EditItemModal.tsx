'use client'

import { useState } from 'react'
import type { ClothingItemResponse, ClothingItemUpdate, Color } from '@/types'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/cn'
import { buildColorFromHex } from '@/lib/colorUtils'
import CategorySelector, {
  ChipButton,
  FieldGroup,
} from '@/app/style/components/shared/CategorySelector'
import FormalitySlider from '@/app/style/components/shared/FormalitySlider'
import AestheticsSelector from '@/app/style/components/shared/AestheticsSelector'

// Full taxonomy (includes Outerwear + Full Body, which the shared frontend
// constant omits) so any imported item can be re-categorized.
const TAXONOMY: Record<string, string[]> = {
  Tops: ['T-Shirts', 'Polos', 'Casual Shirts', 'Dress Shirts', 'Sweaters', 'Hoodies', 'Blazers'],
  Bottoms: ['Jeans', 'Chinos', 'Dress Pants', 'Shorts', 'Joggers', 'Skirts'],
  Shoes: ['Sneakers', 'Loafers', 'Oxfords', 'Boots', 'Sandals', 'Heels'],
  Outerwear: ['Jackets', 'Coats', 'Vests'],
  Accessories: ['Watches', 'Belts', 'Bags', 'Hats', 'Scarves', 'Jewelry', 'Sunglasses'],
  'Full Body': ['Dresses', 'Suits'],
}

const PALETTE: Array<[string, string]> = [
  ['#000000', 'black'],
  ['#FFFFFF', 'white'],
  ['#808080', 'gray'],
  ['#0B1C2D', 'navy'],
  ['#D2B48C', 'tan'],
  ['#F5F5DC', 'beige'],
  ['#7B3F3F', 'red'],
  ['#2E5A88', 'blue'],
  ['#3F6F4F', 'green'],
  ['#C9A227', 'yellow'],
  ['#5B4B8A', 'purple'],
  ['#B5651D', 'orange'],
]

interface EditItemModalProps {
  item: ClothingItemResponse
  onClose: () => void
  onSave: (itemId: string, updates: ClothingItemUpdate) => Promise<void>
}

export default function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const [color, setColor] = useState<Color>(item.color)
  const [categoryL1, setCategoryL1] = useState(item.category.l1)
  const [categoryL2, setCategoryL2] = useState(item.category.l2)
  const [formality, setFormality] = useState(Math.round(item.formality))
  const [aesthetics, setAesthetics] = useState<string[]>(item.aesthetics ?? [])
  const [brand, setBrand] = useState(item.brand ?? '')
  const [price, setPrice] = useState(item.price != null ? String(item.price) : '')
  const [ownership, setOwnership] = useState<'owned' | 'wishlist'>(item.ownership === 'wishlist' ? 'wishlist' : 'owned')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const palette = PALETTE.some(([hex]) => hex.toUpperCase() === color.hex.toUpperCase())
    ? PALETTE
    : [[color.hex, color.name] as [string, string], ...PALETTE]

  const toggleAesthetic = (tag: string) => {
    setAesthetics((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length >= 3
          ? prev
          : [...prev, tag],
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const parsedPrice = price.trim() === '' ? null : Number(price.replace(/[^0-9.]/g, ''))
      const updates: ClothingItemUpdate = {
        color,
        category: { l1: categoryL1, l2: categoryL2 },
        formality,
        aesthetics,
        brand: brand.trim() || null,
        price: parsedPrice != null && Number.isFinite(parsedPrice) ? parsedPrice : null,
        ownership,
      }
      await onSave(item.id, updates)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Edit piece"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-between gap-6 px-[22px] py-[14px] border border-ink bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.12em] hover:bg-paper hover:text-ink transition-colors disabled:opacity-50"
          >
            <span>{saving ? 'Saving…' : 'Save changes'}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        {error && (
          <div className="border border-accent px-3 py-3 font-mono text-[10px] uppercase tracking-[0.06em] text-accent">
            {error}
          </div>
        )}

        <CategorySelector
          l1Options={Object.keys(TAXONOMY)}
          l2Options={TAXONOMY[categoryL1] ?? []}
          selectedL1={categoryL1}
          selectedL2={categoryL2}
          onSelectL1={(l1) => {
            setCategoryL1(l1)
            setCategoryL2((TAXONOMY[l1] ?? [''])[0])
          }}
          onSelectL2={setCategoryL2}
        />

        <FieldGroup label="Color">
          <div className="flex flex-wrap gap-2">
            {palette.map(([hex, name]) => {
              const active = hex.toUpperCase() === color.hex.toUpperCase()
              return (
                <button
                  key={hex}
                  type="button"
                  aria-label={name}
                  aria-pressed={active}
                  title={name}
                  onClick={() => setColor(buildColorFromHex(hex))}
                  className={cn(
                    'w-7 h-7 border border-ink',
                    active && 'outline outline-2 outline-offset-1 outline-ink',
                  )}
                  style={{ backgroundColor: hex }}
                />
              )
            })}
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {color.name} · {color.hex.toUpperCase()}
          </p>
        </FieldGroup>

        <FormalitySlider value={formality} onChange={setFormality} />

        <AestheticsSelector selected={aesthetics} onToggle={toggleAesthetic} />

        <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
          <FieldGroup label="Brand">
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="—"
              className="w-full bg-transparent border-b border-ink pb-1 font-display text-[18px] focus:outline-none"
            />
          </FieldGroup>
          <FieldGroup label="Price">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="—"
              inputMode="decimal"
              className="w-full bg-transparent border-b border-ink pb-1 font-display text-[18px] focus:outline-none"
            />
          </FieldGroup>
        </div>

        <FieldGroup label="Status">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {(['owned', 'wishlist'] as const).map((o) => (
              <ChipButton key={o} active={ownership === o} onClick={() => setOwnership(o)}>
                {o}
              </ChipButton>
            ))}
          </div>
        </FieldGroup>
      </div>
    </Modal>
  )
}
