# Andesphere Ahrefs POC baseline

**Decision ticket:** [Establish the Andesphere SEO baseline and highest-value Ahrefs POC opportunities](https://github.com/JorgeMenaDev/skills/issues/152)

**Observed:** 2026-07-19

**Target:** `https://www.andesphere.com` (`www` is canonical; the apex currently 307-redirects)

**Evidence boundary:** public site, public first-party Ahrefs documentation, read-only product-repository inspection, and the existing Matias `.seo/sites/andesphere` evidence. No Ahrefs account was created or changed, no property was verified, and no site, tracker, analytics, or SEO backlog state was mutated.

## Decision summary

Andesphere is a strong POC precisely because it already has first-party and deterministic evidence against which Ahrefs can be falsified:

- Google Search Console (GSC) knows Google's actual queries, impressions, clicks, selected canonicals, sitemap processing, and index status.
- PostHog and Cal.com know owned interaction and booking outcomes.
- Repository and live inspection know what is implemented and what production actually serves.
- The current live crawl already knows a concrete technical defect set: 44 internal 404 targets across 64 sitemap URLs.
- Existing manual research has a dated UK SERP sample and an authority hypothesis of zero independent backlinks.

Ahrefs therefore earns value only when it adds a verified decision outside those known sets. The highest-value POC opportunities are, in order:

1. **Backlink/referring-domain discovery:** test the current “zero independent links” baseline against Ahrefs' independent link index and identify lost/new or deep-page links that manual brand research missed.
2. **Own-site organic discovery:** compare Ahrefs organic keywords, top pages, and organic competitors with the GSC query/page export and the five-query UK SERP panel. The useful output is a validated new query, page, or competitor decision—not a different estimated number.
3. **External crawler disagreement:** run Site Audit over the small live site and compare it against the known 64-URL/44-broken-target baseline. Ahrefs must either reproduce known defects or surface independently verified, actionable defects that source/live checks missed.

Ahrefs' Health Score, Domain Rating, traffic estimates, issue totals, or keyword-volume estimates are not value by themselves. GSC, PostHog, repository truth, and live HTTP retain precedence in their domains.

## Method and source state

### Evidence snapshots inspected

- Matias workspace at local commit `cec7cbe27655c002410efb1d3bccba0a9eb48886`, especially:
  - `.seo/sites/andesphere/context.md`
  - `.seo/sites/andesphere/strategy.md`
  - `.seo/sites/andesphere/audit.md`
  - `.seo/sites/andesphere/backlog.md`
  - `.seo/sites/andesphere/reports/2026-07-19-gsc-indexing-watch.md`
  - `.seo/sites/andesphere/reports/gsc-2026-07-10-agentsfirst-run.json`
  - `.seo/sites/andesphere/reports/gsc-opportunities-2026-07-10.md`
  - `.seo/sites/andesphere/reports/conversion-baseline-2026-07-12.md`
  - `.seo/sites/andesphere/reports/uk-serp-codex-computer-use-2026-07-12.md`
  - `.seo/sites/andesphere/reports/2026-07-14-uk-authority-sprint.md`
  - `.seo/sites/andesphere/backlinks/summary.md`
  - `.seo/sites/andesphere/loops/*.json`
- Product repository `Andesphere/new-andesphere-frontend`, inspected read-only at local `origin/main` `7e3782d525d8e805e9cf855b47a2e4df2785573f`; relevant sources include `app/sitemap.ts`, `app/robots.ts`, `config/programmatic-seo/`, `content/blog*/`, and `package.json`.
- Live public endpoints checked 2026-07-19: [homepage](https://www.andesphere.com/), [Spanish homepage](https://www.andesphere.com/es), [robots.txt](https://www.andesphere.com/robots.txt), [sitemap.xml](https://www.andesphere.com/sitemap.xml), [UK pillar](https://www.andesphere.com/solutions/ai-agents-uk), and [Latin America pillar](https://www.andesphere.com/es/solutions/agentes-de-ia-para-empresas-latinoamerica).
- Current first-party Ahrefs sources: [Ahrefs Free](https://ahrefs.com/free), [free-account capability inventory](https://help.ahrefs.com/en/articles/13002606-what-can-i-use-for-free-in-ahrefs), [property-verification methods](https://help.ahrefs.com/en/articles/3275938-verifying-ownership-of-your-project-or-website), [Site Audit configuration](https://help.ahrefs.com/en/articles/9082329-how-should-i-configure-my-site-audit-settings), [Site Audit exports](https://help.ahrefs.com/en/articles/2646667-how-to-export-site-audit-report), [organic-traffic methodology](https://help.ahrefs.com/en/articles/1863206-what-is-organic-traffic-in-ahrefs-and-how-do-we-calculate-it), [keyword freshness](https://help.ahrefs.com/en/articles/1032342-why-don-t-the-ranking-positions-in-site-explorer-match-those-i-see-in-google), and [Ahrefs Terms](https://ahrefs.com/legal/terms).

### Live recheck

The read-only live check reproduced the current workspace facts:

- `robots.txt` allows `/` and disallows API, Next.js assets, private/preview/draft/dashboard/admin/action paths; it names the canonical sitemap.
- `sitemap.xml` contains 64 URLs.
- `/`, `/es`, the UK pillar, and the Latin America pillar return 200 with the expected language, title, and self-canonical.
- The apex returns 307 to `www`.
- `/privacy` and `/terms` remain 404 pending the already-implemented legal-pages PR; this is known backlog state, not an Ahrefs opportunity.

## Current baseline by evidence owner

| Owner | What is already known | Current decision value | What it cannot establish |
| --- | --- | --- | --- |
| **GSC** | On 2026-07-19, sitemap discovery had refreshed to 64 submitted URLs with no sitemap errors/warnings. URL Inspection classified 15 as submitted/indexed, 30 discovered-not-indexed, 13 unknown to Google, and 6 crawled-not-indexed. `/`, `/es`, and both new market pillars were indexed with matching canonicals. | Google-specific indexing and search-performance truth. It already proves whether Google selected a canonical or exposed a page/query. | Competitor or whole-web backlinks; links Google does not expose; a complete technical crawl; competitor keyword universes. |
| **GSC query/page export** | The 2026-04-12–2026-07-10 agents-first export has 105 rows, 101 unique queries, 12 URLs, 3,501 impressions and 0 clicks in the captured query/page rows. The legacy London custom-software page accounts for 3,203 impressions. It surfaces cannibalisation on `custom ai development london` and `ai agency london`. | Actual Google impressions, clicks, CTR and average position for surfaced rows. | Zero-impression or withheld queries, stable national rank, competitor rankings, backlink causes, or traffic potential. |
| **Early pillar watch** | For 2026-07-01–2026-07-18 the UK pillar recorded 37 impressions at weighted position 68.54 across 12 rows; the Latin America pillar recorded 5 impressions at weighted position 23.2 across two rows. Neither had a click. | Early exposure only; existing measurement obligations correctly defer treatment decisions until 2026-08-09. | Causal proof, sufficient CTR evidence, or a reason to change the pages now. |
| **PostHog + Cal.com** | The 2026-07-12 baseline recorded 324 pageviews, six quote-modal opens, and zero tracked conversions over the prior 90 days. Same-day remediation made booking and WhatsApp CTA events observable and established a fresh Cal.com baseline of zero bookings. Pending obligations recheck qualified outcomes on 2026-08-09. | Actual owned-site behavior and booking outcomes; the authority for whether organic demand becomes useful activity. | Search demand, indexation, backlinks, or technical implementation truth. Ahrefs traffic cannot replace it. |
| **Repository/source inspection** | Next.js App Router generates the sitemap from eight static entries, programmatic configuration, and 41 Markdown blog files (30 EN, 11 ES at inspected `origin/main`). `app/robots.ts` owns crawler rules. Canonicals, locale routes, structured data, CTAs, and the production code path are inspectable. | Implementation truth and exact remediation ownership. | What an external crawler actually received at a point in time; Google's index state; third-party link discovery. |
| **Live HTTP/render inspection** | Current core routes are 200 and self-canonical; the site is bilingual; the sitemap has 64 URLs. A 2026-07-19 full-sitemap crawl tested 131 unique internal anchor targets and found 44 internal 404 targets: 42 invented locale mirrors plus `/solutions/ai-automation` and `/solutions/london`. | Reproducible production truth. The broken-link issue already has owner `SEO-031`; Ahrefs rediscovery is duplicate validation, not a new backlog item. | Whole-web backlinks, stable keyword estimates, or Google-specific indexed status. |
| **Deterministic skill state** | `loop-state.mjs verify` was green at skill 6.0.1: zero occurrences, five obligations, three ship events and three coverage rows. Coverage exists for GSC opportunities, the Latin America SERP matrix, and the UK SERP sample. The deterministic offline link analyzer makes no Ahrefs/network call. | Contract/state integrity and deterministic local link-graph analysis. | External crawl behavior and external link-index coverage. Missing rungs are not automatically Ahrefs gaps. |
| **Manual UK SERP panel** | Five personalised UK desktop queries produced a dated page-one domain matrix. `openkit.co.uk` recurred four times; `gov.uk` four; `salesforce.com` and `jadasquad.com` three; several exact-match UK agencies recurred twice. | Intent and visible-occupant evidence for the UK pillar. | Stable/non-personalised rank, search volume, or whether an Ahrefs-estimated competitor is commercially relevant. |
| **Authority research** | The 2026-07-14 manual footprint found three register-style citations, zero editorial mentions and zero third-party links. It identified ranking directory/listicle routes and staged a free-directory batch. A 2026-07-19 recheck showed the X and LinkedIn profiles now exist, so the older backlink summary is stale on those entity facts. | A falsifiable backlink baseline and an already-qualified authority funnel. | Exhaustive link discovery, historical gained/lost links, anchor distribution, or deep-page link coverage. This is the clearest Ahrefs gap. |

## Concrete gaps Ahrefs Free could close

### 1. Independent link-index coverage — high expected value

The present “zero links” conclusion came from manual entity and web research, not a dedicated backlink index. Free Site Explorer for a verified property can expose up to 1,000 backlinks/keywords at once according to [Ahrefs Free](https://ahrefs.com/free). A bounded own-site observation can test:

- whether any independent referring domains or deep-page links were missed;
- whether links point to apex versus `www`, redirecting URLs, old slugs, blog pages, or market pillars;
- whether discovered links are live, indexable, editorial, directory, spam, self-owned, or register scrapes;
- whether Ahrefs' “new/lost” or anchor views create a maintainable monitoring checkpoint on the free surface.

**Net-new test:** a backlink counts only after the source page is opened manually, the link is confirmed live, its target/redirect is verified, and its ownership/type is classified against the existing authority funnel. A newly displayed row that is dead, nofollow, self-owned, unlinked citation, duplicated, or already in the work log is not a net-new actionable backlink.

### 2. Own-site keyword/page/competitor expansion — medium expected value

GSC has actual data but only for surfaced own-site rows. Ahrefs may expose estimated organic keywords, top pages, positions and organic competitors beyond the current export. This could improve the next research question by finding:

- a commercially relevant query family not present in the 105-row GSC export;
- a ranking URL outside the 12 GSC URLs;
- an unexpected recurring organic competitor not in the frozen five-query UK panel;
- an apex/query-parameter/legacy URL that Ahrefs still associates with visibility or links.

The comparison must not reward larger row counts. Ahrefs states that organic traffic is modeled from rankings, search-volume estimates, and CTR assumptions, and that positions may not match live Google because of location, freshness, and database coverage. Treat every Ahrefs keyword, traffic, and position as a third-party estimate.

**Net-new test:** an estimated row earns actionability only if a manual SERP, GSC, or page/intent check validates that it changes a target query, canonical page, competitor set, content brief, or monitoring cohort. A query that is irrelevant, geographically wrong, already mapped, or unsupported by live intent is a false positive or duplicate—not an opportunity.

### 3. External crawl disagreement — medium expected value, high duplication risk

The site is far below the advertised 5,000 monthly crawl credits per project. Site Audit can provide an independent external crawl and manual export, but the current stack already has repository/live checks plus a known 44-target defect set.

The valuable questions are:

- Does Ahrefs reproduce the two classes of known broken internal targets?
- Does it crawl all intended sitemap pages and identify the same canonical host?
- Does it find a live, reproducible technical defect not in `audit.md` or `backlog.md`?
- Does it classify valid product decisions as issues—for example the deliberate 307 apex redirect, absent false locale mirrors, absent pricing, EN-only UK pillar, or expected `/api/` exclusions?
- Can its CSV/PDF evidence be persisted and reconciled without making the provider dashboard the sole source of truth?

**Net-new test:** an Ahrefs issue is actionable only after live HTTP/render or source inspection reproduces it, it is absent from current audit/backlog ownership, and resolving it would change search accessibility, canonical consistency, internal discovery, metadata/schema correctness, or user experience. Health Score movement and issue counts alone do not qualify.

### 4. Competitor top-backlink spot checks — lower, targeted value

The anonymous Backlink Checker can be used manually on a small frozen panel, without pretending that its top 20 rows are a complete gap analysis. The best bounded panel is three SERP-confirmed roles:

- `openkit.co.uk` — recurring service competitor;
- `jadasquad.com` — recurring listicle/competitor-publisher occupant;
- one exact-match service leader such as `businessaiagents.co.uk` or `geeks.ltd`.

This POC asks whether the top rows reveal one legitimate, relevant, indexable inclusion route not already present in the staged directory/listicle research. It must reject reciprocal schemes, paid placements masquerading as earned links, competitor-authored no-route listicles, irrelevant high-DR pages, and sources already in the authority funnel.

## Bounded POC observation matrix

| Observation | Frozen input/scope | Existing comparator | Record | Net-new success | Duplicate / false-positive signal |
| --- | --- | --- | --- | --- | --- |
| **Site Explorer: referring domains/backlinks** | Verified `andesphere.com` project; all visible own-site referring-domain/backlink rows, capped by the free UI | Authority sprint, `backlinks/work-log.md`, live source/target checks | Counts shown, rows inspected, source URL, target URL, first/last seen if exposed, anchor, link attributes, source type, live/indexable result, redirect result | At least one previously unknown, live, relevant link or a substantiated historical-loss/redirect repair decision | Known register scrape, self-owned link, dead source, absent link, duplicate target, spam, or no resulting decision |
| **Site Explorer: organic keywords/top pages** | All free visible own-site keyword/top-page rows; preserve location/database and observed date | 105-row GSC export, 2026-07-19 pillar watch, page inventory | Query, estimated country/position/volume/traffic, URL, Ahrefs freshness, GSC match, live-SERP validation, intent classification | A validated query/page/canonical decision absent from the GSC-backed map | Merely more rows; wrong country; stale position; irrelevant intent; already mapped query; no source/live corroboration |
| **Site Explorer: organic competitors** | Visible own-site competitor report, frozen at observed date/location | Five-query UK recurring-domain matrix | Domain, overlap metric shown, qualifying queries/pages, role, presence in frozen SERPs, commercial relevance | A relevant competitor worthy of a new dated profile or SERP-panel hypothesis | Marketplace/media/official domain mislabeled as service competitor; already profiled; no relevant overlap |
| **Site Audit: coverage** | Canonical `https://www.andesphere.com`, respect robots, internal HTML, sitemap seed, JavaScript setting recorded; stop after one complete crawl | 64 sitemap URLs; live status/canonical checks | Credits before/after, URLs crawled, sitemap URLs missed, non-sitemap URLs found, status/canonical/indexability | A verified coverage gap or crawlability/canonical defect not currently owned | Expected disallow, deliberate redirect, noncanonical parameter URL, or crawler-configuration artifact |
| **Site Audit: broken internal links** | Same single crawl | 44 known targets: 42 locale mirrors + two authored broken paths | Ahrefs issue row/export, source, target, status, known/new, live reproduction | Reproduces known set sufficiently to establish sensitivity, plus any independently verified new defect | Misses known classes without explained scope; counts repeated links as new decisions; transient status; stale crawl |
| **Site Audit: other technical issues** | Only High/Medium and selected indexability/internal-link/meta/schema categories from that crawl | `audit.md`, `backlog.md`, source/live inspection | Provider rule, affected URLs, evidence, existing owner, independent verdict, disposition | One new verified actionable defect, or a useful proof that a known concern is externally visible | Generic “best practice,” score-only concern, framework false positive, already-owned defect, or non-reproducible issue |
| **Anonymous competitor backlink check** | Three frozen domains; top 20 only; manual use | Staged 11-prospect authority matrix and skip list | Competitor, source page/domain, target, relevance, inclusion route, paid/reciprocal flag, already-known status | One legitimate, relevant, feasible prospect not already qualified or rejected | Existing prospect, no inclusion route, irrelevant source, paid-only placement, reciprocal/link scheme, or unverifiable link |

## Run protocol that keeps the comparison honest

1. **Freeze before login:** record the comparison date, current Matias commit, current live sitemap URL count, known 44-target set, current GSC export/report dates, frozen three-domain competitor panel, and current backlog IDs. Do not update the baseline after seeing Ahrefs output.
2. **Record verification and project scope:** property entered, canonical host, verification method, verification date, account/plan label, GSC permission scope if OAuth is used, and whether ownership revalidation is required. Verification is provider setup evidence, not SEO value.
3. **Record crawl configuration:** seed source, scope rules, robots behavior, user agent, JavaScript rendering, external-link behavior, speed, URL-parameter rules, and enabled integrations. Configuration-caused differences are not defects.
4. **Capture provider metadata before interpretation:** report name, observed time, database/location, “last update” or first/last-seen fields, visible-row limit, credits before/after, and export availability.
5. **Export where officially supported:** preserve the Site Audit CSV/PDF and a human-readable run report. Site Explorer Free currently documents no ordinary export allowance, so record bounded rows manually; never scrape or automate the UI. Ahrefs' [Terms](https://ahrefs.com/legal/terms) prohibit automated web-interface access outside the API.
6. **Blind classify against the baseline:** mark every item `known`, `net-new candidate`, or `provider-only/unknown` before creating any action. Then independently verify every candidate through live HTTP/render, source, GSC, or the linking source page.
7. **Disposition without mutating the site:** record `actionable-new`, `useful-corroboration`, `duplicate`, `false-positive`, or `unresolved`. The POC produces evidence and a provider-contract decision; it does not create Andesphere backlog rows or fixes.
8. **Re-run only for reproducibility:** repeat the same bounded views once after a declared interval chosen by the operating-contract ticket. Record additions, removals, and changed freshness. Do not continuously refresh to chase a favorable result.

## Required evidence fields

### Run-level fields

| Field | Purpose |
| --- | --- |
| `site`, `canonicalOrigin`, `projectScope` | Prevent apex/`www`, subdomain, path, or protocol ambiguity. |
| `provider`, `surface`, `accountPlan` | Distinguish Ahrefs Free Site Explorer, Site Audit, anonymous checker, public API, and any future paid surface. |
| `observedAt`, `providerUpdatedAt`, `database`, `location` | Separate collection time from provider-data freshness and geography. |
| `verificationMethod`, `verifiedAt`, `permissionScope` | Make the GSC/DNS/file/tag trust and data-sharing boundary visible. Store no token. |
| `crawlSeed`, `robotsMode`, `userAgent`, `javascriptMode`, `scopeRules`, `integrations` | Make a crawl reproducible and explain provider/configuration disagreements. |
| `visibleRowLimit`, `exportAllowance`, `creditsBefore`, `creditsAfter` | Prove the free-plan cost and coverage boundary. |
| `baselineCommit`, `baselineArtifacts`, `liveSitemapCount`, `knownFindingFingerprint` | Bind comparisons to the pre-Ahrefs baseline. |
| `operatorMinutesSetup`, `operatorMinutesReview`, `operatorMinutesVerification` | Measure recurring human cost rather than calling a free subscription “free operation.” |
| `rawEvidence`, `normalizedReport` | Preserve provider output where allowed and a durable human-readable synthesis in `.seo`. |

### Finding-level fields

| Field | Purpose |
| --- | --- |
| `findingId`, `surface`, `providerRule` | Stable identity and provider context. |
| `sourceUrl`, `targetUrl`, `affectedUrls`, `query`, `country` | Exact entity being evaluated; use only fields relevant to the finding. |
| `providerValue`, `providerFreshness`, `providerEstimate` | Preserve what Ahrefs actually said and label estimates. |
| `baselineMatch` (`exact`, `partial`, `none`) | Distinguish duplication from novelty. |
| `precedenceOwner` (`GSC`, `PostHog`, `repository`, `live`, `Ahrefs`) | Prevent a provider estimate from overriding first-party truth. |
| `independentVerification`, `verifiedAt` | Live/source/GSC proof or explicit `Unknown`. |
| `disposition` | `actionable-new`, `useful-corroboration`, `duplicate`, `false-positive`, or `unresolved`. |
| `actionChanged`, `owner`, `existingTicket` | State whether the finding really changed a decision and avoid duplicate backlog work. |
| `falsePositiveReason`, `limitations` | Preserve why provider output was rejected or bounded. |

## POC value measures

Use counts and rates only after row-level disposition:

- **Verified net-new actionable findings:** independently verified findings absent from existing evidence that change a specific decision.
- **Useful corroborations:** known findings Ahrefs reproduces with evidence that improves confidence or monitoring, without creating a new action.
- **Duplicate rate:** duplicates divided by all reviewed Ahrefs findings.
- **False-positive rate:** independently disproved or materially misclassified findings divided by all independently verifiable reviewed findings.
- **Unresolved rate:** provider-only findings that cannot be verified with available sources.
- **Known-defect sensitivity:** known broken/internal/indexability findings Ahrefs detects divided by the frozen known set it was configured to observe. Report by defect class, not only total rows.
- **Novelty yield per review hour:** verified net-new actionable findings divided by setup + review + verification hours.
- **Decision-change rate:** findings that change a target query, page, competitor, technical remediation, backlink prospect, or cadence divided by all reviewed findings.
- **Persistence completeness:** required run/finding fields preserved outside the provider dashboard divided by required fields.
- **Reproducibility:** same finding set reproduced under the same scope, with provider freshness differences explained.
- **Free-plan sustainability:** credits and visible/export limits support the declared cadence without silent truncation across the full site.

The operating-contract ticket should set the final adoption threshold, but this baseline supports a strict candidate bar: a mandatory capability should either produce at least one verified net-new decision across the two POCs **or** provide high-sensitivity, low-false-positive corroboration that is materially cheaper or more persistent than the existing method. Merely producing a score, more rows, or another estimate fails.

## Expected dispositions before the account POC

| Capability | Andesphere expectation | Why |
| --- | --- | --- |
| Verified Site Explorer backlinks/referring domains | **Highest-value candidate** | Current authority baseline lacks dedicated link-index evidence and is directly falsifiable. |
| Verified Site Explorer organic keywords/top pages | **Useful comparison candidate** | Could extend sparse GSC coverage, but estimates and stale positions create duplication/false-positive risk. |
| Verified Site Explorer organic competitors | **Useful comparison candidate** | Can test whether the five-query panel missed recurring service competitors; role classification remains manual. |
| Site Audit crawl and exports | **Canonical corroboration candidate, not assumed replacement** | Small-site free limit is ample and persistence is better, but live/source tooling already knows significant defects. |
| Site Audit Health Score | **Reject as a success measure** | Aggregate proprietary score cannot establish implementation or search outcome truth. |
| Domain Rating | **Context only** | Directional third-party estimate; no hard prioritization or quality gate. |
| Ahrefs traffic/volume/KD estimates | **Directional only** | They can support comparison but cannot override GSC actuals or live intent. |
| Anonymous competitor Backlink Checker | **Bounded prospect-discovery candidate** | Top 20 can generate hypotheses, not a complete gap. Existing authority policy must qualify every route. |
| Ahrefs Web Analytics | **Out of scope** | PostHog and Cal.com already own user outcomes. |
| Toolbar, AI Content Helper, Social Manager, writing tools, sitemap generator | **Out of scope** | They do not close a baseline gap owned by this POC. |

## Newly surfaced decision questions

These questions are now sharp enough for the parent map to place or fold into the operating-contract/setup tickets:

1. **Verification route:** should the canonical route use GSC OAuth for least site mutation and immediate project import, despite sharing Search Console data with Ahrefs, or prefer DNS/file/tag verification with its own persistence and deployment burden?
2. **Canonical project scope:** should the required project be `andesphere.com` domain scope or exact `https://www.andesphere.com` prefix, and how must apex/`www` and any subdomains be represented so rows are comparable across sites?
3. **Site Audit configuration contract:** which robots, JavaScript, seed, external-link, parameter, speed, and integration settings are mandatory, and which settings may be site-specific?
4. **Mandatory surface versus mandatory finding:** is the requirement to run Site Audit/Site Explorer at a cadence, or must every workflow checkpoint consume a named report even when it adds only duplicates?
5. **Persistence under zero Site Explorer export rows:** is manual normalized capture of the bounded free rows sufficient for canonical evidence, or does the inability to retain a provider export make some Site Explorer reports noncanonical?
6. **Freshness and rerun cadence:** what maximum age applies separately to backlink, organic-keyword, competitor, and crawl evidence, given Ahrefs' different refresh mechanisms and the site's existing GSC/loop obligations?
7. **Known-defect sensitivity bar:** how much of the frozen 44-target set must Site Audit reproduce before it can be trusted as a required checkpoint, and should miss rates be evaluated by unique target, source-target edge, or provider issue row?
8. **Value threshold:** must each POC site produce a verified net-new action, or can one site's net-new value plus both sites' high-sensitivity corroboration justify a fleet-wide mandatory lane?
9. **Access degradation:** when the free UI truncates, export is unavailable, data is stale, or credits are exhausted, which checkpoints become `access:ahrefs` and which continue using GSC/live/deterministic evidence without pretending the Ahrefs checkpoint passed?
10. **Authority workflow boundary:** should anonymous competitor top-20 backlink checks be a required POC-only observation, a recurring mandatory checkpoint, or an optional technique inside a required backlink-gap outcome?

## Conclusion

Andesphere provides a clean falsification baseline for canonical Ahrefs adoption. The current system already knows Google's index state, observed queries, outcomes, implementation, public runtime behavior, a large broken-link set, a SERP competitor sample, and a manually researched authority funnel. Ahrefs' probable incremental value is concentrated in its independent backlink index, followed by own-site keyword/competitor expansion and external-crawler corroboration.

The POC should not ask “did Ahrefs find issues?” It should ask “which Ahrefs observations survived independent verification, changed a decision, were not already known, and can be persisted and repeated within the free-plan contract?” The matrix and evidence schema above make that answer measurable without displacing GSC, PostHog, repository inspection, live verification, or deterministic tooling.
