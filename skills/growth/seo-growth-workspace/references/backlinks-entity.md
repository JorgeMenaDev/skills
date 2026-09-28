# Backlinks, Citations, And Entity Authority

Use the evidence rules in SKILL.md. Comparisons and commercial relationships consume `references/commercial-integrity.md` rather than redefining disclosure rules here.

Use for backlink audits, authority planning, local citations, and brand/entity optimization.

## Complete an authority bet

Choose a real audience/distribution need, then verify source relevance, editorial or profile eligibility, a legitimate route and a useful destination. State why this opportunity beats the strongest alternative using [review.md](review.md). Prepare the exact listing correction, useful asset or individual message with supporting facts and reader value. Execute only within existing authorization; outreach requires explicit authorization. Work that needs a decision ends as a `package` ([ship.md](ship.md)). Verify the resulting live placement/change, then record follow-up and qualified referrals where observable. Third-party authority scores are context, not the objective.

## Backlink Gap Matrix

Depth tiers: quick scan (default) covers competitors' top linked pages and obvious gaps via public SERP/operator research; deep gap analysis builds the full 3-5 competitor matrix and needs a bet that justifies the effort. Without backlink tools, document the limitation.

Columns:

`domain`, `URL`, `links to competitor count`, `competitors linked`, `DR/authority if known`, `traffic if known`, `site type`, `link type`, `how competitor earned it`, `realistic chance`, `effort`, `outreach/contact method`, `next action`.

Prioritize: domains linking to all top competitors but not the target, then two competitors, then relevant one-offs, then legitimate directories/associations/partner/resource pages.

Save gap analysis to a dated report shaped as:

```md
# Backlink and entity gap report - YYYY-MM-DD
Scope: target, competitors, data source
## Competitor backlink overlap | Domain | URL | Competitors linked | Site type | Link type | Authority | Chance | Effort | Outreach strategy | Next action |
## Citation/NAP issues         | Platform | Exists | Name | Address | Phone | Website | Duplicate | Issue | Fix priority |
## Entity authority            | Signal (schema, brand SERP, profiles, associations, sameAs) | Status | Evidence | Next action |
## 90-day plan                 | Month | Targets | Outreach/citation work | Expected outcome |
```

## Listicle inclusion outreach

Work manual-first. Search live SERPs for the money queries and their close variants (`best <category> software`, `top <category> tools`, `<competitor> alternatives`, and pages listing known competitors); inspect competitor mentions and outbound links; and use GSC, directories, industry publications, and product-category pages where relevant. Every prospecting run records **Query**, **Market/geo**, **Source URL**, **Qualification result**, **Limitations**, and **Date** so another operator can reproduce it.

Qualify the page before contact. Prefer page relevance, editorial legitimacy, public indexability, available traffic or ranking evidence, a legitimate contact route, and a useful destination that fits the visitor's intent. These facts outweigh DR or another third-party authority proxy. Ahrefs is strictly an optional accelerator: if available, its competitor-backlink views can screen page titles or URLs for listicle patterns, but provider selection and specifics remain in `references/data.md`. Record Ahrefs as unavailable or not used when absent; its absence never blocks the run. Published response rates such as 241 messages → 9 links or 146 messages → 16 replies → 3 links are illustrative anecdotes, never targets or expected benchmarks.

Before outreach begins, declare a prospect cap and a review threshold (for example, review after the first 10 individually researched contacts). Stop at that threshold until a human reviews qualification quality, reply dispositions, complaints, paid requests, and message specificity and explicitly approves the next bounded batch. Never silently turn manual-first outreach into bulk or generic volume outreach.

Record each prospect in `.seo/backlinks/work-log.md` under **Authority funnel (v4)**. Preserve the legacy six-column table untouched; whole-file migration is an explicit operator opt-in only. Use the lifecycle `discovered → qualified → contacted → replied → won → live/verified → lost/expired` and fill query, market/geo, source URL, qualification, limitations, and date plus reply disposition, paid request and amount, link-live and indexable as separate facts, 30/90-day check dates, referral, qualified conversion, cost, evidence, and next step. A won link does not skip live verification; a live link does not prove indexability. Label observations and outcomes with the evidence rules in SKILL.md.

