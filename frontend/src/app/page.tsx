'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui'

const STEPS = [
  {
    num: '01',
    label: 'Upload',
    title: 'Photos of\nyour closet.',
    body: 'Snap or import a photo of each piece.',
  },
  {
    num: '02',
    label: 'Describe',
    title: 'Tags & color\npalette.',
    body: 'Add formality, aesthetic, and the colors we read.',
  },
  {
    num: '03',
    label: 'Outfit',
    title: 'Daily looks\non demand.',
    body: 'Get outfit recommendations from what you already own.',
  },
]

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()

  const handleStartStyling = () => {
    router.push(user ? '/closet' : '/style')
  }

  const scrollToSteps = () => {
    document
      .getElementById('steps')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col text-ink">
      {/* HERO */}
      <section className="px-[var(--gutter)] py-[var(--section-pad-y)] max-w-[1440px] w-full mx-auto">
        <h1 className="t-display-xl">
          An outfit<br />
          generator for<br />
          clothes you<br />
          already own.
        </h1>
        <div className="flex flex-wrap gap-6 mt-12">
          <Button onClick={handleStartStyling}>Start styling</Button>
          <Button variant="secondary" onClick={scrollToSteps}>
            How it works
          </Button>
        </div>
      </section>

      <hr className="border-t border-ink" />

      {/* STEPS */}
      <section
        id="steps"
        className="px-[var(--gutter)] py-16 max-w-[1440px] w-full mx-auto grid grid-cols-3 gap-[var(--col-gap)] max-md:grid-cols-1"
      >
        {STEPS.map((step) => (
          <article
            key={step.num}
            className="pt-8 border-t border-ink"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
              {step.num} / {step.label}
            </span>
            <h3 className="t-display-s mt-6 whitespace-pre-line">
              {step.title}
            </h3>
            <p className="t-body text-ink-2 mt-4">{step.body}</p>
          </article>
        ))}
      </section>

      <hr className="border-t border-ink" />

      {/* COLOPHON */}
      <footer className="px-[var(--gutter)] py-8 max-w-[1440px] w-full mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
          Style It Yourself · 2025 ·{' '}
          <Link
            href="mailto:hello@styleityourself.app"
            className="hover:text-ink"
          >
            Contact
          </Link>
        </p>
      </footer>
    </div>
  )
}
