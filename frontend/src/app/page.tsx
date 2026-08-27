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

// The four-up feature grid. Each card carries a screenshot frame; the
// hatched placeholder renders until a real capture lands in
// frontend/public/screens/<shot>.png and `img` is set on the entry.
const FEATURES = [
  {
    n: '01',
    title: 'Style a piece you own',
    description: 'Upload one piece; the engine builds the rest around it.',
    shot: 'The styling flow',
    href: '/style',
  },
  {
    n: '02',
    title: 'Try it on with AI',
    description: 'See the finished outfit on your own photo before you commit.',
    shot: 'An AI try-on',
    href: '/style',
  },
  {
    n: '03',
    title: 'Mix and match',
    description: 'Pair anything new against every piece your closet already holds.',
    shot: 'The closet builder',
    href: '/closet',
  },
  {
    n: '04',
    title: 'Use it on any store',
    description: 'The Chrome extension reads product pages anywhere, SSENSE included.',
    shot: 'The extension at work',
    href: 'https://github.com/Paullitsc/Style-It-Yourself/tree/main/extension',
  },
]

// Verified references behind the color engine section, ordered as a
// ladder: the primary origin text, the reference entry, the empirical
// why, then the fashion application. Every URL was checked to resolve
// before shipping; do not add one without doing the same.
const COLOR_SOURCES = [
  {
    pub: 'Isaac Newton',
    title: 'Opticks (1704), origin of the color wheel',
    url: 'https://www.gutenberg.org/ebooks/33504',
  },
  {
    pub: 'Britannica',
    title: 'Color wheel: definition, art, and facts',
    url: 'https://www.britannica.com/science/color-wheel',
  },
  {
    pub: 'PNAS',
    title: 'An ecological valence theory of human color preference',
    url: 'https://www.pnas.org/doi/10.1073/pnas.0906172107',
  },
  {
    pub: 'Vogue',
    title: 'How to master color theory in clothing',
    url: 'https://www.vogue.com/article/color-theory-for-clothing',
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

      {/* FEATURES: a four-up teaser grid, the retail-catalog register.
          Cards are teasers, not documentation; the screenshots stay small
          on purpose. */}
      <section className={`${CONTAINER} pt-16 pb-24 max-md:pt-12 max-md:pb-16`}>
        <p className="m-0 mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          What it does
        </p>
        <h2 className="m-0 font-display font-normal text-[clamp(44px,5.5vw,76px)] leading-[0.98] tracking-[-0.02em]">
          Four ways in
        </h2>

        <div className="mt-10 max-md:mt-8 grid grid-cols-4 max-lg:grid-cols-2 max-md:grid-cols-1 gap-x-6 gap-y-12 max-md:gap-y-10">
          {FEATURES.map((feature) => (
            <Link
              key={feature.n}
              href={feature.href}
              className="group block"
              {...(feature.href.startsWith('http')
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {/* screenshot frame; hatched placeholder until real captures land */}
              <div className="relative aspect-[4/5] overflow-hidden border border-ink product__frame--placeholder">
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-paper font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                  <span>Screenshot to come</span>
                  <span>{feature.shot}</span>
                </span>
              </div>

              <p className="m-0 mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                {feature.n}
              </p>
              <h3 className="m-0 mt-1 font-display font-normal text-[clamp(22px,1.9vw,28px)] leading-[1.05] tracking-[-0.01em]">
                {feature.title}
                <span
                  aria-hidden="true"
                  className="inline-block ml-2 transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </h3>
              <p className="mt-2 mb-0 text-[13.5px] leading-[1.55] text-ink-3">
                {feature.description}
              </p>
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
                three families in equal tension.
              </p>
              <p className="m-0">
                Neutrals never appear on the wheel because they have no hue
                to place: zero saturation means no angle and no arc. They
                pair with everything.
              </p>

              {/* verified citations; do not add a link here without
                  checking it resolves */}
              <div className="mt-3">
                <p className="m-0 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  Sources
                </p>
                <ol className="m-0 list-none p-0">
                  {COLOR_SOURCES.map((source, i) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-baseline gap-3 py-[7px] font-mono text-[11px] uppercase tracking-[0.08em]"
                      >
                        <span className="text-ink-3">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 text-ink-2 transition-colors group-hover:text-ink">
                          {source.title}
                          <span className="text-ink-3"> - {source.pub}</span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-ink-3 transition-colors group-hover:text-ink"
                        >
                          ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <ColorWheel />
          </div>
        </div>
      </section>

    </div>
  )
}