Paid-placement requests do not become undisclosed editorial wins: apply the disclosure contract in `references/commercial-integrity.md` and the sponsored-link mechanics below. Reject reciprocal schemes, link farms, mass outreach, authority rental, and opaque indexers; consume the anti-authority-rental boundary in `references/commercial-integrity.md` rather than recreating it here. Image distribution or rights-based reclamation additionally passes [image-rights.md](image-rights.md) before it can enter this same funnel.

## Directory Submissions

Destination pages exist before directory submissions: directories pass link equity into pages that convert (alternative, use-case, comparison pages) — build those first.

Readiness gate. Hard blocks (any "no" stops submissions): product publicly accessible; pricing page; privacy + terms live; logo assets; real screenshots and demo; structurally clean landing pages (single H1, valid schema); 3+ alternative and use-case pages live and indexed. Soft blocks (proceed, note the gap): template gallery or lead-magnet asset; enough real users to review on B2B review sites.

Sequencing — submit only where the product genuinely fits; vary descriptions per directory:

| Tier                                                       | When                        |
| ---------------------------------------------------------- | --------------------------- |
| Flagship launch (Product Hunt, Show HN, BetaList)          | Launch week                 |
| Startup/SaaS + review sites (AlternativeTo, G2, Capterra)  | Week 1, then rolling        |
| Niche verticals (AI, agent/MCP, no-code, industry)         | Weeks 1-3, genuine fit only |
| "Best of" listicle outreach                                | Rolling                     |
| Integration marketplaces                                   | When integrations ship      |
| Local/regional directories                                 | Rolling; local businesses only |

## Digital PR And Linkable Assets

- Proprietary data assets (benchmarks, surveys, product-derived stats) earn links generic content cannot.
- Expert commentary: platforms are volatile — verify current official availability at use time, never from a frozen list. HARO relaunched under Featured ([helpareporter.com](https://www.helpareporter.com/), observed live 2026-07-15); Qwoted and Source of Sources (SOS) are alternatives, not guarantees or preferred paid dependencies. Availability checks must tolerate bot protection: a challenge response (for example an HTTP 429 checkpoint to a plain fetch) means `unknown`, never `defunct` — verify with a real browser or an official announcement. Treat every platform's scale and outcome claims as first-party marketing; qualify each request and publication manually.
- Reclaim unlinked brand mentions: find them, request the link — the warmest outreach available.

## Link Policy

- Paid or sponsored placements require `rel="sponsored"` (or `nofollow`).
- Anti-patterns: link farms, mass paid directories, reciprocal link schemes, generic mass outreach, authority rental, and opaque indexers.
- Disavow is rarely needed — document the evidence before acting.

## Citation/NAP Audit

For local businesses, compare exact name, address, phone, website, duplicates, rating/reviews across GBP, Apple Maps, Bing Places, Yelp, Facebook, BBB, and industry/regional directories. Flag inconsistencies; prioritize fixes by visibility and authority.

## Entity Optimization

Start with exact-brand disambiguation before submissions or `sameAs` work: search the exact brand and exact domain; record same-name domains, unrelated entities, category confusion, and official profiles that already exist. If official profiles do not exist yet, prefer an owned about/entity page first, added to sitemap and durable footer/header crawl paths.

Check: Organization/LocalBusiness schema on the homepage; `sameAs`/profile links where legitimate; brand consistency in title, schema, footer, social profiles, directories; knowledge panel or brand SERP state; authoritative profiles (LinkedIn company, Crunchbase if eligible, industry associations, marketplace profiles, press pages).

## Guardrails

- Record link-live and indexable separately; neither fact implies the other.
- Do not invent legal entity details, customers, addresses, awards, certifications, or partnerships.
- Outreach should be specific to the site and reason the link belongs there.

## Image distribution and rights

For asset-rights records, original-image distribution or rights-based outreach, load [image-rights.md](image-rights.md).
