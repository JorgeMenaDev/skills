# Campaign Play: Launch

Use for a new product, a major feature, or re-launching something that shipped silently. Launch is a process with phases, not a day. Prerequisite: instrumentation exists for the events the launch is supposed to move (primary conversion event at minimum) — a launch you can't measure in PostHog is a launch you can't learn from.

## Channel structure: ORB

Everything funnels back to **owned**:

- **Owned** (email list, blog, community, in-product): compounds, no algorithm risk. Pick 1–2 by audience reality.
- **Rented** (social, app stores, communities you don't control): speed, not stability — use only to drive traffic to owned.
- **Borrowed** (guest posts, podcasts, influencers, partner audiences): shortcut to attention; pitch win-win collabs to leaders your audience follows, and convert borrowed attention into owned relationships (an email captured, a community joined) or it evaporates.

## The five phases

1. **Internal** — friendly users recruited 1:1, free; validates core function; a demo-able prototype suffices.
2. **Alpha** — landing page + early-access form; announce existence; invite individually.
3. **Beta** — work the list (mix free and paid); teaser content about the *problem*; recruit people with audiences to test.
4. **Early access** — leak screenshots/demos; watch activation in PostHog (time-to-first-event by cohort — the cookbook query); expand in throttled batches while the funnel holds.
5. **Full launch** — open signup, start charging, announce on every owned/rented/borrowed surface at once: customer email, in-app announcement, site banner, blog post, social, directories (Product Hunt et al. — worth it for backlinks + early adopters; the traffic spike is short-lived, so capture emails during it).

## Sizing ongoing announcements

- **Major** (new product/overhaul): full multi-channel campaign.
- **Medium** (integration, notable upgrade): email to relevant segments + in-app banner.
- **Minor** (fixes): changelog only — momentum signal, zero campaign.

Space releases out rather than dumping everything at once; repeat what worked (it's in `campaigns.md`).

## PR (the multiplier, not the launch)

PR drives backlinks, legitimacy, AI-citation surface, and sales ammo — not conversions. The story is the trend/data/conflict; the product is the evidence. Pitch bar: the journalist covers this beat, the email alone could write the story, <150 words, explicit ask, none of the banned vocabulary (`positioning.md` honesty rules). Skip PR entirely when there's no story beyond "we exist" — $0 is a valid line (`budget-framework.md`).

## Post-launch (the part everyone drops)

Within two weeks: onboarding email sequence live; comparison pages briefed to `seo-growth-workspace`; announcement recycled into the next roundup; and a `growth-review`-grade read of the launch funnel in PostHog (traffic → signup → activation by source), recorded in `campaigns.md` with a verdict: which channels earned a second run.

---
*Frameworks adapted from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT, © 2025 Corey Haines).*
