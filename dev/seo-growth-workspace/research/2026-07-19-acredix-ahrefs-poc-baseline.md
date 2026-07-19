# Acredix Ahrefs Free POC baseline and opportunity design

Date: 2026-07-19

Target: [acredix.cl](https://acredix.cl)

Decision owner: `seo-growth-workspace`

Research boundary: public Acredix pages, read-only repository/live inspection, existing redacted Matias SEO evidence, and official Ahrefs documentation. No Ahrefs account or login was used; no site, Search Console, backlog, product UI, or SuperaSEO state was changed.

## Executive decision

Run the eventual Acredix Ahrefs Free POC in this order:

1. **Referring domains, backlinks, anchors, and best-by-links** — highest expected net-new value. The current authority ledger is reliable but manually discovered and narrow. Ahrefs can test its recall, expose previously unknown links, and correct stale/lost states.
2. **Organic keywords and pages** — second. Compare Ahrefs estimates with the low-data Search Console baseline to see whether it surfaces useful query families before they appear in the 90-day GSC export. GSC remains authoritative for Google performance.
3. **One Site Audit crawl** — useful as a bounded challenger to existing live/repository checks, especially for whole-site internal-link and rendered-page coverage. Do not make it a mandatory dependency unless it clears the novelty and false-positive thresholds below.

Do **not** include competitor backlink-gap analysis, broken/new/lost-link history, Rank Tracker, Web Analytics, Social Media Manager, AI Content Helper, or AI visibility in the Free POC. Current official plan documentation does not establish the required free access for the first three, and the others are outside this SEO evidence question. Domain Rating is a context-only directional metric, never an opportunity gate.

This report designs the POC; it does not claim Ahrefs has already produced backlink, keyword, competitor, or crawl findings for Acredix. The only live Ahrefs observation made without an account was the public Domain Rating endpoint.

The [Wayfinder map](https://github.com/JorgeMenaDev/skills/issues/150) has already ratified Ahrefs as a required third-party provider. This research does not reopen that provider decision. It determines which Acredix-facing Ahrefs features earn mandatory workflow status and which should remain optional or excluded.

## 1. Current Acredix baseline

### Search performance

The canonical GSC export covers 2026-04-09 through 2026-07-08 and contains 60 query/page rows.

| Measure | Baseline | What it already answers | Limitation Ahrefs may test |
| --- | ---: | --- | --- |
| Clicks | 23 | Actual Google clicks | All 23 were branded; no non-branded outcome signal yet |
| Impressions | 545 | Actual Google visibility | Too little volume for the skill's default 100-impression opportunity threshold |
| Branded / non-branded impressions | 261 / 284 | Separates navigation from discovery | Query rows are top-row data and may omit anonymized queries |
| Non-branded clicks | 0 | Establishes the growth constraint | Cannot yet distinguish content, authority, and SERP-shape effects from outcomes |
| Distinct queries / pages | 34 / 25 | Shows the currently observed Google footprint | Only queries that already generated visible GSC rows appear |
| Largest page exposure | `/acreditacion-pronexo`, 146 impressions | Confirms a navigational Pronexo surface | This exposure is not a new commercial opportunity by itself |
| Best real commercial query family | worker/contractor accreditation management, 22 impressions across two variants, positions about 6.5 and 9.2 | Identifies the only non-branded commercial family already near page one | Sample is too small for a CTR rewrite decision |

The deterministic `gsc-fetch.mjs` and `gsc-opportunities.mjs` flow already provides query/page exports, branded separation, page-two candidates, CTR-band checks, and cannibalization checks. On this baseline, no row clears the default 100-impression threshold. Ahrefs must therefore add discovery or prioritization value; reproducing these 60 rows with third-party estimates is duplication.

### Public site and implementation truth

Read-only checks on 2026-07-19 established:

| Surface | Baseline | Existing evidence quality | Candidate Ahrefs contribution |
| --- | ---: | --- | --- |
| Sitemap | 84 public URLs in `sitemap-0.xml` | Deterministic live count | Crawl reconciliation, orphan/near-orphan and issue coverage |
| Source inventory | 34 page-source files and 57 blog Markdown files | Repository truth | None for ownership or intent; crawl-only rendering differences may be useful |
| Sampled public routes | 7/7 returned 200 with one H1, self-canonical, index/follow, and JSON-LD | Direct live HTML evidence | Whole-site breadth and change-over-time monitoring |
| Robots and sitemap discovery | Allow-all public robots file names the sitemap index | Direct live evidence | Duplicate unless Ahrefs observes a crawler-specific failure |
| Rendering | Key public content is served in HTML | Direct live evidence | Rendered-versus-raw comparison across all URLs may expose isolated exceptions |

The skill already provides `seo-doctor.mjs` for workspace diagnosis and an offline `link-graph-analyzer.mjs`. The analyzer needs a complete page/link JSON export and performs no crawl. Its bundled exporter supports completed Next.js App Router builds, while Acredix is Astro. Ahrefs Site Audit could close this **collection gap** if it gives a reviewable whole-site internal-link graph; its recommendations still need live/repository verification.

The current skill contract sends own-site Google performance to GSC, identifies Ahrefs referring-domain data as a preferred backlink-gap source, and documents the public DR endpoint. It does not provide authenticated Ahrefs Site Explorer/Site Audit collection. `backlinks-entity.md` also treats Ahrefs as an optional accelerator whose absence never blocks an SEO run. The POC therefore tests whether selected Ahrefs reports deserve promotion from optional accelerator to required evidence; it does not replace GSC, public validation, or repository truth.

### Existing technical and content reports

The Acredix hub already records dated live audits, public baselines, GSC opportunity analysis, source-reviewed page work, and frontier sweeps. Current evidence has already resolved or classified common false-positive magnets: canonicals, sitemap inclusion, public status, one-H1 structure, indexability, schema presence, English-lane strategy, navigational Pronexo/AQS intent, and the no-touch SuperaSEO boundary.

An Ahrefs issue is a **duplicate** when it restates one of those known conditions without fresher or more complete evidence. A recommendation is a **false positive** when the underlying fact is wrong, the route is intentionally noindexed/excluded, the recommendation conflicts with current product/market strategy, or the suggested action would not improve a target-owned outcome.

### Authority and backlink evidence

The manual authority ledger was last reconciled from public pages on 2026-07-12/13.

| State | Count | Public examples / interpretation |
| --- | ---: | --- |
| Live, indexable, followable | 1 | Cazaproducto; only clean link in the recovered set |
| Live, indexable, `nofollow` | 2 | SaaS Wall and Telegraph |
| Live but `noindex` | 1 | Rentry; link-live is not indexable |
| Lost / removed | 1 | Zearches no longer contains the Acredix link |
| Qualified or contacted authority prospects | Multiple bounded Chile/global prospects | Existing discovery work; not backlinks until a public link is live and verified |

This is a small, manually discovered set, making the backlink surface the clearest place for Ahrefs to add value. The ledger already preserves the distinctions Ahrefs findings must not collapse: link present, followability, source-page indexability, topical legitimacy, lifecycle state, and referral/conversion outcome.

On 2026-07-19, the documented public endpoint returned **0.2 Domain Rating by [Ahrefs](https://ahrefs.com/)** for `acredix.cl`. This is a dated third-party directional estimate, not a Google metric, link count, quality score, ranking guarantee, or reason to pursue a site. The endpoint currently costs zero API units; [Ahrefs says authentication becomes mandatory on 2026-08-01](https://docs.ahrefs.com/en/api/reference/public/get-domain-rating-free), using a free API key.

## 2. What Ahrefs Free officially makes available

Current official documentation says a free account can use the following for websites whose ownership is verified:

| Surface | Official free capability | Limit relevant to this POC | Decision consequence |
| --- | --- | --- | --- |
| Site Explorer | Backlinks, referring domains, anchors, organic keywords/positions, top pages, organic competitors, best by links, crawled pages, and internal-link reports for owned sites | Up to 1,000 backlinks and keywords visible at once; unverified competing sites are excluded from the Free plan | Good own-site discovery; not a complete competitor backlink-gap POC |
| Site Audit | On-demand crawl with 170+ default technical/on-page issue checks | 5,000 HTML-200 crawl credits per verified project per month | More than enough for the current 84-URL sitemap |
| Verified projects | Unlimited verified websites | Verification is required before Free Site Explorer/Site Audit access | Acredix ownership verification is the only access gate |
| Exports | Current plan comparison lists zero export rows for the Free plan | Official pages are inconsistent about visible report rows, and do not establish a reusable Free Site Explorer export | POC must record the live UI limit and evidence-capture method instead of assuming CSV/API persistence |
| Historical/competitor features | Free has no established historical-data allowance or unverified project allowance; Link Intersect and broken-link reports are documented on higher plans | No reliable free competitor gap or temporal new/lost-link workflow | Exclude these from the Free POC; do not grade Free on unavailable features |

Sources: [Ahrefs Free capabilities](https://help.ahrefs.com/en/articles/13002606-what-can-i-use-for-free-in-ahrefs), [Ahrefs Webmaster Tools limits](https://ahrefs.com/webmaster-tools), and [current plan comparison](https://help.ahrefs.com/en/articles/6117209-what-s-the-difference-between-all-ahrefs-subscription-plans).

Ahrefs supports ownership verification through Google Search Console, DNS, an HTML file, or an HTML tag. Its documentation recommends GSC and states that this grants Ahrefs access to GSC data. DNS/file/tag methods require a durable production change. The future POC should use the GSC method only after explicit approval for the third-party OAuth/data grant; this research made no such connection. See [Ahrefs ownership verification](https://help.ahrefs.com/en/articles/3275938-verifying-ownership-of-your-project-or-website).

## 3. Highest-value POC opportunity matrix

| Priority | POC surface | Baseline challenger | Plausible net-new value | Likely duplicates / false positives | Bounded observation | Pass threshold |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Referring domains, backlinks, anchors, best by links | Manual five-link recovered set plus authority funnel | Unknown live links; links to deep pages; anchor/entity patterns; corrections to lost/current state; linkable assets already attracting citations | DR-led prioritization; nofollow treated as worthless; live links on noindex pages treated as indexable; prospects mistaken for links; low-relevance directories | Capture every visible referring domain up to 100 and every visible backlink up to 100. Match the five known states. Validate at most 20 unmatched rows: the 10 most topically promising and 10 most suspicious/stale | At least 2 previously unknown, publicly verified, relevant findings that imply a concrete authority or reclamation action **or** 1 material correction to the known live/lost state; known-set recall at least 80%; validated false-positive rate at most 20%; at most 60 operator minutes |
| 2 | Organic keywords, positions, top pages, organic competitors | 60-row GSC export and existing frontier/strategy reports | Early discovery of query families not yet visible in GSC; estimated competitors/pages for targeted public SERP validation; deep pages receiving estimated visibility | Repackaged GSC rows; estimates treated as actual Google performance; UK or navigational intent promoted despite current strategy; competitor names without an actionable page/query gap | Capture up to 100 visible keyword rows and up to 50 page/competitor rows. Exact-match against GSC query/page pairs and existing reports. Publicly validate at most 10 novel families with a dated SERP/live check | At least 2 novel query/page hypotheses that survive public validation, are absent from GSC/current reports, and map to a target-owned decision; false-positive rate at most 30%; at most 60 operator minutes. GSC remains the outcome authority |
| 3 | Site Audit: issues, crawlability, internal links, raw/rendered differences | Live curl/repository audits, 84-URL sitemap, offline analyzer contract | Whole-site coverage; isolated broken links or render differences; orphan/near-orphan evidence; repeat-crawl change monitoring | Intentional noindex/exclusions; generic title-length rules; strategy-blind content advice; already-recorded issues; crawler artifacts | One crawl seeded from sitemap and public internal links, capped at 500 URLs. Record crawler settings. Review all high-severity issues and at most 20 unique lower-severity issue/URL pairs against live HTML and source | At least 1 net-new valid critical/high issue or 3 net-new valid medium issues, each with a concrete public URL and owner; false-positive rate at most 20%; at most 90 operator minutes. Otherwise keep Site Audit optional |
| 4 | Internal-link reports in Site Explorer/Site Audit | No current Astro-compatible automated collector for the offline graph analyzer | A normalized input or evidence set for crawl depth, weak money-page support, and near-orphans | Link counts without rendered-source proof; pagination/utility links treated as strategic endorsements | For the same crawl, inspect the 20 deepest/least-linked indexable URLs and 10 most-linked pages; verify links in served HTML | At least 2 net-new, valid, target-owned internal-link actions not already in the hub; evidence reproducible for at least 90% of sampled rows |
| Exclude | Competitor backlinks / Link Intersect | Public/manual competitor profiling | Would be valuable in a paid/full POC | Free cannot analyze unverified competitors deeply; Link Intersect is not listed as a Free report | None in the Free POC | Reconsider only if a later authorized plan exposes the feature |
| Exclude | DR-only monitoring | Public DR endpoint | Cheap context trend | Directional score with no action, quality, relevance, or causality proof | Record only alongside a dated backlink inventory if required | Never passes alone |

The matrix deliberately separates **provider discovery** from **action truth**. An Ahrefs row becomes actionable only after the referenced public URL, link, query intent, or crawl condition is independently verified.

## 4. Evidence contract for the POC

Create one dated provider-observation report per Acredix POC run. Do not write findings directly into strategy or backlog during observation.

### Run fields

| Field | Required evidence |
| --- | --- |
| Observation identity | Site, provider, plan shown in UI, observed-at timestamp/timezone, operator, run ID |
| Access boundary | Verified-project method, scopes consented, whether GSC data was shared, and confirmation that only `acredix.cl` public marketing pages were in scope |
| Provider state | Report name, visible row limit, export availability, credits before/after, selected filters, database/country, date mode, crawl user-agent and JavaScript setting |
| Baseline identity | GSC export date range and row count; sitemap URL/count; repository commit observed; existing report dates; authority-ledger checked-at date |
| Raw finding | Provider report, source URL/page/query, provider metric, provider first/last-seen dates where visible, and stable screenshot/export reference |
| Validation | HTTP state, rendered link/metadata/canonical/indexability, public SERP observation where relevant, repository evidence, and checked-at timestamp |
| Classification | `net-new actionable`, `duplicate`, `false positive`, `unvalidated`, or `provider-only context` |
| Duplicate pointer | Exact GSC row, report section, audit item, or existing authority-ledger row |
| Actionability | Target-owned decision the finding could change, expected outcome, smallest next action, dependency, and owner; no backlog mutation during the POC |
| Effort and durability | Discovery minutes, validation minutes, total minutes, manual transcription burden, export/persistence method, and whether another operator can reproduce it |

### Classification rules

- **Net-new actionable:** absent from current GSC/repository/live/report evidence; independently validated; relevant to Chile/es-CL and Acredix's public marketing surface; changes a concrete decision.
- **Duplicate:** already known or already represented by an owned work item, even if Ahrefs assigns a different severity or metric.
- **False positive:** provider assertion fails independent validation, concerns an intentional state, recommends a strategy-conflicting action, or has no target-owned outcome.
- **Unvalidated:** sample cap, login/row limit, blocked source, or time cap prevented verification. Never count it as value.
- **Provider-only context:** a directional metric such as DR or estimated traffic that helps describe state but does not justify action.

## 5. Value measures and decision rules

Calculate these separately for each POC surface and overall:

| Measure | Formula / method |
| --- | --- |
| Net-new actionable count | Validated findings classified `net-new actionable` |
| Duplicate rate | Duplicates / all reviewed findings |
| Validated false-positive rate | False positives / all independently validated findings |
| Unvalidated rate | Unvalidated / all reviewed findings |
| Known-set recall | Known public baseline items found by Ahrefs / baseline items eligible for that report |
| Novel action yield | Net-new actionable / all reviewed findings |
| Effort per novel action | Total operator minutes / net-new actionable count |
| Freshness lag | Provider first/last-seen date versus public verification date, when Ahrefs exposes dates |
| Reproducibility | Sample rows another operator can recreate from preserved evidence / sample rows reviewed |
| Persistence fit | `good` if stable export/API evidence exists; `bounded` if normalized screenshots/manual rows suffice; `poor` if values cannot be preserved or rechecked |

Overall recommendation rule:

- **Make a feature mandatory in the operating workflow** only if it clears its surface pass threshold, reproducibility is at least 90%, and persistence is `good` or `bounded` with an explicit capture procedure.
- **Keep it optional** when it produces useful context but misses novelty, effort, or persistence thresholds.
- **Reject it from the workflow** when duplicates dominate without a compensating coverage gain, validated false positives exceed the threshold, or the evidence cannot be reproduced.
- Re-run a passing surface once after at least 30 days before treating freshness/history claims as proven. One crawl or one index snapshot proves discovery value, not monitoring value.

## 6. Recommended POC procedure

1. Obtain explicit approval for an Ahrefs Free account and ownership verification. Recommended method: existing GSC verification, because it avoids a production DNS/file/tag mutation, but only after approving Ahrefs' GSC OAuth/data access.
2. Record the live plan, row/export limits, verification scope, and credits before observing any report. The official pages contain enough limit ambiguity that the UI state is part of the evidence.
3. Run the backlink/referring-domain observation first. Stop at the sample and 60-minute limits; do not expand merely because rows remain.
4. Run organic keywords/pages second. Compare exact query/page pairs to the frozen GSC export before doing public validation.
5. Run one Site Audit crawl, seeded by the sitemap and capped at 500 URLs. Validate rather than accept Ahrefs severity labels.
6. Compute the measures above and decide feature-by-feature. Do not convert POC findings into backlog or production changes in the same observation pass.
7. If a feature passes, repeat that feature after at least 30 days to measure freshness and repeatability. Do not add Web Analytics, Social, or AI helpers to this proof.

## 7. Decision questions

1. **Authorize a future Ahrefs Free account and verified `acredix.cl` project?** Recommendation: **yes**, as a bounded POC only.
2. **Authorize GSC-based ownership verification, including Ahrefs' access to GSC data?** Recommendation: **yes**, because it avoids production mutation; record scopes and disconnect after the POC if ongoing access is not adopted.
3. **Which Ahrefs features should be presumed mandatory before results?** Recommendation: **none**. Treat backlinks/referring domains as the lead candidate, organic discovery as the second candidate, and Site Audit as optional until each clears its threshold.
4. **Is manual evidence acceptable when the Free plan exposes no reusable export?** Recommendation: **yes for this bounded POC**, using normalized rows plus screenshots; **no for a recurring fleet workflow** unless the persistence burden remains low and reproducibility reaches 90%.

## 8. Sources

### Official Ahrefs

- [What can I use for free in Ahrefs?](https://help.ahrefs.com/en/articles/13002606-what-can-i-use-for-free-in-ahrefs)
- [Ahrefs Webmaster Tools / Ahrefs Free](https://ahrefs.com/webmaster-tools)
- [Current subscription-plan comparison](https://help.ahrefs.com/en/articles/6117209-what-s-the-difference-between-all-ahrefs-subscription-plans)
- [Verifying ownership of a project or website](https://help.ahrefs.com/en/articles/3275938-verifying-ownership-of-your-project-or-website)
- [Comparing Site Audit crawls](https://help.ahrefs.com/en/articles/5192078-how-to-compare-changes-between-two-crawls-in-site-audit)
- [Public Domain Rating endpoint](https://docs.ahrefs.com/en/api/reference/public/get-domain-rating-free)

### First-party Acredix public surfaces

- [Homepage](https://acredix.cl/)
- [Robots file](https://acredix.cl/robots.txt)
- [Sitemap index](https://acredix.cl/sitemap-index.xml)
- [Public sitemap](https://acredix.cl/sitemap-0.xml)
- [Blog](https://acredix.cl/blog)
- [Pronexo accreditation page](https://acredix.cl/acreditacion-pronexo)
- [Subcontractor accreditation page](https://acredix.cl/acreditacion-subcontratistas)
- [Salmon accreditation document checklist](https://acredix.cl/documentos-requeridos-acreditacion-salmonera)

### Existing read-only Acredix SEO evidence used

- 2026-07-10 GSC opportunity report and raw 90-day export
- 2026-07-10 live audit
- 2026-07-12 backlink reconciliation
- 2026-07-13 Chile backlink-prospect research and authority ledger
- 2026-07-17/18/19 public verification and frontier reports
- Current strategy, audit, context, and deterministic-tool references in `seo-growth-workspace`

No regulated client data, authenticated product UI, SuperaSEO state, or private customer evidence was used.
