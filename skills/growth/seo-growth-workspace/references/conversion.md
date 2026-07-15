# Conversion: CTA Audits And Outcome Bridge

Use for CRO, cold organic visitor paths, lead capture, signup, and CTA hierarchy.

## Audit Matrix

| Page | Visitor intent | Primary CTA | Secondary CTA | Friction | Missing trust | Fix | Verify |
| ---- | -------------- | ----------- | ------------- | -------- | ------------- | --- | ------ |

## Conversion Event Matrix

Use this when SEO traffic needs a measurable path to signup, lead capture, booking, demo, purchase, or contact. The goal is to connect the visible CTA path to a real destination and an observable event.

| Path | Pageviews? | CTA/action event? | Properties | Destination real? | Admin proof | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage CTA | yes/no | click / request / login / demo / contact | label, location, destination, plan, or intent | provider or route | live/admin evidence | repo/admin/user | missing / working / blocked |
| Pricing CTA | yes/no | click / request / login / demo / contact | label, location, destination, plan, or intent | provider or route | live/admin evidence | repo/admin/user | missing / working / blocked |
| Contact/demo form | yes/no | submit / success | source, page, form type | inbox, CRM, or event | test result | repo/admin/user | missing / working / blocked |
| Organic landing page CTA | yes/no | click / submit | page type, query intent, CTA label | event and destination | mobile/desktop proof | repo/admin/user | missing / working / blocked |

If a form or CTA has no real destination, do not fake the conversion path. Log the blocker and recommend the smallest honest next step.

Do not treat analytics installation as conversion measurement. Distinguish pageviews flowing, CTA/action events firing, useful event properties, a real conversion destination, and admin/reporting proof.

When `posthog-growth-workspace` is installed and the product has a verified PostHog project, use the PostHog Outcome Bridge below to add aggregate organic landing-page outcomes to the audit. This is decision evidence, not a requirement to replace the SEO-only workflow or to identify visitors.

Two evidence pitfalls when filling the matrix:

