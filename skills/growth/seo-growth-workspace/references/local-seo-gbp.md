# Local SEO And Google Business Profile

Use only when the business has local intent, service areas, a storefront, GBP, map-pack competitors, reviews, or citations.

If those signals are absent, exit the phase as `not applicable` and record the evidence. Do not create a local SEO action for SaaS, publisher, or product sites without local intent.

Use the shared evidence states, outcome ladder, and provenance rules in [Evidence Conventions](evidence-conventions.md). The local visibility states and measurement classes below are narrower GBP contracts; do not substitute one vocabulary for the other. Local-AI observation is outside this workflow and belongs to the AI measurement workflow.

## Operating Pattern

1. Load business context: NAP, GBP URL, services, service areas, competitors, top keywords.
2. Use Google Maps/GBP/public listings or authenticated GBP where available.
3. Record observations before comparing the business against 3-5 competitors.
4. Output a matrix, then prioritized hypotheses and actions with an owner and recheck window.
5. Write descriptions, review responses, post calendars, or citation fixes only when requested and send every public or authenticated mutation through the approval gate.

## Profile Count And Eligibility

Never treat profile count as a local-ranking or growth lever. Default to one Business Profile per business, per [Google's guidelines for representing your business](https://support.google.com/business/answer/3038177) (observed 2026-07-15). Propose an additional profile only when current official Google guidance and owned operational evidence establish a separately eligible real location, department, or practitioner — never merely to cover additional service areas.

- A service-area business with separate locations qualifies for an extra profile only with separate service areas **and** separate staff at each; a practitioner never holds multiple Business Profiles to cover specializations.
- Service-area businesses remain eligible without a storefront display; do not imply a public address is universally required.
- Verify current official guidance at use time rather than relying on this dated capture; provider rules change.
- No ranking, Map Pack, review, call, lead, customer, or revenue outcome follows from profile count; any proposed additional profile goes through the normal factual-confirmation, eligibility, and approval gates below.

## Modules

| Module | Evidence | Output |
| --- | --- | --- |
| GBP categories | Owned authenticated categories; publicly visible competitor fields; map-pack query and observer context | Truthful category reconciliation: verified current facts, competitor recurrence recorded as correlation, and a proposed change requiring eligibility review |
| GBP attributes | Owned authenticated attributes and publicly visible listing attributes/tags | Factual attribute reconciliation: `not_visible` stays unknown for competitors; only owner-confirmed eligible attributes become change proposals |
| Reviews | Review count, rating, dated sample, themes, complaints, and limits of any recency sample | Neutral review-request plan and monitoring baseline; no velocity, keyword-text, or ranking target inferred from competitor patterns |
| Customer language | Reviews, calls, support notes, testimonials, social comments, competitor reviews | Copy implications for site, GBP, CTAs, and scripts |
| Review responses | Response coverage, response time, tone, accuracy, privacy risk, and issue resolution in the declared sample | Individually reviewed response drafts optimized for customer trust and resolution, never keyword inventory or a ranking intervention |
| GBP posts | Post type, CTA, image use, truthful offer/service details, and dated public observations | Customer-communication calendar whose frequency and location wording are editorial choices, not claimed ranking levers |
| Services | Owned services and descriptions reconciled with real operations and the owned website; competitor fields remain public observations | Accurate customer-facing service descriptions gated by factual and eligibility confirmation; no invisibility or ranking promise |
| Description | Verified business positioning, platform constraints, and public competitor patterns | Accurate readable description options for human selection; sequential swaps are observational changes, not A/B tests or ranking experiments |
| Photos | Owned and public photo observations, dates where visible, representation, permission, and privacy status | Permission-cleared representative shot list based on customer usefulness; no unsupported upload cadence or ranking/conversion lift claim |
| Citations | NAP across directories and duplicates | Fix list and missing directory list |
| Q&A | Existing Q&A on target and competitor listings | Draft accurate answers to common pre-sale questions for approved publication on the owned profile |
| Spam listings | Suspected fake or keyword-stuffed competitor listings in the map pack | Evidence packet for human review before any Business Redressal Complaint Form submission |
| Local intent | Keyword stages from problem to ready-to-hire | Keyword-to-page/GBP strategy |

These eight rewritten GBP outputs—categories, attributes, reviews, review responses, posts, services, description, and photos—organize observations and proposals. Competitor recurrence can motivate a hypothesis, but it does not establish a ranking requirement or cause.

## GBP observation and mutation ledgers

Save both ledgers using `templates/local-seo-gbp.md`. Keep observations, proposed actions, completed actions, and later outcomes as separate records.

### Observation ledger

Every row records `observed_at`, `source_or_query`, `observer_geo`, `locale`, `device_session_context`, `business_or_entity`, `field`, `observed_value`, `visibility_status`, `evidence_url_or_capture`, `evidence_class`, and `evidence_limitations`.

Use exactly one visibility state:

- `observed` — the value was directly visible in the declared source and context.
- `not_visible` — the field or value could not be seen in that public observation; this is never `false`, absent, or evidence that the business does not have it.
- `not_checked` — the observer did not inspect the field.
- `unavailable` — the source could not be inspected reliably, for example because of a login gate, CAPTCHA, partial load, blocked pagination, stale session, or dynamic-rendering failure.

Keep evidence classes separate: `owned_authenticated`, `public_observation`, `official_guidance`, `empirical_correlation`, `anecdote`, `inference`, or `marketing_assertion`. One row has one class; create linked rows when a conclusion depends on a different class. Public Places types are not a competitor's complete GBP categories. Never infer business eligibility or a real-world fact from a competitor, a generated suggestion, or a field that was not visible.

For Maps/local observations, preserve the exact query, observer geography, date/time, locale, device/account/session context, and evidence capture where permitted. State sampling, rendering, personalization, and access limitations.

### Mutation ledger and approval gate

Every proposed or completed profile change records `proposed_change`, `business_owner_factual_confirmation`, `eligibility_confirmation`, `before_evidence`, `hypothesis`, `primary_outcome`, `guard_metrics`, `concurrent_changes`, `changed_at`, `actor`, `approval_or_review`, `recheck_window`, `after_evidence`, `result`, `conclusion_class`, and `rollback_or_follow_up`.

Before any authenticated profile change or public publication:

1. Block the change until a human confirms the underlying facts and, where applicable, platform eligibility. Business identity, categories, attributes, accessibility, availability, services, service areas, payment methods, appointments, and other operational facts cannot be inferred.
2. Capture before evidence, state one testable hypothesis and one primary outcome, choose guard metrics, record concurrent changes, name the actor and approver, and set a recheck window and rollback condition.
3. Apply only after the skill's normal explicit approval for authenticated admin mutations or public content. There is no GBP-specific approval exception.
4. At recheck, attach after evidence, record the result and conclusion class, and choose rollback or follow-up. A completed action and a later outcome remain distinct; movement during a sequential before/after period does not by itself establish causation.

Never label sequential changes on one profile as an A/B test. Record reverification risk and operational impact for category, identity, address, or other sensitive profile changes.

## Review and public-content QA

Use neutral, consistent review requests for all eligible customers at a defined lifecycle point. Prohibit review gating, incentives, selective positive or “happy customer” solicitation, staff quotas, pressure at the place of business, and requests to include keywords, services, locations, or any other specific content.

Before a human approves an AI-assisted review reply, verify it against the review and known interaction; individualize it; check privacy and sensitive data; and confirm it invents no facts, promises, refunds, admissions, or incident details. Escalate legal claims, safety incidents, harassment, discrimination, refunds, threats, personal data, and complex disputes. Ranking is not the primary outcome, and keywords or locations are not inserted for alleged ranking benefit.

Before approving a post, service description, profile description, or photo plan, confirm that every offer, price, service, area, date, availability, project, customer result, and CTA is true and current. Confirm imagery is permission-cleared, representative, privacy-safe, and not misleading; location references must reflect real operations. Prefer useful customer copy over keyword stuffing. Do not present posts, services, descriptions, responses, or photo cadence as confirmed ranking levers without applicable first-party evidence.

## Geo-grid measurement

Use this module only when the business has genuine local/map-pack intent, at least one priority query triggers local results, and geographic visibility is material to the ticket. It is optional and manual-first: no bundled script, paid tool, or particular provider is required or endorsed.

Choose and label one evidence class:

- `geo-grid scan` — a true grid scan with documented per-point location control and stable geometry. It may emit top-3/top-10 coverage percentages, average or median position, non-ranking points, and weak geographic areas.
- `manual location sample` — searches sampled from representative locations with the actual location and device/session limitations recorded. It may report the observed positions or visibility at the sampled locations, but it emits no grid coverage percentage.

For either class record: business/GBP identity, target query, market/city/country, observation date/time, locale, device/search/account context, method, relevant competitors, and limitations. A `geo-grid scan` must also record grid centre, dimensions, point spacing or radius, coordinate set or stored scan evidence, and non-ranking handling. Prefer distribution and coverage from a true scan over one vanity rank.

Before comparing a baseline and recheck, require the same business, query, market, evidence class, grid centre, dimensions, spacing/radius, coordinate set, location controls, locale, and materially equivalent device/search context. If grid geometry or another material parameter changed, reject the pair as a before/after comparison and report the scans separately. A manual location sample is never promoted into a grid comparison.

Interpret spatial observations alongside proximity, relevance, prominence, GBP category, reviews, citations, website signals, competitors, and real-world location. Compare GBP Performance interactions separately from answered calls, qualified leads, customers, and revenue. Better grid coverage does not prove that a profile change caused ranking movement or business impact.

Never invent locations or use fake addresses. A service-area business can be eligible without displaying a storefront address; do not imply every local business needs a public address.

## Matrix Columns

The observation ledger replaces ambiguous competitor fields such as “gap” when visibility is uncertain. Add priority, impact hypothesis, recheck window, and next action only after the evidence rows are recorded.

Depth tiers: quick scan (default) covers categories, reviews, and obvious observations for the top 3 competitors; run the full module matrix only when a local ticket justifies it.

## Customer-Language Mining

Use this when copy sounds generic or when the business has enough reviews/testimonials to extract real buyer language. Compare the target against competitors when competitor reviews are public.

Capture:

- Top fears or frustrations mentioned before purchase/service.
- Top outcomes customers celebrate.
- Emotional words customers use.
- Recommendation phrases customers use when telling others.
- Language patterns in 5-star reviews that are missing from 3-star reviews.
- Copy implications for homepage, service pages, GBP description, review request scripts, social proof, and CTAs.

Do not invent customer quotes. Paraphrase patterns unless the source allows quoting and the quote is short, accurate, and attributed.

## GBP Posting Pattern

When GBP posts matter, record one observation row per recent target or competitor post, then produce a truthful customer-communication plan. A post row may include date/time, type, CTA, image use, topic/service, location wording, offer, and seasonal context only when visible. Do not convert missing competitor fields into negative facts or prescribe cadence from correlation.

## Guardrails

- Do not invent addresses, phone numbers, certifications, service areas, reviews, photos, eligibility, or competitor facts.
- Do not mutate authenticated GBP, publish public content, submit reports, or send review requests without the skill's normal explicit approval.
- Profile actions and GBP Performance interactions are not automatically answered calls, qualified leads, customers, or revenue.
- Do not make ranking, Map Pack, lead, call, or revenue guarantees.
