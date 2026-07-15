# AI Search Visibility

Use the [shared evidence states, provenance fields, buyer stages, and non-causal outcome ladder](operating.md). This reference adds AI-observation fields; it does not redefine the shared vocabulary.

Use for the `ai-visibility` phase of every first run, for `operate` checkpoints and tickets in the `ai-visibility` area, and whenever the user asks how the site shows up in an assistant or AI search surface. AI visibility is part of ordinary organic growth work, not a separate GEO mode or backlog.

No special markup tricks exist for Google AI surfaces: AI Overviews and AI Mode use core Search systems, and Google says no AI-specific markup or files are required. This workflow is about access, extractability, and honest measurement, not a scoring model, preferred word count, or visibility forecast. Keep the framing from the AI Search Note in `references/first-run.md`.

Index backing matters, but engines may combine their own crawlers, partner indexes, and user-triggered fetches. Treat a missing direct-crawler path as reduced eligibility, not proof that a URL can never surface through another source.

## 1. Crawler access inventory

Run the purpose-split check in `references/technical-seo.md`. Separate training/model-improvement crawlers from search/discovery crawlers and user-triggered fetchers, then verify both robots and CDN/WAF logs. Blocking a direct discovery/fetch path reduces full-content citation eligibility; it does not prove every title/link path is gone. Training controls are separate: notably, Google-Extended does not control Google Search or its AI features. Record the per-bot decision, enforcement surface, and observed result in `.seo/strategy.md`.

Do not scrape assistant products or add a provider integration. Manual observation is the default. If a future site sampler is investigated separately, require same-origin enforcement, private-address rejection, redirect revalidation, byte/page/time limits, and raw provenance before implementation.

## 2. Observation contract

### Panel construction, freeze, and versioning

Build the initial prompt panel from named, dated demand evidence before the first baseline — never from operator memory or convenience. Acceptable sources: first-party Search Console queries, the site's maintained keyword/query plan, sales-call/support/customer language, live SERP observations for money queries, or explicitly recorded business-context assumptions when first-party evidence does not exist yet. For every prompt preserve, alongside its stable prompt ID, version, and verbatim query: the source and its observation date, the selection rationale, buyer stage, branded/non-branded state, locale/market, intended surface or mode, and the known evidence limitation.

Freeze the declared panel before running the baseline. Any addition, removal, or wording change afterwards creates a new prompt/panel version; prior observations remain unchanged, and the report records why the panel changed and which comparisons are no longer like-for-like. Never add or remove prompts because observed results were favourable or unfavourable — post-hoc selection invalidates the baseline it appears to improve.

Sample size is declared and capacity-bound: fit the panel to the site's demand evidence and the operator's real capacity. No fixed prompt count, engine set, or cadence is a universal requirement. When the panel is intentionally partial, record the omitted demand classes and their limitation. This contract routes into the existing dated report and observation fields below; it creates no second ledger, score, provider integration, or prompt library.

### Observation rows

Maintain a prompt set in the dated report. Give every prompt a stable prompt ID and version; retain the verbatim query and declared intent. Change the version when wording changes. Use a stable prompt panel and repeated runs for local or personalized observations.

Record one row per answer run, not one row per query summary. Every row carries its own context so it remains intelligible after sorting or extraction:

