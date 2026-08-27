import Image from 'next/image'
import Link from 'next/link'
import { buildColorFromHex, classifyHarmony } from '@/lib/colorUtils'
import type { HarmonyType } from '@/lib/colorUtils'
import ColorWheel from './components/ColorWheel'
import Swatch from './components/Swatch'
import { NOTES } from './notes/notes'

// Subtexts are capped at one line on desktop; keep them short.
const WAYS_IN = [
  {
    title: 'Style a piece you own',
    description: 'Upload one piece; the engine builds the rest around it.',
  },
  {
    title: 'Dress for an occasion',
    description: 'Name the event; dress inside its band and palette.',
  },
  {
    title: 'Start from a color',
    description: 'Pick a hue; follow the wheel.',
  },
]

// Curated pairs only; every readout below (names, hues, arcs, verdicts) is
// computed by the same code that scores outfits, so the strip cannot drift
// from what the builder actually says.
const SPECIMEN_PAIRS: Array<[string, string]> = [
  ['#B45309', '#C9A227'],
  ['#7A1F2B', '#1F6F6B'],
  ['#6C2FA0', '#3A8F3A'],
]

// The -30 is the color-clash penalty from backend outfit scoring.
const HARMONY_VERDICTS: Record<HarmonyType, string> = {
  analogous: 'Analogous',
  complementary: 'Complementary',
  triadic: 'Triadic',
  neutral: 'Neutral',
  none: 'Clash -30',
}

const SPECIMENS = SPECIMEN_PAIRS.map(([hexA, hexB]) => {
  const a = buildColorFromHex(hexA)
  const b = buildColorFromHex(hexB)
  return { a, b, ...classifyHarmony(a, b) }
})

const CONTAINER = 'max-w-[1320px] w-full mx-auto px-14 max-md:px-6'

