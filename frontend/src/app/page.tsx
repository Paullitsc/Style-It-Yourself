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
import StackPages from './components/StackPages'

const EXTENSION_REPO_URL =
  'https://github.com/Paullitsc/Style-It-Yourself/tree/main/extension'

// The four-up feature grid. Every screenshot is a live capture of the
// real UI (frontend/public/screens/); replace the files, keep the names.
// The description strings below are the card copy.
const FEATURES = [
  {
    title: 'Style a piece you own',
    description: 'Upload your favorite piece with all of its details, and the engine will suggest what to pair it with.',
    img: '/screens/styling-flow.png',
  },
  {
    title: 'Try it on with AI',
    description: 'See the finished outfit on your own photo before you commit with Google Nano Banana Pro frontier image model.',
    img: '/screens/ai-try-on.png',
  },
  {
    title: 'Mix and match',
    description: 'Pair anything new against every piece your closet already holds.',
    img: '/screens/closet-builder.png',
  },
  {
    title: 'Use it on any store',
    description: 'The Chrome extension reads product pages anywhere on the web, so you can style it yourself without leaving the retailer.',
    img: '/screens/extension.png',
  },
]

// Verified reading behind the color engine section. Every URL was
// checked to resolve before shipping; do not add one without doing the
// same.
const READINGS = [
  {
    pub: 'Vogue',
    logo: '/logos/vogue.svg',
    title: 'How to master color theory in clothing',
    url: 'https://www.vogue.com/article/color-theory-for-clothing',
  },
]

const CONTAINER = 'max-w-[1320px] w-full mx-auto px-14 max-md:px-6'

export default function Home() {
  return (
    <div className="flex-1">
      <StackPages>
      {/* STAGE. Sized so the first viewport ends exactly where the hero does —
          the manifesto section below begins right at the fold on any screen.
          The headline scales on both axes (vw for width, vh for height) so
          short screens never overflow; min-h lets extreme sizes (landscape
          phones) grow gracefully instead of crushing. */}
      <section className="bg-paper min-h-[calc(100dvh-var(--masthead-h))] flex items-center justify-center">
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
      <section className="bg-paper-2 min-h-[calc(100dvh-var(--masthead-h))]">
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
                Remember that one piece you bought on feeling that has a
                high cost per wear, or do you, in fact, have a few of
                those? Have you wondered why you never wear them? Or have
                you never once gotten a compliment on your outfit? The
                answer is that they don&apos;t pair with anything else you
                own, or you just don&apos;t know how to pair them. It took
                us a long time and a wardrobe full of random pieces to
                realize that the problem is not how much we own, but that
                nobody ever taught us what pairs with what. We already
                have more great outfits than we think. What is missing is
                the eye: palette, silhouette, formality. The industry
                calls that taste. We want to educate your eye toward that
                taste, so that eventually you won&apos;t need us anymore.
                We want to make you a better stylist, not a better
                shopper.
              </p>
              <p className="m-0">
                Most brands, especially fast fashion ones, bottle your
                doubt and sell it back with every purchase, every trend
                cycle. On the other side, we have multiple apps out there
                pretending to solve the problem, by making you think you
                paid a bargain price for a piece (while they claim
                affiliate commissions) or by selling you the idea of
                advanced AI styling, but in reality they are just another
                subscription. But the rules are small and old.
                Complementary colors sit opposite on the wheel. Formality
                runs a five-step scale, and an outfit fails when two
                pieces stop describing the same event. So we wrote them
                down, built a tool around them, and gave the tool away.
                Open-source, no paywall, no ads, no tracking.
              </p>
              <p className="m-0">
                Along the way, SIY can become your digital closet. Books,
                music, and movies have all been digitized. Why not
                clothes? Once the whole collection sits in one view, you
                finally see what is actually missing. And to the fashion
                enthusiasts: we are not against buying more clothes. We
                just want you to buy smarter.
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
                  href={EXTENSION_REPO_URL}
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

      {/* FEATURES: a vertical index; every feature is its own sub-section
          pairing a large capture with its copy, image side alternating row
          by row. Screenshots live in frontend/public/screens/ (replace the
          files, keep the names); card copy lives in FEATURES above. */}
      <section className={`bg-paper pt-16 pb-24 max-md:pt-12 max-md:pb-16`}>
        <div className={CONTAINER}>
        <div className="divide-y divide-rule-soft">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="grid grid-cols-2 max-md:grid-cols-1 gap-x-16 gap-y-7 items-center py-14 max-md:py-10 first:pt-0"
            >
              <div
                className={
                  i % 2 === 1 ? 'md:order-2 max-md:order-first' : 'max-md:order-first'
                }
              >
                <div className="relative aspect-[3/2] overflow-hidden border border-ink product__frame--placeholder">
                  <Image
                    src={feature.img}
                    alt={`${feature.title} in Style It Yourself`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-left-top"
                  />
                </div>
              </div>

              <div>
                <h3 className="m-0 font-display font-normal text-[clamp(30px,3.2vw,46px)] leading-[1.02] tracking-[-0.015em]">
                  {feature.title}
                </h3>
                <p className="mt-4 mb-0 max-w-[46ch] text-[15px] leading-[1.6] text-ink-3">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* One action row for the whole grid: three cards share the same
            destination, so the button is stated once, beside the
            extension's. Mirrors the manifesto rail pair. */}
        <div className="mt-12 max-md:mt-10 flex justify-center gap-3 max-md:flex-col">
          <Link
            href="/style"
            className="group inline-flex w-[300px] max-md:w-full items-center justify-between gap-6 px-[22px] py-[15px] border border-ink bg-transparent text-ink font-mono text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
          >
            <span className="inline-flex items-center gap-3">
              <HugeiconsIcon
                icon={AiClothesIcon}
                size={15}
                strokeWidth={1}
                aria-hidden="true"
                className="shrink-0"
              />
              Try it here
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <a
            href={EXTENSION_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex w-[300px] max-md:w-full items-center justify-between gap-6 px-[22px] py-[15px] border border-ink bg-transparent text-ink font-mono text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
          >
            <span className="inline-flex items-center gap-3">
              <Image
                src="/logos/googlechrome.svg"
                alt=""
                width={15}
                height={15}
              />
              Try it with extension
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        </div>
      </section>

      {/* THE COLOR ENGINE: a full-bleed tinted band; the paper-2 ground
          divides the section on its own. */}
      <section className="bg-paper-2 min-h-[calc(100dvh-var(--masthead-h))]">
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

              <div className="mt-3">
                <p className="m-0 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  Recommended readings
                </p>
                {READINGS.map((reading) => (
                  <a
                    key={reading.url}
                    href={reading.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 py-[7px] font-mono text-[11px] uppercase tracking-[0.08em]"
                  >
                    <Image
                      src={reading.logo}
                      alt={reading.pub}
                      width={58}
                      height={16}
                      className="h-[13px] w-auto shrink-0"
                    />
                    <span className="flex-1 text-ink-2 transition-colors group-hover:text-ink">
                      {reading.title}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-ink-3 transition-colors group-hover:text-ink"
                    >
                      ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <ColorWheel />
          </div>
        </div>
      </section>
      </StackPages>
    </div>
  )
}