| Observation ID | Observed at + timezone | Platform | Visible model/version | Surface/mode | Prompt ID + version | Verbatim query | Declared intent | Buyer stage | Country + locale | City/coordinates + location method | Login/account state | Personalization/memory state | Device/app | Run number | Declared repeat count | Businesses mentioned + order | Mention evidence | Recommendation evidence | Citation URLs | Citation evidence | Maps/place state | Transactional/booking/calling state | Sponsored state | Evidence artifact | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AI-YYYY-MM-DD-001-R01` | ISO 8601 timestamp | visible product/platform | visible identifier, or `not visible` | web answer, Maps/place result, AI Overview/Mode, transactional, or sponsored | stable ID + version | exact input | recorded intent | shared stage or `Unknown` | country + language | declared place and how controlled | logged in/out + account scope | known state, `unknown`, or reset method | hardware + browser/app | `1` | planned/completed repeats | ordered verbatim names | quoted/captured wording or `none observed` | quoted/captured wording or `none observed` | URLs or `none observed` | which answer text each URL supports | present/absent/not visible | reservation/call/Shopping state | present/absent/not visible | screenshot/export path | sampling and visibility limits |

Use the semantics independently on every row:

- **Mention**: the answer names the business. Naming alone is not endorsement.
- **Recommendation**: the answer wording affirmatively suggests, selects, or prefers the business for the declared query. Preserve the wording that supports this classification.
- **Citation**: the answer exposes a source/link attributable to a claim or answer passage. A citation may occur without a brand mention or recommendation.

Do not infer one semantic from another. Record `none observed` only after checking the visible answer; use `not visible`, `unavailable`, or `unknown` when the surface or state could not be checked. Visible product/model identifiers are transcribed, never guessed.

AI answers are nondeterministic dated samples, never rankings or exhaustive telemetry. State recurrence only as `x of y completed runs` for the declared prompt set, time window, platform/model, and row context. Do not generalize recurrence to platform reach, population prevalence, a hidden source list, or future performance.

### Interpretation and outcomes

Keep these observations distinct: impression/exposure, mention, recommendation, citation/link, referral session, conversion event, qualified lead or completed/qualified call, customer, revenue, and assisted-conversion interpretation. The [shared outcome ladder](operating.md) supplies the canonical evidence states; `references/conversion.md` owns conversion and qualification workflows, and `references/local-seo-gbp.md` owns local/GBP measurement.

A recommendation is not a click; a referral is not a lead; and a conversion event is not automatically qualified. A GBP or assistant call-button click is not proof of a completed, answered, or qualified call. UTMs help only where a controllable tagged link survives. Assistant-selected links and offline/direct journeys often do not preserve them. Geo-grid scanning is a sampling methodology, not a Google metric.

Visibility observations alone cannot establish causal AI selection, Map Pack, citation, lead, call, customer, or revenue effects. Report observed source, citation, referral, and outcome changes with concurrent changes and uncertainty; never promise, project, or calculate AI-visibility lift from an action. Use `references/search-console.md` for visibly available Search Console generative-AI reporting and keep it separate from sampled answers.

## 3. Source-page gap and portrayal

Normalize repeated domains/pages only inside the declared observation sample. A source-page gap is an interpretation linked to observation rows, not an assistant ranking or a claim about exact query fan-out.

| Gap ID | Observation IDs | Platform + model/version | Prompt ID + verbatim query | Buyer stage | Locale + location/account/personalization/device state | Cited domain | Cited URL | Source type | Brand mentioned | Competitors mentioned | Direct citation | Recurrence in declared sample | Observation period | Opportunity class | Rationale | Action route | Route reason | Evidence owner | Next/recheck date | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GAP-001` | run IDs | transcribed identifiers | stable ID + exact input | shared stage or `Unknown` | row-context summary | domain | public URL | owned/independent/editorial/commercial/other | observed state | observed names | yes/no/not visible | `x of y` within named sample | dates | one class below | evidence-based reason | exactly one route below | why this is the sole route | person/role | date | access and sample limits |

Choose exactly one opportunity class for every material gap: `owned-content deficiency`, `legitimate editorial/earned-media opportunity`, `commercial relationship requiring disclosure/link review`, `irrelevant`, `unattainable`, or `insufficient evidence`. The opportunity class is the inference; the action route is its bounded consequence. Every material gap gets exactly one action route from the same destination set below. The class alone does not authorize contact or publication.

### Factual-accuracy and portrayal record

Create a distinct portrayal record when the answer describes the business, even if the observation also contains a recommendation. Portrayal means what the answer asserts or implies about the business; sentiment means an optional positive/neutral/negative judgement under a declared rubric. Portrayal is not sentiment, and favourable sentiment does not make a portrayal accurate.

