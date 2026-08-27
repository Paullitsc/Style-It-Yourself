import Image from 'next/image'
import {
  Badge,
  AiClothesIcon,
  CloudServerIcon,
  HugeiconsIcon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@siy/ui'
import Link from 'next/link'
import ColorWheel from './components/ColorWheel'
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

          <h2 className="m-0 font-display font-normal text-[clamp(44px,5.5vw,76px)] leading-[0.98] tracking-[-0.02em]">
            Free and staying that way
          </h2>

          {/* Headline spans the section; both columns start together at the
              same top line below it (items-start), so the rail reads as a
              deliberate sidebar instead of floating beside dead space. */}
          <div className="mt-8 max-md:mt-6 grid grid-cols-[1.25fr_1fr] max-md:grid-cols-1 gap-x-20 gap-y-10 items-start">
            <div className="flex flex-col gap-5 max-w-[60ch] font-display text-[clamp(17px,1.5vw,21px)] leading-[1.45]">
              <p className="m-0">
                Every closet has one: the piece bought on feeling that has
                never once been worn. The problem is not how much you own;
                it is that nobody ever taught you what pairs with what.
                You already have more outfits than you think. What is
                missing is the eye: palette, silhouette, formality. The
                industry calls that taste. Written down, it is arithmetic,
                and arithmetic can be learned.
              </p>
              <p className="m-0 text-ink-2">
                A whole business lives in the space between those two
                words. Fast fashion bottles your doubt and sells it back
                with every purchase; styling apps do the same by
                subscription. But the rules are small and old.
                Complementary colors sit opposite on the wheel. Formality
                runs a five-step scale, and an outfit fails when two
                pieces stop describing the same event. None of it is
                secret; it is just rarely written down. So we wrote it
                down, built a tool around it, and gave the tool away. No
                paywall, no ads, no tracking.
              </p>
              <p className="m-0">
                Along the way, SIY becomes your digital closet. What
                Amazon did to the bookshelf, this does to the wardrobe:
                every piece you own, catalogued by hue, cut, and occasion,
                ready to pair. Once the whole collection sits in one view,
                you finally see what is actually missing. And to the
                fashion enthusiasts: we are not against buying more
                clothes; we just want you to buy smarter.
              </p>
              <p className="m-0">
                TLDR, we open sourced SIY for the love of the game.
              </p>
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
                <Link
                  href="/style"
                  className="group inline-flex w-full items-center justify-between gap-8 px-[26px] py-[17px] border border-ink bg-transparent text-ink font-mono text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
                >
                  <span className="inline-flex items-center gap-3">
                    {/* svg inherits currentColor, so it flips with the
                        button's hover fill on its own */}
                    <HugeiconsIcon
                      icon={AiClothesIcon}
                      size={16}
                      strokeWidth={1}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                    Style it yourself
                  </span>
                  <span aria-hidden="true">↗</span>
                </Link>
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
                {/* bg-paper chip on the section's paper-2 band: the ground
                    inversion draws the boundary, no border needed. One line
                    always; the full story lives in the tooltip. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="mt-4 gap-1.5 cursor-help bg-paper px-2.5 py-1.5 text-[9px] whitespace-nowrap text-ink-3 underline decoration-ink-3 decoration-dotted underline-offset-4"
                    >
                      {/* hosting status mark; borrows Supabase's green
                          from the logo row above */}
                      <HugeiconsIcon
                        icon={CloudServerIcon}
                        size={13}
                        strokeWidth={1}
                        aria-hidden="true"
                        className="shrink-0 text-[#3FCF8E]"
                      />
                      Hosted free while the credits last
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    Hosted on free credits from the services above. Gemini
                    try-on burns them fastest, and past 20k users they run
                    out. Clone the repo on GitHub and set it up locally with
                    Claude Code or any other harnesses.
                  </TooltipContent>
                </Tooltip>
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

      {/* THE COLOR ENGINE: a full-bleed tinted band; the paper-2 ground
          divides the section on its own. */}
      <section className="bg-paper-2">
        <div className={`${CONTAINER} pt-12 pb-16 max-md:pt-9 max-md:pb-12`}>
          <p className="m-0 mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Color theory
          </p>
          <h2 className="m-0 font-display font-normal text-[clamp(44px,5.5vw,76px)] leading-[0.98] tracking-[-0.02em]">
            The color engine
          </h2>
          {/* Same anatomy as the manifesto: full-width headline, then two
              columns from one top line. Text argues left; the wheel and its
              readout demonstrate right. */}
          <div className="mt-8 max-md:mt-6 grid grid-cols-[1fr_1.1fr] max-md:grid-cols-1 gap-x-20 gap-y-10 items-start">
            <div className="flex flex-col gap-5 max-w-[60ch] font-display text-[clamp(17px,1.5vw,21px)] leading-[1.45]">
              <p className="m-0">
                Every color is read as an angle on a 360 degree wheel. When
                two pieces meet, the engine measures the arc between their
                hues, and the arc decides whether they belong together.
              </p>
              <p className="m-0 text-ink-2">
                Within 30 degrees the colors are analogous: neighbors that
                share an undertone. At 180 they are complementary, opposites
                that sharpen each other. At 120 apart they form a triad,
                three families in equal tension. Everything else clashes,
                and a clash costs an outfit 30 of its 100 points.
              </p>
              <p className="m-0">
                Neutrals never appear on the wheel because they have no hue
                to place: zero saturation means no angle, no arc, no
                penalty. They pair with everything. The wheel is that
                arithmetic, running live.
              </p>
            </div>

            <ColorWheel />
          </div>
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
