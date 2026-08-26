import type { Metadata } from 'next'
import Link from 'next/link'
import { NOTES } from './notes'

export const metadata: Metadata = {
  title: 'Notes | SIY',
  description:
    'Short, evergreen notes from the styling engine: formality, color harmony, and dressing from what you own.',
}

export default function NotesPage() {
  return (
    <div className="flex-1">
      <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 pt-10 pb-24">
        {/* HEAD */}
        <section className="border-b border-ink pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
            Index
          </p>
          <h1 className="m-0 font-display font-normal uppercase text-[clamp(72px,9vw,128px)] leading-[0.92] tracking-[-0.025em]">
            Notes
          </h1>
          <p className="mt-[18px] max-w-[48ch] font-display text-[20px] leading-[1.35] text-ink-2">
            The engine&apos;s rulebook, written out in prose. Numbered, not
            dated; nothing here goes out of season.
          </p>
        </section>

        {/* LIST */}
        <section>
          {NOTES.map((note) => (
            <Link
              key={note.slug}
              href={`/notes/${note.slug}`}
              className="group grid grid-cols-[80px_1fr_auto] max-md:grid-cols-[44px_1fr_auto] gap-x-8 max-md:gap-x-4 items-baseline py-8 border-b border-rule-soft"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                {note.number}
              </span>
              <span>
                <span className="block font-display font-normal text-[clamp(28px,3.2vw,42px)] leading-[1.05] tracking-[-0.01em]">
                  {note.title}
                </span>
                <span className="block mt-2 max-w-[58ch] font-display text-[17px] leading-[1.4] text-ink-2">
                  {note.standfirst}
                </span>
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent group-hover:border-ink transition-colors">
                Read →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