| Portrayal ID | Observation ID | Brand mention | Recommendation | Citation state | Cited source | Concise portrayal sentence | Factual accuracy | Supporting/contradicting evidence | Missing material qualifier | Outdated information | Unsupported claim | Entity confusion | Sentiment | Sentiment rubric | Buyer stage | Action route | Route reason | Owner | Next/recheck date | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POR-001` | run ID | separate observed field | separate observed field | observed yes/no/not visible | URL + which claim it supports, or `none observed` | faithful concise rendering | accurate/inaccurate/mixed/insufficient evidence | public URL, record, or artifact | exact omission or `none observed` | exact issue or `none observed` | exact issue or `none observed` | confused entity or `none observed` | optional label or `not assessed` | required if assessed | shared stage or `Unknown` | exactly one route below | why this is the sole route | person/role | date | access and sample limits |

Every material gap and every portrayal finding routes to exactly one existing destination:

1. `content backlog` → `.seo/backlog.md` for an owned-content deficiency or factual correction.
2. `backlink work-log` → `.seo/backlinks/work-log.md` for a legitimate, manually reviewed editorial/earned-media opportunity.
3. `commercial disclosure review` → the review governed by `references/commercial-integrity.md` and link qualification in `references/backlinks-entity.md` when a material, gifted, paid, affiliate, or sponsored relationship is involved.
4. `no action` → record a specific reason, including irrelevant, unattainable, insufficient evidence, already accurate, or no ethical/credible intervention.

Do not create another ledger, outreach queue, or GEO backlog. Tag only the shared buyer stage here; construction of a customer journey belongs elsewhere. The [commercial integrity contract](commercial-integrity.md) remains the sole source for comparison methodology, ownership/self-inclusion, disclosure, and authority-rental rules.

Manual review is always supported and no paid provider is required. If optional third-party data is pasted into a record, label it `Third-party estimate` and record provider, observed/export date, cost, sample/coverage, freshness, privacy constraints, UI/method drift, and limitations. It is not ground truth and does not replace row-level manual evidence.

## 4. Passage extractability and source footprint

Use a non-scored passage-extractability matrix for a page/query pair. Do not prescribe a word count or estimate citation lift.

| Query | URL | Route/page family | Answer location | Self-contained subject | Sourced facts | Present in raw/server-rendered HTML | Limitation | Fix route | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| verbatim query | public URL | page family | locator | observed evidence | observed evidence | yes/no/not checked + artifact | evidence limit | existing content, technical, or AI-visibility ticket | dated recheck + artifact |

Use `references/technical-seo.md` for raw/server-rendered HTML proof and `references/pages.md` for claim substantiation. A successful fetch does not prove support or extractability.

Use a dated URL-backed source footprint to distinguish owned sources from independent evidence:

| Source/platform | Owned or independent | Public URL | What it establishes | Context relevance | Public/indexable state | Checked date | Evidence limitation | Existing ticket route |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| named source | owned/independent | actual URL | bounded observed fact | why it matters | observed/not visible/not checked/unavailable | date | login gate, rate limit, manual sample, or other limit | entity, backlink, content, technical, or AI-visibility ticket |

Login-gated, unavailable, rate-limited, or manually sampled sources are limited or missing evidence, never negative findings. Never claim a platform was automatically scanned when the evidence is a search URL or manual instruction.

## 5. Monthly spot-check

Re-run the maintained prompt set monthly or at the declared cadence. Log each run to `.seo/reports/ai-visibility-YYYY-MM-DD.md` and compare like-for-like rows. Track assistant referrals in analytics where observable; citation captures remain dated samples. Standard GSC Performance can include AI-surface activity but cannot establish AI causality. Some properties may expose a separate rollout-limited UI/export; use it only when visibly available (`references/search-console.md`).

## Exit criteria

- Crawler allow/block decision recorded in `.seo/strategy.md`.
- Dated observation rows and maintained prompt set saved to `.seo/reports/ai-visibility-YYYY-MM-DD.md`.
- Every material source gap has one opportunity class and exactly one bounded action route; every portrayal finding also has exactly one bounded action route.
- Extractability/source-footprint findings are filed into existing tickets or explicitly given `no action` with a reason.
- Assistant-referral tracking exists in analytics, or the blocker is documented with an owner.

## Guardrails

- Do not fabricate authority: no invented statistics, fake credentials, synthetic reviews or mentions, sockpuppets, forum spam, covert placements, hidden prompt injection, crawler-targeted instructions, or content intended to manipulate model behaviour.
- No scraping, provider dependency, outreach automation, deterministic query-fan-out reconstruction, guest-post quota, authority rental, special AI markup recipe, preferred word-count recipe, composite score, or prediction of citation, traffic, lead, revenue, or AI-visibility lift.
- Do not import or recommend third-party GEO audit code, prompts, templates, installers, dependencies, or scores. A future sampler requires its own bounded security investigation.
- Report only dated observed samples and separately labelled outcomes. Never guarantee rankings, citations, recommendations, Map Pack visibility, leads, calls, customers, or revenue.