export default function Home() {
  return (
    <div className="flex-1">
      {/* STAGE. Sized so the first viewport ends exactly where the hero does —
          the manifesto section below begins right at the fold on any screen.
          The headline scales on both axes (vw for width, vh for height) so
          short screens never overflow; min-h lets extreme sizes (landscape
          phones) grow gracefully instead of crushing. */}
      <section className="min-h-[calc(100dvh-var(--masthead-h))] flex items-center justify-center">
        <div className={`${CONTAINER} py-10 max-md:py-8 text-center`}>
          <div>
            {/* HEADLINE */}
            <h1 className="font-display font-normal uppercase text-[clamp(56px,min(16vw,24vh),240px)] leading-[0.85] tracking-[-0.025em] m-0">
              Style it
              <br />
              yourself
            </h1>

            {/* LEDE */}
            <p className="mt-[clamp(14px,3vh,40px)] font-display text-[clamp(16px,2.4vh,22px)] leading-[1.35] text-ink-2">
              A free tool for putting clothes together with science and intention.
            </p>
          </div>
        </div>
      </section>

      {/* MANIFESTO: the "why this is free" mission statement, with a CTA
          and a logo cloud. A full-bleed tinted band; sections on this page
          are differentiated by alternating paper/paper-2 grounds, not rules.
          Brand marks render in their official colors by explicit product
          decision. */}
      <section className="bg-paper-2">
        <div className={`${CONTAINER} pt-14 pb-20 max-md:pt-10 max-md:pb-14`}>
          <p className="m-0 mb-5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Our Manifesto
          </p>

          <div className="grid grid-cols-[1.25fr_1fr] max-md:grid-cols-1 gap-x-20 gap-y-10 items-end">
            <div>
              <h2 className="m-0 font-display font-normal text-[clamp(44px,5.5vw,76px)] leading-[0.98] tracking-[-0.02em]">
                Free and staying that way
              </h2>

              <div className="mt-8 max-md:mt-6 flex flex-col gap-5 max-w-[60ch] font-display text-[clamp(17px,1.5vw,21px)] leading-[1.45]">
                <p className="m-0">
                  Ever bought a new piece of clothing and then realized you
                  have nothing to wear it with? You are not alone. The
                  problem is not how much you own. It is that nobody ever
                  taught you what pairs with what. You already have more
                  outfits than you think; what has been missing is the eye,
                  the taste for palette, silhouette, formality. And that eye
                  is a science you can learn, not a talent you are born
                  with. Anyone can become their own stylist.
                </p>
                <p className="m-0 text-ink-2">
                  However, a whole industry lives in that gap: fashion, or
                  more specifically, fast fashion. It bottles your doubt and
                  sells it back to you with every purchase. Software
                  services do the same with a monthly subscription, charging
                  for knowledge that should belong to everyone. So we built
                  this tool to close the gap instead: learn the rules, style
                  yourself, pay nothing. And we are not against buying more
                  clothes. Just buy the pieces your closet is actually
                  missing.
                </p>
                <p className="m-0">
                  That is why we open sourced SIY, for the love of the game.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-7 max-md:gap-6 items-end max-md:items-start">
              <div className="flex flex-col gap-3 w-[300px] max-md:w-full">
                <a
                  href="https://github.com/Paullitsc/Style-It-Yourself"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex w-full items-center justify-between gap-8 px-[26px] py-[17px] border border-ink bg-transparent text-ink font-mono text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
                >
                  <span className="inline-flex items-center gap-3">
                    <Image
                      src="/logos/github.svg"
                      alt="GitHub"
                      width={16}
                      height={16}
                      className="transition group-hover:invert"
                    />
                    Run it yourself
                  </span>
                  <span aria-hidden="true">↗</span>
                </a>
                <a
                  href="https://github.com/Paullitsc/Style-It-Yourself/tree/main/extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex w-full items-center justify-between gap-8 px-[26px] py-[17px] border border-ink bg-transparent text-ink font-mono text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
                >
                  <span className="inline-flex items-center gap-3">
                    <Image
                      src="/logos/googlechrome.svg"
                      alt="Chrome"
                      width={16}
                      height={16}
                    />
                    Get the extension
                  </span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>

              <div className="text-right max-md:text-left">
                <p className="m-0 mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  Kept online by
                </p>
                <div className="flex items-center justify-end max-md:justify-start gap-5 max-md:gap-4 flex-wrap">
                  {(
                    [
                      ['supabase', 'Supabase'],
                      ['vercel', 'Vercel'],
                      ['cloudflare', 'Cloudflare'],
                      ['googlegemini', 'Gemini'],
                    ] as const
                  ).map(([slug, name]) => (
                    <span key={slug} className="inline-flex items-center gap-2">
                      <Image
                        src={`/logos/${slug}.svg`}
                        alt=""
                        width={14}
                        height={14}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2">
                        {name}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="m-0 mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  This hosted copy stays free until the credits run out
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WAYS IN: a bare oversized index. */}
      <section className={`${CONTAINER} pt-16 pb-24 max-md:pt-12 max-md:pb-16`}>
        <div className="divide-y divide-rule-soft">
          {WAYS_IN.map((way) => (
            <Link
              key={way.title}
              href="/style"
              className="group flex items-baseline justify-between gap-8 max-md:gap-4 py-8 max-md:py-6"
            >
              <span>
                <span className="block font-display font-normal text-[clamp(34px,4.2vw,56px)] leading-[1.02] tracking-[-0.015em]">
                  {way.title}
                </span>
                <span className="block mt-3 text-[13.5px] leading-[1.55] text-ink-3">
                  {way.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="font-display text-[28px] leading-none transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* THE ENGINE: a full-bleed tinted band; the paper-2 ground divides the
          section on its own. */}
      <section className="bg-paper-2">
        <div className={`${CONTAINER} py-16 max-md:py-12`}>
          <p className="m-0 font-display text-[22px] leading-[1.35] text-ink-2">
            Point at a hue; whatever stays lit wears well with it.
          </p>

          <div className="mt-12">
            <ColorWheel />
          </div>

          <p className="mt-16 mb-0 font-display text-[17px] leading-[1.4] text-ink-2">
            Three worked examples from the same arithmetic; nothing is a
            mockup.
          </p>

          <div className="mt-6 divide-y divide-rule-soft">
            {SPECIMENS.map((spec) => (
              <div
                key={spec.a.hex + spec.b.hex}
                className="grid grid-cols-[1.3fr_1.3fr_0.6fr_1fr] max-md:grid-cols-2 gap-x-6 gap-y-2 items-center py-[14px] font-mono text-[11px] uppercase tracking-[0.1em]"
              >
                <Swatch color={spec.a} />
                <Swatch color={spec.b} />
                <span className="text-ink-3">Arc {spec.hueDistance}°</span>
                <span
                  className={`text-right max-md:text-left ${spec.harmony === 'none' ? 'text-accent' : ''}`}
                >
                  {HARMONY_VERDICTS[spec.harmony]}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/style"
            className="inline-block mt-7 font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent hover:border-ink transition-colors"
          >
            Run your own numbers →
          </Link>
        </div>
      </section>

      {/* NOTES */}
      <section className={`${CONTAINER} pt-20 pb-24 max-md:pt-14 max-md:pb-16`}>
        <h2 className="m-0 font-display font-normal text-[clamp(40px,5vw,64px)] leading-none tracking-[-0.02em]">
          Notes
        </h2>
        <div className="mt-10 grid grid-cols-3 max-md:grid-cols-1 gap-x-10 gap-y-12">
          {NOTES.map((note) => (
            <Link
              key={note.slug}
              href={`/notes/${note.slug}`}
              className="group block"
            >
              <h3 className="m-0 font-display font-normal text-[clamp(26px,2.6vw,34px)] leading-[1.05] tracking-[-0.01em]">
                {note.title}
              </h3>
              <p className="mt-3 mb-0 font-display text-[17px] leading-[1.4] text-ink-2">
                {note.teaser}
              </p>
              <span className="inline-block mt-5 font-mono text-[11px] uppercase tracking-[0.12em] pb-[2px] border-b border-transparent group-hover:border-ink transition-colors">
                Read the note →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
