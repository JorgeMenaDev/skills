# Campaign Play: Positioning

Use when the product's story is fuzzy, a retention curve never flattens (a PMF/ICP problem, not UX), or any downstream play (launch, channels, pricing, sales) keeps asking "who is this for?". The deliverable is a durable positioning section in `context.md`/`strategy.md` that every other play reads instead of re-asking — plus a `campaigns.md` row.

## The positioning core (write it, then keep it current)

Capture, in this order:

1. **Category** — the "shelf" customers search on, one-liner, business model.
2. **ICP + personas** — for B2B: user / champion / decision-maker / financial buyer; per persona what they care about and the value promised. **Anti-persona**: who is explicitly not a fit.
3. **Problem & cost** — the core pain, why current solutions fall short, what it costs (time/money/opportunity), in the customer's own words.
4. **Competitive rings** — direct (same solution), secondary (different solution, same problem), indirect (conflicting approach, incl. do-nothing/spreadsheet/hire) — and how each falls short honestly.
5. **Switching forces (JTBD)** — the highest-signal frame here: **Push** (frustration with the current way), **Pull** (what attracts them to you), **Habit** (what keeps them stuck), **Anxiety** (what worries them about switching). Messaging amplifies push+pull and defuses habit+anxiety.
6. **Customer language** — verbatim problem/solution phrases, words to use and avoid. Exact customer phrases beat polished descriptions.
7. **Proof points** — metrics, logos, testimonial snippets tied to value themes.

## Grounding it in evidence (never invent)

- **Live PostHog data first**: which segments actually activate and retain (cookbook retention query, segmented) — the retained core *is* the ICP, whatever the roadmap says. Replay-mining supplies verbatim friction language.
- **Watering holes** for language and triggers: reviews of competitors (4-star reviews are the honest ones), Reddit/HN, support tickets, sales-call notes. Extract jobs (functional/emotional/social), unprompted pain with emotional weight, **trigger events** (new hire, missed target, embarrassing incident), and alternatives considered.
- **Confidence discipline**: High = 3+ independent sources, unprompted, consistent across segments; Medium = 2 sources or prompted; Low = single source — label it. Minimum 5 independent data points per segment before a persona or messaging conclusion. Don't average across segments.

## Honesty rules (shared by all campaign plays)

- Banned vocabulary: "game-changing", "revolutionary", "10x", "secret", unverifiable "worth $X", "100% guaranteed" without conditions. Specificity beats superlatives.
- Claims tie to a number a skeptic can check ("cut reporting 80%", not "AI-powered").
- Acknowledge competitor strengths; say who shouldn't pick you — readers verify.

## Competitive pages (when positioning goes public)

Four formats by search intent: `[X] alternative` (switcher), `[X] alternatives` (researcher — list 4–7 real options, you first), `You vs X` (lead with a 3-sentence TL;DR + comparison table), `X vs Y` (capture evaluators of two rivals). Centralize competitor facts so updates propagate. Publishing these pages is search-channel work — hand the brief to `seo-growth-workspace`.

---
*Frameworks adapted from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT, © 2025 Corey Haines).*