- **Verify analytics presence in the shipped JS, not the initial HTML.** Modern app routers bundle the analytics library and its key into JS chunks, so grepping the page HTML for the library name false-negatives even when tracking is live. Extract the chunk URLs from the page source and scan those for the library name or key prefix before concluding analytics is absent (or trusting an older audit that grepped HTML).
- **A CTA that redirects to an external booking/checkout domain is unmeasured by default.** Once the visitor leaves for Cal.com/Calendly/Stripe/etc., no owned client event can fire on completion, and embed success hooks only cover embed paths — a redirect path silently bypasses them even when "booking tracking" exists and fires for embeds. Mark redirect CTAs `missing` in the matrix unless a provider-side webhook (configured in the provider's admin) feeds an owned sink, and check where each CTA variant actually points: the same site often mixes tracked embeds on some pages with untracked redirects on its highest-traffic ones.

## Naming Conventions

Events: `object_action`, lowercase snake_case (`cta_hero_clicked`, `form_submitted`, `signup_completed`). Context goes in properties, not the event name. These names feed the conversion event matrix above.

| UTM            | Discipline                                          | Example              |
| -------------- | --------------------------------------------------- | -------------------- |
| `utm_source`   | Real traffic source, lowercase                      | `google`, `newsletter` |
| `utm_medium`   | Fixed vocabulary: `cpc`, `email`, `social`, `referral` | `email`              |
| `utm_campaign` | One consistent scheme, documented                   | `spring_sale`        |
| `utm_content`  | Variant/placement differentiator                    | `hero_cta`           |

Keep one documented list of event names and UTMs; inconsistent casing splits reports.

## Checks

- Cold visitors have a lower-friction path than immediate login/signup when appropriate.
- CTA labels match the user's readiness: learn, compare, request access, book, start, contact.
- Pricing/plan CTAs are visible and consistent.
- Forms send to a real destination.
- Auth/login CTAs are not the only conversion path for SEO traffic unless that is intentional.
- Mobile CTAs are visible and do not overlap content.
- Thank-you/success states are tracked or documented.
- Off-site booking/checkout CTAs have a provider-side webhook sink, or are explicitly recorded as unmeasured.

## Done Criteria

- Desktop and mobile CTA paths verified.
- Important forms/actions tested where safe.
- Analytics/conversion tracking exists or a P1 analytics ticket is created.

## PostHog Outcome Bridge

Use when a site has both Search Console evidence and a verified PostHog installation. This skill owns the SEO consumer: it joins aggregate page demand to aggregate landing-page outcomes and decides what SEO work changes. The sibling `posthog-growth-workspace` reference `organic-search-outcomes.md` owns the producer schema and HogQL.

The bridge is optional. Missing PostHog access or an invalid export does not block an SEO-only audit, conversion review, or monthly report; record the gap and continue with Search Console and live-site evidence.

### Accept The Export

Accept only an `organic-outcome-bridge/v1` JSON export that:

- records one closed Search Console window and explicit matching PostHog timestamps;
- uses canonical absolute landing-page URLs from the target site's verified origin;
- has aggregate rows only—no query, person, distinct ID, session ID, replay, email, company, or CRM identity;
- names the primary outcome's one-or-more terminal conversion events, proves every exported URL is a public canonical page, and leaves unavailable qualified/customer fields `null`; v1 revenue is always `null`;
- records evidence grade, consent state, and applicable quality flags.

Reject or downgrade evidence when the window is partial, event names changed mid-window, canonical mappings are ambiguous, internal/synthetic traffic is material, or an unavailable business outcome was encoded as zero.

### Join Contract

1. Export Search Console with `page` only for the exact inclusive dates in the bridge (`gsc-fetch.mjs --dimensions page`). Search Console dates are Pacific Time and returns top rows rather than guaranteed-complete data; every joined table records `gsc_top_rows_only`.
2. Use the page-dimensional clicks/impressions for the page comparison, with that limitation. Fetch `query,page` separately for query analysis; do not sum query-dimensional rows as page metrics because anonymized and non-top query rows may be absent. Keep queries out of the bridge output.
3. Normalize GSC pages exactly like the producer: lowercase scheme/host, strip query/fragment, preserve path case, remove trailing slash except `/`, then resolve verified redirects/canonicals.
4. Reject a producer export with duplicate `landing_page` keys. Left-join the unique PostHog outcomes on exact canonical landing-page URL. Keep unmatched GSC pages with outcome fields `null`; never fuzzy-match paths or infer a person/session.
5. Write the joined decision table into the dated SEO audit or monthly report and link the immutable producer export.

| Landing page | GSC clicks | GSC impressions | GSC CTR | GSC position | Organic sessions | Primary conversions | Qualified leads | Customers | Revenue | Quality flags | SEO decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |

Use `null`/`unavailable` distinctly from observed zero. `revenue_by_currency` must be `null` in v1; do not infer or copy revenue from CRM/billing without a later deterministic attribution contract.

### Decision Rules

- High GSC demand + no/low PostHog sessions: inspect canonical mapping, consent, landing behavior, and analytics health before changing content.
- High sessions + weak primary conversion: audit intent/CTA/message match with the CTA audit above; do not assume ranking is the problem.
- Primary conversions + verified same-session weak qualified/customer outcomes: keep the SEO page visible, then route lead quality, offer, qualification, or sales follow-up to the owning growth/CRM workflow. When lifecycle events happen later or without the original session ID, they are unavailable in v1—not zero.
- Qualified/customer outcomes on a modest-traffic page: protect and expand the intent cluster before chasing higher-volume vanity traffic.
- Sparse or unstable data: label `baseline` or `directional`; choose reversible learning work and do not claim causality or ROI.

The table supports SEO prioritization, marketing message/offer decisions, and sales-quality follow-up. CRM/billing remains the authority for customer and revenue truth; revenue attribution is deferred beyond v1.

### Close The Loop

Record:

- the GSC export and Organic Outcome Bridge source paths;
- exact dates, property/project IDs, canonicalization decisions, and quality flags;
- whether outcome evidence changed the proposed SEO action (`yes` or `no`, with one sentence why);
- the one resulting backlog change or an explicit no-change verdict.

Never claim an SEO action caused an outcome without a separate experiment or defensible time-series design. Never use replay or identity data to reverse-engineer a Search Console query.
