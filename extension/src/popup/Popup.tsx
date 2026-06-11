import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CONNECT_PATH, WEB_APP_URL } from '../config'
import { analyzeProduct, importItem, matchProduct } from '../lib/api'
import { disconnect, isConnected, NotAuthenticatedError } from '../lib/auth'
import { COLOR_PALETTE } from '../lib/color'
import {
  AESTHETIC_TAGS,
  CATEGORY_L1,
  CATEGORY_TAXONOMY,
  MAX_AESTHETICS,
} from '../lib/constants'
import { getActiveTabProduct } from '../lib/messaging'
import type { Color, MatchResponse, Ownership, RawProduct } from '../lib/types'

type Phase = 'loading' | 'signedOut' | 'reading' | 'analyzing' | 'ready' | 'error'
type View = 'add' | 'match'

interface FormState {
  color: Color
  categoryL1: string
  categoryL2: string
  formality: number
  aesthetics: string[]
  brand: string
  price: string
  ownership: Ownership
  imageUrl: string | null
  sourceUrl: string
  title: string | null
}

export function Popup() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string>('')
  const [product, setProduct] = useState<RawProduct | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [view, setView] = useState<View>('add')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [matchLoading, setMatchLoading] = useState(false)
  const [match, setMatch] = useState<MatchResponse | null>(null)
  const [actionError, setActionError] = useState('')

  const init = useCallback(async () => {
    setPhase('loading')
    setError('')
    try {
      if (!(await isConnected())) {
        setPhase('signedOut')
        return
      }
      setPhase('reading')
      const raw = await getActiveTabProduct()
      setProduct(raw)

      setPhase('analyzing')
      const analysis = await analyzeProduct(raw)
      setForm({
        color: analysis.color ?? COLOR_PALETTE[0],
        categoryL1: analysis.category.l1,
        categoryL2: analysis.category.l2,
        formality: clampLevel(analysis.formality),
        aesthetics: analysis.aesthetics,
        brand: analysis.brand ?? '',
        price: analysis.price != null ? String(analysis.price) : '',
        ownership: 'owned',
        imageUrl: analysis.image_url ?? raw.image,
        sourceUrl: analysis.source_url,
        title: analysis.title ?? raw.title,
      })
      setPhase('ready')
    } catch (err) {
      if (err instanceof NotAuthenticatedError) {
        setPhase('signedOut')
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    void init()
  }, [init])

  const handleConnect = () => {
    const url = `${WEB_APP_URL}${CONNECT_PATH}?extId=${chrome.runtime.id}`
    void chrome.tabs.create({ url })
    window.close()
  }

  const handleDisconnect = async () => {
    await disconnect()
    setProduct(null)
    setForm(null)
    setMatch(null)
    setSaved(false)
    setPhase('signedOut')
  }

  const handleImport = async () => {
    if (!form) return
    if (!form.imageUrl) {
      setActionError('No product image found to import.')
      return
    }
    setSaving(true)
    setActionError('')
    try {
      await importItem({
        color: form.color,
        category: { l1: form.categoryL1, l2: form.categoryL2 },
        formality: form.formality,
        aesthetics: form.aesthetics,
        image_url: form.imageUrl,
        brand: form.brand.trim() || null,
        price: parsePrice(form.price),
        source_url: form.sourceUrl,
        ownership: form.ownership,
        title: form.title,
      })
      setSaved(true)
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return handleDisconnect()
      setActionError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleMatch = useCallback(async () => {
    if (!form) return
    setMatchLoading(true)
    setActionError('')
    try {
      const result = await matchProduct(
        {
          color: form.color,
          category: { l1: form.categoryL1, l2: form.categoryL2 },
          formality: form.formality,
          aesthetics: form.aesthetics,
        },
        form.imageUrl,
      )
      setMatch(result)
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return handleDisconnect()
      setActionError(err instanceof Error ? err.message : 'Failed to match.')
    } finally {
      setMatchLoading(false)
    }
  }, [form])

  // Auto-run matching the first time the user opens the Match tab.
  useEffect(() => {
    if (view === 'match' && form && !match && !matchLoading) {
      void handleMatch()
    }
  }, [view, form, match, matchLoading, handleMatch])

  return (
    <>
      <header className="masthead">
        <span className="wordmark">Style It Yourself</span>
        {phase !== 'signedOut' && phase !== 'loading' && (
          <button className="disconnect" onClick={handleDisconnect}>
            Disconnect
          </button>
        )}
      </header>

      <div className="body">
        {phase === 'loading' && <Centered>Loading…</Centered>}

        {phase === 'signedOut' && <ConnectScreen onConnect={handleConnect} />}

        {phase === 'reading' && <Centered>Reading this page…</Centered>}
        {phase === 'analyzing' && <Centered>Analyzing the product…</Centered>}

        {phase === 'error' && (
          <>
            <div className="banner error">{error}</div>
            <button className="btn full" onClick={() => void init()}>
              Try again
            </button>
          </>
        )}

        {phase === 'ready' && form && product && (
          <>
            <ProductPreview imageUrl={form.imageUrl} title={form.title} sourceUrl={form.sourceUrl} />

            <div className="tabs">
              <button
                className={`tab ${view === 'add' ? 'active' : ''}`}
                onClick={() => setView('add')}
              >
                Add to closet
              </button>
              <button
                className={`tab ${view === 'match' ? 'active' : ''}`}
                onClick={() => setView('match')}
              >
                Check match
              </button>
            </div>

            {view === 'add' &&
              (saved ? (
                <SavedScreen
                  ownership={form.ownership}
                  onAddAnother={() => {
                    setSaved(false)
                  }}
                />
              ) : (
                <AddForm
                  form={form}
                  setForm={setForm}
                  saving={saving}
                  error={actionError}
                  onSubmit={handleImport}
                />
              ))}

            {view === 'match' && (
              <MatchView
                loading={matchLoading}
                data={match}
                error={actionError}
                onRetry={handleMatch}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function ConnectScreen({ onConnect }: { onConnect: () => void }) {
  return (
    <>
      <p className="serif" style={{ fontSize: 22, lineHeight: 1.15, margin: 0 }}>
        Connect your <span className="italic">closet</span>.
      </p>
      <p className="muted" style={{ margin: 0 }}>
        Sign in to Style It Yourself to add pieces from any store and check what
        already pairs with them.
      </p>
      <button className="btn primary full" onClick={onConnect}>
        Connect Style It Yourself →
      </button>
    </>
  )
}

function ProductPreview({
  imageUrl,
  title,
  sourceUrl,
}: {
  imageUrl: string | null
  title: string | null
  sourceUrl: string
}) {
  let host = ''
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    host = ''
  }
  return (
    <div className="preview">
      {imageUrl ? (
        <img className="thumb" src={imageUrl} alt={title ?? 'product'} />
      ) : (
        <div className="thumb" />
      )}
      <div>
        <p className="title">{title ?? 'Untitled product'}</p>
        {host && <span className="eyebrow">{host}</span>}
      </div>
    </div>
  )
}

function SavedScreen({
  ownership,
  onAddAnother,
}: {
  ownership: Ownership
  onAddAnother: () => void
}) {
  return (
    <>
      <div className="banner success">
        Saved to your {ownership === 'wishlist' ? 'wishlist' : 'closet'}.
      </div>
      <button className="btn full" onClick={onAddAnother}>
        Edit &amp; save again
      </button>
    </>
  )
}

// ---------------------------------------------------------------------------
// Add form
// ---------------------------------------------------------------------------

function AddForm({
  form,
  setForm,
  saving,
  error,
  onSubmit,
}: {
  form: FormState
  setForm: (updater: (prev: FormState | null) => FormState | null) => void
  saving: boolean
  error: string
  onSubmit: () => void
}) {
  const update = (patch: Partial<FormState>) =>
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))

  const l2Options = CATEGORY_TAXONOMY[form.categoryL1] ?? []
  const palette = withDetectedColor(form.color)

  const toggleAesthetic = (tag: string) => {
    const has = form.aesthetics.includes(tag)
    if (has) {
      update({ aesthetics: form.aesthetics.filter((t) => t !== tag) })
    } else if (form.aesthetics.length < MAX_AESTHETICS) {
      update({ aesthetics: [...form.aesthetics, tag] })
    }
  }

  return (
    <>
      <Field label="Category">
        <div className="chips">
          {CATEGORY_L1.map((l1) => (
            <button
              key={l1}
              className={`chip ${form.categoryL1 === l1 ? 'active' : ''}`}
              onClick={() =>
                update({
                  categoryL1: l1,
                  categoryL2: (CATEGORY_TAXONOMY[l1] ?? [''])[0],
                })
              }
            >
              {l1}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Type">
        <div className="chips">
          {l2Options.map((l2) => (
            <button
              key={l2}
              className={`chip ${form.categoryL2 === l2 ? 'active' : ''}`}
              onClick={() => update({ categoryL2: l2 })}
            >
              {l2}
            </button>
          ))}
        </div>
      </Field>

      <Field label={`Color · ${form.color.name}`}>
        <div className="swatches">
          {palette.map((c) => (
            <button
              key={c.hex}
              className={`swatch ${c.hex === form.color.hex ? 'active' : ''}`}
              style={{ background: c.hex }}
              title={c.name}
              aria-label={c.name}
              onClick={() => update({ color: c })}
            />
          ))}
        </div>
      </Field>

      <Field label="Formality">
        <div className="formality">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`cell ${n <= Math.round(form.formality) ? 'on' : ''}`}
              aria-label={`Formality ${n}`}
              onClick={() => update({ formality: n })}
            />
          ))}
        </div>
      </Field>

      <Field label={`Aesthetics · ${form.aesthetics.length}/${MAX_AESTHETICS}`}>
        <div className="chips">
          {AESTHETIC_TAGS.map((tag) => {
            const active = form.aesthetics.includes(tag)
            const disabled = !active && form.aesthetics.length >= MAX_AESTHETICS
            return (
              <button
                key={tag}
                className={`chip ${active ? 'active' : ''}`}
                disabled={disabled}
                onClick={() => toggleAesthetic(tag)}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="Brand">
        <input
          className="text-input"
          value={form.brand}
          placeholder="—"
          onChange={(e) => update({ brand: e.target.value })}
        />
      </Field>

      <Field label="Price">
        <input
          className="text-input"
          value={form.price}
          placeholder="—"
          inputMode="decimal"
          onChange={(e) => update({ price: e.target.value })}
        />
      </Field>

      <Field label="Status">
        <div className="chips">
          {(['owned', 'wishlist'] as Ownership[]).map((o) => (
            <button
              key={o}
              className={`chip ${form.ownership === o ? 'active' : ''}`}
              onClick={() => update({ ownership: o })}
            >
              {o}
            </button>
          ))}
        </div>
      </Field>

      {error && <div className="banner error">{error}</div>}

      <button className="btn primary full" disabled={saving} onClick={onSubmit}>
        {saving ? <span className="spinner" /> : 'Save to closet →'}
      </button>
    </>
  )
}

// ---------------------------------------------------------------------------
// Match view
// ---------------------------------------------------------------------------

function MatchView({
  loading,
  data,
  error,
  onRetry,
}: {
  loading: boolean
  data: MatchResponse | null
  error: string
  onRetry: () => void
}) {
  if (loading) return <Centered>Scanning your closet…</Centered>
  if (error)
    return (
      <>
        <div className="banner error">{error}</div>
        <button className="btn full" onClick={onRetry}>
          Try again
        </button>
      </>
    )
  if (!data) return null

  return (
    <>
      <div className="spread">
        <p className="summary">{data.summary}</p>
      </div>
      <div className="score">
        Cohesion {data.cohesion_score}/100 · {data.verdict}
      </div>

      {data.warnings.length > 0 && (
        <ul className="warnings">
          {data.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {data.matches_by_category.map((group) => {
        const items = group.items.length ? group.items : group.other_items
        if (!items.length) return null
        return (
          <div className="match-group" key={group.category_l1}>
            <span className="eyebrow">
              {group.category_l1}
              {group.items.length === 0 ? ' · other options' : ''}
            </span>
            <div className="match-row">
              {items.map((item) => (
                <div className="match-card" key={item.id}>
                  <img src={item.image_url} alt={`${item.color.name} ${item.category.l2}`} />
                  <div className="cap">
                    {item.color.name} {item.category.l2}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {data.total_closet_items === 0 && (
        <p className="muted center">Add pieces to your closet to see matches.</p>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="center muted" style={{ padding: '24px 0' }}>
      <span className="spinner" style={{ marginRight: 8 }} />
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function clampLevel(formality: number): number {
  return Math.max(1, Math.min(5, Math.round(formality)))
}

function parsePrice(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function withDetectedColor(detected: Color): Color[] {
  if (COLOR_PALETTE.some((c) => c.hex === detected.hex)) return COLOR_PALETTE
  return [detected, ...COLOR_PALETTE]
}
