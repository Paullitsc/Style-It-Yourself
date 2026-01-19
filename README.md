# Style It Yourself (SIY) — Intentional Fashion for the Modern Closet

2-min demo: https://devpost.com/software/siy-style-it-yourself

## Inspiration

We've all been there. You buy a piece you love—maybe a bold jacket or a statement shoe—only to get home and realize it doesn't go with anything you own. So you buy more to match it. And then more. The cycle continues.

As a team with a few self-admitted shopaholics, we've lived this loop. After years of watching fashion flood the market (and our closets), we started asking: *what if fashion could be more intentional?* Not about owning less, but about styling smarter.

We're inspired by a simple truth about human nature: **we want access, but we chase excess**. SIY flips that script—helping you see how pieces work *before* you buy, and building outfits that actually make sense together.

---

## What It Does

SIY is a personal styling assistant that helps you:

1. **Upload a clothing item** and instantly extract its dominant color
2. **Get smart recommendations** for complementary pieces based on color theory
3. **Validate your outfit** with real-time compatibility checks (color, formality, aesthetics)
4. **Try it on virtually** using AI-powered image generation
5. **Save looks to your closet** for future reference

---

## How We Built It

### Planning First

We started by defining clear use cases, then translated them into **sequence diagrams** that mapped every interaction between the user, frontend, backend, and external services. This gave us a shared blueprint before writing a single line of code.

### Backend Architecture

We followed **Model-View-Controller (MVC)** principles:

- **Schemas first**: Defined all DTOs and business models in `schemas.py` before implementation
- **Core services**:
  - `gemini.py` — AI try-on generation (single item + full outfit)
  - `color_harmony.py` — Color theory engine
  - `compatibility.py` — Multi-dimensional outfit validation
- **Database & Auth**: Supabase (PostgreSQL + JWT authentication + Storage)
- **Routers**: Clean REST endpoints with unit tests for each

### The Color Theory Engine

At the heart of SIY is a color compatibility system built on the **HSL color model**. We calculate harmony using established color theory principles:

**Hue Distance Calculation:**

$$d(h_1, h_2) = \min(|h_1 - h_2|, 360 - |h_1 - h_2|)$$

This gives us the shortest angular distance between two hues on the color wheel, accounting for its circular nature.

**Harmony Rules:**

| Harmony Type | Condition | Visual Effect |
|--------------|-----------|---------------|
| Analogous | $d \leq 30°$ | Unified, cohesive |
| Complementary | $165° \leq d \leq 195°$ | High contrast, "pop" |
| Triadic | $105° \leq d \leq 135°$ | Balanced, vibrant |
| Neutral | N/A | Universally compatible |

### Outfit Scoring Algorithm

We use a **penalty-based cohesion score** starting at 100:

$$\text{Score} = 100 - P_{\text{color}} - P_{\text{formality}} - P_{\text{aesthetic}}$$

Where:
- $P_{\text{color}} = 30$ for color clashes
- $P_{\text{formality}} = 40$ for formality mismatch (> 2 levels apart on a 1-5 scale)
- $P_{\text{aesthetic}} = 30$ for no shared style tags

### Frontend

- **Next.js** with **Tailwind CSS** for rapid UI development
- **Zustand** for lightweight state management
- **ColorThief.js** for client-side color extraction

---

## Challenges We Faced

**Frontend debugging**: Most of our team comes from backend backgrounds. Debugging React state and styling edge cases took longer than expected—though AI-assisted refactoring helped us clean up the codebase significantly.

**AI latency vs. quality tradeoff**: Gemini's image generation produces realistic try-on results, but response times can be slow. We optimized with loading states and async handling, but real-time feel remains a challenge.

**UX iteration**: We underestimated how much design iteration would be needed. In hindsight, more wireframing upfront would have saved development time.

---

## What We Learned

- **Sequence diagrams are underrated**. They forced us to think through edge cases before coding.
- **Schema-first development** pays off. Defining types early prevented countless integration bugs.
- **Color theory is surprisingly mathematical**. What feels like "good taste" often has geometric foundations on the color wheel.

---

## What's Next — Scaling Up

1. **Smarter Recommendations**: Train a model on real outfit data to move beyond rule-based harmony into learned style preferences.

2. **Social Features**: Let users share outfits, follow stylists, and get community feedback—turning SIY into a style discovery platform.

3. **Marketplace Integration**: Connect "wishlist" items to retailers with affiliate links, creating a path from inspiration to purchase without leaving the app.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, Tailwind CSS, Zustand |
| Backend | FastAPI (Python 3.11+) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| AI | Google Gemini API |

---

*Built with intention, styled with math.*
