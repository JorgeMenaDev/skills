# Campaign Play: Pricing

Use when setting initial pricing, judging whether to raise it, restructuring tiers, or tuning in-product monetization. Pricing changes are hard to reverse socially (grandfathering, announcements) — evidence first, and the verdict lands in `strategy.md` + `campaigns.md`.

## Separate the three axes

Most pricing debates conflate: **packaging** (what's in each tier), **metric** (what you charge for), **price point** (how much). Decide them in that order.

- **Value metric test**: "as a customer uses more of [metric], do they get more value?" A good metric aligns price with value, is understandable, scales with the customer, resists gaming. This is where PostHog earns its place: run the **usage–value correlation** — which usage patterns predict retention and expansion (cookbook retention query joined against candidate usage events)? The pattern that predicts retention is your value metric and your tier gate. Guessing the metric from the roadmap is the failure mode.
- **Price point bounds**: floor = next-best alternative, ceiling = perceived value; cost-to-serve is only a sanity baseline.

## Structure

- **Good–Better–Best** default: entry tier removes barriers, middle anchors (most land there), premium ≈ 2–3× middle. Differentiate by feature gates, usage limits, support, and access (API/SSO/audit). Two tiers leaves money on the table; four-plus risks paralysis.
- **Freemium vs trial**: freemium only when free users create value (network effects, virality) and marginal cost is low; trial when time-to-value is short-ish and buyers are B2B. Card-upfront trials convert far higher at lower volume — pick by whether volume or intent is scarce. Reverse trial (full access, then downgrade) is the strong hybrid.
- **Raise prices when**: competitors raised and nobody flinched, "so cheap!" shows up in feedback, trial→paid conversion is high (>~40%), churn is low, and real value shipped since last pricing. Grandfather existing customers, announce months out, tie to the added value.

## Research that beats asking "what would you pay"

- **Van Westendorp** (too expensive / getting expensive / bargain / too cheap → plot intersections for the acceptable range) when you have 100+ respondents, segmented.
- **MaxDiff** for packaging: top-utility features go in every tier; middle utilities are the tier differentiators; bottom fifth is cut or add-on.
- Below survey scale: the usage–value correlation plus win/loss interview language outrank any hypothetical-dollar question.

## The offer lens (for high-touch/services tiers)

Value = (dream outcome × perceived likelihood) ÷ (time delay × effort) — the value equation (per Alex Hormozi's *$100M Offers*, credited via marketingskills). Score each lever; fix the lowest one per iteration. The most underweighted lever is **perceived likelihood**: stuck offers usually need more proof, not more features. Payment structure is its own lever (the same total reads differently as installments). Scarcity/urgency only when the constraint is real — fake timers convert once and cost trust forever (honesty rules, `positioning.md`).

## In-product monetization (paywalls)

- **Value before ask**: upgrade prompts after the activation moment, never during onboarding. Show what's gated (preview), don't just name it.
- Trigger points: feature gates, approaching usage limits (warn, don't wall), trial expiry (warn at 7/3/1 days, summarizing value received).
- **Respect the no**: easy dismissal with day-scale cool-downs preserves future conversion; never interrupt a flow.
- Measure the whole chain in PostHog — prompt impression → click → completed upgrade → post-upgrade churn — as a funnel insight registered in `dashboards.md`.

---
*Frameworks adapted from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT, © 2025 Corey Haines).*
