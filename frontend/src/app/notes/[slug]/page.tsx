import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NOTES, getNote } from '../notes'

interface NotePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return NOTES.map((note) => ({ slug: note.slug }))
}

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) return {}
  return {
    title: `${note.title} | SIY`,
    description: note.standfirst,
  }
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) notFound()

  const index = NOTES.findIndex((n) => n.slug === note.slug)
  const next = NOTES[(index + 1) % NOTES.length]

  return (
    <div className="flex-1">
      <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 pt-10 pb-24">
        {/* HEAD */}
        <section className="border-b border-ink pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">
            Note {note.number} of {String(NOTES.length).padStart(2, '0')}
          </p>
          <h1 className="m-0 max-w-[16ch] font-display font-normal uppercase text-[clamp(56px,8vw,112px)] leading-[0.92] tracking-[-0.025em]">
            {note.title}
          </h1>
          <p className="mt-[18px] max-w-[48ch] font-display text-[20px] leading-[1.35] text-ink-2">
            {note.standfirst}
          </p>
        </section>

        {/* BODY */}
        <section className="pt-10 max-w-[640px]">
          {note.body.map((paragraph, i) => (
            <p
              key={i}
              className={`text-[16px] leading-[1.75] ${i === 0 ? 'text-ink' : 'text-ink-2'} ${i > 0 ? 'mt-6' : ''}`}
            >
              {paragraph}
            </p>
          ))}
        </section>

        {/* FOOT */}
        <section className="border-t border-ink mt-14 pt-6 flex justify-between items-baseline gap-6 max-md:flex-col">
          <Link
            href="/notes"
            className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
          >
            ← All notes
          </Link>
          <Link
            href={`/notes/${next.slug}`}
            className="font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
          >
            Next: {next.title} →
          </Link>
        </section>
      </div>
    </div>
  )
}
