/**
 * Notes: short, evergreen pieces of the engine's rulebook, written out in
 * prose. Numbered like specimens rather than dated like posts, on purpose:
 * nothing here goes stale, so nothing demands a publishing cadence.
 */

export interface Note {
  slug: string
  number: string
  title: string
  /** One line max: the landing-page card subtext. */
  teaser: string
  standfirst: string
  body: string[]
}

export const NOTES: Note[] = [
  {
    slug: 'formality-is-a-distance',
    number: '01',
    title: 'Formality is a distance',
    teaser: 'A scale of five, measured in distance.',
    standfirst:
      'Casual to black tie is a scale of five, and an outfit fails when two pieces stand too far apart on it.',
    body: [
      'Every piece you add is placed on a five-point scale: casual, smart casual, business casual, formal, black tie. The number is not a judgment. It is a coordinate, and coordinates exist so that distance can be measured.',
      'When two pieces meet, the engine takes the difference between their levels. At zero or one apart, nobody notices; the outfit reads as one register. Two apart is a stretch, wearable when it is clearly on purpose. Past two, the engine warns you: the pieces have stopped describing the same event.',
      'Picture a formal suit jacket, level four, thrown over drawstring joggers, level one. The distance is three. Each piece is fine on its own; the pair is a costume. The warning is not about taste. It is about coherence.',
      'The rule cuts the other way, too. When an outfit warns, you rarely need to rebuild it. Find the one piece standing furthest from the others and swap it toward the group. A single substitution usually walks the whole outfit back inside the band.',
    ],
  },
  {
    slug: 'the-thirty-degree-rule',
    number: '02',
    title: 'The thirty degree rule',
    teaser: 'Harmony is arithmetic on a wheel.',
    standfirst:
      'Color harmony is not a talent. It is arithmetic on a wheel, and the first number worth memorizing is thirty.',
    body: [
      'Strip a color of its associations and what remains is a hue: a position between 0 and 360 degrees on a wheel. The distance between two colors is the shortest arc between their positions. Every color judgment the engine makes starts from that single number.',
      'Within thirty degrees, two hues are analogous. They share an undertone, so they read as shades of one decision: rust and mustard, olive and forest. This is the quietest harmony and the hardest one to get wrong.',
      'Across the wheel, at 180 degrees give or take fifteen, colors are complementary. Maximum contrast; each makes the other louder. This is the harmony of the statement outfit, and it budgets itself: one complementary pair per outfit is plenty.',
      'At 120 degrees apart, again give or take fifteen, sits the triadic relationship: balanced without being obvious. Everything else is no man’s land. A pair that lands there scores as a clash, and the engine says so out loud rather than letting the outfit find out in daylight.',
      'Neutrals sit outside the argument entirely. Black, white, gray, navy, beige, cream, tan, khaki: they pair with everything, which is why they anchor closets and why the engine treats them as always compatible.',
    ],
  },
  {
    slug: 'style-more-buy-less',
    number: '03',
    title: 'Style more, buy less',
    teaser: 'You already own the answer.',
    standfirst:
      'The most interesting garment you can acquire is a combination you already own and have never worn.',
    body: [
      'Twenty pieces combine into hundreds of outfits. Most people wear five of them on rotation, not because the others fail but because nobody can hold that many pairings in their head at eight in the morning.',
      'That gap is the reason this tool exists. Upload what you own and the engine does the remembering: which colors carry each other, which formality levels sit together, which combinations you have simply never tried.',
      'The try-on step matters for the same reason. Seeing an outfit on your own body, before any purchase, turns a maybe into a decision. Most of the time, the decision is that you already own the answer.',
      'Wishlist marks exist for the honest remainder: the genuine gaps in a closet. They are drawn in oxblood, deliberately loud, so that buying stays a decision instead of a reflex. Style it, yourself. The arithmetic is ours; the taste stays yours.',
    ],
  },
]

export function getNote(slug: string): Note | undefined {
  return NOTES.find((note) => note.slug === slug)
}
