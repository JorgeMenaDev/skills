# Campaign Play: Channels

Use when deciding where growth effort/spend goes next, or diagnosing why a channel isn't paying. **Organic search is out of scope here** — keywords, content ops, and SEO belong to `seo-growth-workspace`; this play covers everything else and treats SEO as one channel in the portfolio with its own owner.

## Pick the constraint before the channel

Organize by funnel stage (acquisition → activation → retention → referral → revenue), and work the **binding constraint** — read it from PostHog, don't guess:

- No traffic → acquisition. Visitors bounce before value → activation (tell: day-1→paid far below day-30→paid means the product converts but onboarding doesn't bridge). Activation fine but usage decays → retention. Retention strong, growth slow → referral/revenue.
- Signup *intent* is acquisition; signup *completion* onward is activation.
- A plan spread evenly across all five stages means the diagnosis was weak. One constraint, one channel push.

**Sequencing rule**: build the organic compound first (founder-led content, community, PR, referrals — and SEO via its own skill); layer paid only on a working organic baseline. Premature paid amplifies what's broken.

## Channel portfolio rules

- **Lifecycles differ**: content/SEO are slow then compounding; paid is fast then diminishing; partnerships are episodic; outbound is linear and capacity-bound; PR is spikes. Expect S-curves with plateaus — start the *next* channel (side-project tier, per `budget-framework.md`) before the current one plateaus.
- **Kill criteria at entry**: every channel experiment registers in `campaigns.md` with a pre-declared kill rule ("CAC > 2× target after 30 days at meaningful spend → pause"). A channel without a kill rule becomes a zombie line item.
- **Measure blended**, not platform-reported: platform attribution flatters itself; judge channels on PostHog-side arrivals (referrer/UTM queries in the cookbook) and blended CAC (people + tools + spend).

## Paid (when the baseline earns it)

- Audience knowledge goes into the **creative**, not the targeting filters: write several variants each speaking to one segment, target broad, let the platform match. Creative volume is the constraint on Meta-style channels; search-style channels still reward keyword precision.
- **Retarget with a different offer**, not the same one louder — the reason they didn't convert is the offer. Segment by recency; exclude converters.
- Mirror the winning ad headline verbatim in the landing-page H1 (scent-match); treat claimed lift numbers as hypotheses to test on your own funnel, not facts.
- Scale on **net cash flow, not ROAS percentage**; raise budgets 20–30% at a time with multi-day learning gaps.

## Social & content (non-search)

- 3–5 content pillars with an explicit allocation; promotional content ≤ ~5%.
- Repurpose: one pillar piece → 5–10 atoms (quote, story, tip, contrarian take, data point) spread across platforms over 1–2 weeks. Hooks decide everything — curiosity / story / value / contrarian; first line, first second.
- Shareable ideas that work: named-but-unnamed concepts, argued contrarian takes, **original data** — a product with PostHog data has original data; publishing an insight from it is the house channel play.

## Referral (the loop channel)

Trigger moment → share action → referred-user conversion → reward. Ask at high-intent moments (right after the activation event — you can literally trigger on it); in-product beats links beats codes; double-sided rewards convert best; if referred users don't convert, fix *their* landing experience, not the ask. Start with whoever already raised their hand.

## Always-on channel ops

Recurring checks live in the workspace, not in memory: match cadence to signal speed (paid fatigue every few days; activation funnel weekly; churn signals on trigger; competitor moves weekly). Each loop declares when it acts, a self-check against noise/seasonality/tracking bugs, and a stop rule. Most runs of a good loop conclude "checked, nothing to do" — the same emit-bar doctrine as `scouts-self-driving.md`. Auto-draft is fine; auto-publish/auto-spend needs a human checkpoint.

---
*Frameworks adapted from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT, © 2025 Corey Haines).*
