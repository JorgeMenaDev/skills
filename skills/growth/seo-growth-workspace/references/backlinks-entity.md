# Backlinks, Citations, And Entity Authority

Use the evidence states, provenance fields, and non-causal outcome ladder in `references/evidence-conventions.md`. Comparisons and commercial relationships consume `references/commercial-integrity.md` rather than redefining disclosure rules here.

Use for backlink audits, authority planning, local citations, and brand/entity optimization.

## Backlink Gap Matrix

Depth tiers: quick scan (default) covers competitors' top linked pages and obvious gaps via public SERP/operator research; deep gap analysis builds the full 3-5 competitor matrix and needs a ticket that justifies the effort. Without backlink tools, document the limitation.

Columns:

`domain`, `URL`, `links to competitor count`, `competitors linked`, `DR/authority if known`, `traffic if known`, `site type`, `link type`, `how competitor earned it`, `realistic chance`, `effort`, `outreach/contact method`, `next action`.

Prioritize: domains linking to all top competitors but not the target, then two competitors, then relevant one-offs, then legitimate directories/associations/partner/resource pages.

Save gap analysis using `templates/backlink-gap.md`.

## Listicle inclusion outreach

Work manual-first. Search live SERPs for the money queries and their close variants (`best <category> software`, `top <category> tools`, `<competitor> alternatives`, and pages listing known competitors); inspect competitor mentions and outbound links; and use GSC, directories, industry publications, and product-category pages where relevant. Every prospecting run records **Query**, **Market/geo**, **Source URL**, **Qualification result**, **Limitations**, and **Date** so another operator can reproduce it.

Qualify the page before contact. Prefer page relevance, editorial legitimacy, public indexability, available traffic or ranking evidence, a legitimate contact route, and a useful destination that fits the visitor's intent. These facts outweigh DR or another third-party authority proxy. Ahrefs is strictly an optional accelerator: if available, its competitor-backlink views can screen page titles or URLs for listicle patterns, but provider selection and specifics remain in `references/data-tools.md`. Record Ahrefs as unavailable or not used when absent; its absence never blocks the run. Published response rates such as 241 messages → 9 links or 146 messages → 16 replies → 3 links are illustrative anecdotes, never targets or expected benchmarks.

Before outreach begins, declare a prospect cap and a review threshold (for example, review after the first 10 individually researched contacts). Stop at that threshold until a human reviews qualification quality, reply dispositions, complaints, paid requests, and message specificity and explicitly approves the next bounded batch. Never silently turn manual-first outreach into bulk or generic volume outreach.

Record each prospect in `.seo/backlinks/work-log.md` under **Authority funnel (v4)**. Preserve the legacy six-column table untouched; whole-file migration is an explicit operator opt-in only. Use the lifecycle `discovered → qualified → contacted → replied → won → live/verified → lost/expired` and fill query, market/geo, source URL, qualification, limitations, and date plus reply disposition, paid request and amount, link-live and indexable as separate facts, 30/90-day check dates, referral, qualified conversion, cost, evidence, and next step. A won link does not skip live verification; a live link does not prove indexability. Label observations and outcomes using `references/evidence-conventions.md`.

Paid-placement requests do not become undisclosed editorial wins: apply the disclosure contract in `references/commercial-integrity.md` and the sponsored-link mechanics below. Reject reciprocal schemes, link farms, mass outreach, authority rental, and opaque indexers; consume the anti-authority-rental boundary in `references/commercial-integrity.md` rather than recreating it here. Image distribution or rights-based reclamation additionally passes `references/image-rights.md` before it can enter this same funnel.

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

## Image Rights

Use for original-image distribution, reuse discovery, and attribution-reclamation decisions. Substantiation: `references/pages.md`; provider selection: `references/data-tools.md`; disclosure and paid-placement integrity: `references/commercial-integrity.md`; conversion events: `references/conversion.md`.

### Asset-rights master and structural gate

`SITE_WORKSPACE/backlinks/asset-rights.md` is the current-state master. For every asset it records the asset ID and original file, creator/rightsholder, creation or acquisition date, ownership/license evidence, platform and upload URL when applicable, license + version, attribution requirement, permitted credit destination, model/property/trademark releases, material edits, privacy/metadata review, checked date, and owner. Existing workspaces create the optional ledger through the reviewed `create-optional` action on first use; its absence is not workspace drift.

No image distribution and no rights-based outreach/contact may start unless the asset row is **green: sufficient, current ownership/license evidence**. Missing, uncertain, stale, or contradictory evidence stops the run. A green row permits assessment; it does not by itself establish an attribution gap or authorize a particular request.

Classify the assessed use as one of: `voluntary credit`, `license-required attribution`, `missing required attribution`, `unauthorized use`, `permitted use without attribution`, or `uncertain ownership/license`. Permitted unattributed use generates no demand. Voluntary credit is optional and may point only to a destination the current terms permit.

Per-platform license terms are volatile. When an asset's rights derive from a platform or third-party license (stock, CC, platform-hosted, licensed commission), check the current official terms source for each asset/run at use time. **Current-check stop gate:** record that check and its source in the asset evidence before distribution, classification, or contact; without it, stop. For a wholly original, directly owned asset with no platform or third-party license, no platform-terms source exists — record the basis as ownership evidence plus `not applicable (directly owned, no platform license)`, which satisfies the gate. This reference deliberately contains no frozen platform-license table because release-time reverification was unavailable offline.

### Rights-safe distribution and reclamation

**Fixture-validated only — not yet exercised against a live operation.** This caveat applies only to the live image-distribution/outreach play in this section, not to the structural asset master or gate above.

Declare a small owned-asset set, review window, contact cap, stop threshold, and owner before a pilot. Distribution never exists primarily as a stock-profile backlink tactic. Reverse-image matches are **discovery leads only**: a match never proves ownership, copying, publication order, infringement, attribution duty, or permission to contact. Hold the lead at `discovered` until the asset row is green and a human assesses the specific use, current license/version, use context, available publication-date evidence, attribution duty, permitted credit destination, and platform communication rules.

Contact may proceed only for a documented legitimate attribution gap or business reason. A human individually reviews the message before sending; it accurately identifies the asset and recorded rights basis, requests only what the current license permits, follows communication preferences, and discloses any commercial relationship. False ownership, fabricated attribution duties, automated credit/legal demands, bulk attribution outreach, third-party-image republication, manufactured engagement, and opaque indexers are prohibited.

A surviving contact enters the same **Authority funnel (v4)** in `.seo/backlinks/work-log.md`; do not create a separate image funnel. Link the asset row, current terms/use assessment, match evidence, and human approval in its evidence field. Measure `reuse discovered → license classified → valid attribution gap → human-reviewed contact → link won → live/verified → 30/90-day survival → referral → qualified conversion → cost`, including maintenance or legal cost. Do not infer ranking or revenue causality from a link.

Legal enforcement escalates out. Record the evidence pointer, decision, date, owner, and escalation to the operator/counsel; this skill never sends DMCA notices, takedown demands, or legal threats and never conducts enforcement.
