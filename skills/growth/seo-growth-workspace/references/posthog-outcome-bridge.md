# PostHog Outcome Bridge

Use when a site has both Search Console evidence and a verified PostHog installation. This skill owns the SEO consumer: it joins aggregate page demand to aggregate landing-page outcomes and decides what SEO work changes. The sibling `posthog-growth-workspace` reference `organic-search-outcomes.md` owns the producer schema and HogQL.

The bridge is optional. Missing PostHog access or an invalid export does not block an SEO-only audit, conversion review, or monthly report; record the gap and continue with Search Console and live-site evidence.

## Accept The Export

Accept only an `organic-outcome-bridge/v1` JSON export that:

- records one closed Search Console window and explicit matching PostHog timestamps;
- uses canonical absolute landing-page URLs from the target site's verified origin;
- has aggregate rows only—no query, person, distinct ID, session ID, replay, email, company, or CRM identity;
- names the primary outcome's one-or-more terminal conversion events, proves every exported URL is a public canonical page, and leaves unavailable qualified/customer fields `null`; v1 revenue is always `null`;
- records evidence grade, consent state, and applicable quality flags.

Reject or downgrade evidence when the window is partial, event names changed mid-window, canonical mappings are ambiguous, internal/synthetic traffic is material, or an unavailable business outcome was encoded as zero.

## Join Contract

1. Export Search Console with `page` only for the exact inclusive dates in the bridge (`gsc-fetch.mjs --dimensions page`). Search Console dates are Pacific Time and returns top rows rather than guaranteed-complete data; every joined table records `gsc_top_rows_only`.
2. Use the page-dimensional clicks/impressions for the page comparison, with that limitation. Fetch `query,page` separately for query analysis; do not sum query-dimensional rows as page metrics because anonymized and non-top query rows may be absent. Keep queries out of the bridge output.
3. Normalize GSC pages exactly like the producer: lowercase scheme/host, strip query/fragment, preserve path case, remove trailing slash except `/`, then resolve verified redirects/canonicals.
4. Reject a producer export with duplicate `landing_page` keys. Left-join the unique PostHog outcomes on exact canonical landing-page URL. Keep unmatched GSC pages with outcome fields `null`; never fuzzy-match paths or infer a person/session.
5. Write the joined decision table into the dated SEO audit or monthly report and link the immutable producer export.

| Landing page | GSC clicks | GSC impressions | GSC CTR | GSC position | Organic sessions | Primary conversions | Qualified leads | Customers | Revenue | Quality flags | SEO decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |

Use `null`/`unavailable` distinctly from observed zero. `revenue_by_currency` must be `null` in v1; do not infer or copy revenue from CRM/billing without a later deterministic attribution contract.

## Decision Rules

- High GSC demand + no/low PostHog sessions: inspect canonical mapping, consent, landing behavior, and analytics health before changing content.
- High sessions + weak primary conversion: audit intent/CTA/message match with `conversion-cta.md`; do not assume ranking is the problem.
- Primary conversions + verified same-session weak qualified/customer outcomes: keep the SEO page visible, then route lead quality, offer, qualification, or sales follow-up to the owning growth/CRM workflow. When lifecycle events happen later or without the original session ID, they are unavailable in v1—not zero.
- Qualified/customer outcomes on a modest-traffic page: protect and expand the intent cluster before chasing higher-volume vanity traffic.
- Sparse or unstable data: label `baseline` or `directional`; choose reversible learning work and do not claim causality or ROI.

The table supports SEO prioritization, marketing message/offer decisions, and sales-quality follow-up. CRM/billing remains the authority for customer and revenue truth; revenue attribution is deferred beyond v1.

## Close The Loop

Record:

- the GSC export and Organic Outcome Bridge source paths;
- exact dates, property/project IDs, canonicalization decisions, and quality flags;
- whether outcome evidence changed the proposed SEO action (`yes` or `no`, with one sentence why);
- the one resulting backlog change or an explicit no-change verdict.

Never claim an SEO action caused an outcome without a separate experiment or defensible time-series design. Never use replay or identity data to reverse-engineer a Search Console query.
