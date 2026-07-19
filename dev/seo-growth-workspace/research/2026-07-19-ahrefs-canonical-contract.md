# Ahrefs Free canonical capability, access, and compliance contract

Research date: 2026-07-19  
Decision ticket: [Establish the canonical Ahrefs Free capability, access, and compliance contract](https://github.com/JorgeMenaDev/skills/issues/151)

## Decision

Ahrefs Free can be a canonical tool for `seo-growth-workspace`, but only as a **required, human-operated evidence checkpoint for owned sites**. It cannot be the free tier's automated SEO data plane. The lawful and currently documented machine-access exception is the public Domain Rating endpoint; general API v3 and Ahrefs MCP require a paid Lite-or-higher plan, and Ahrefs prohibits UI scraping and automated use outside its API.

The minimum defensible canonical contract is:

1. Every managed owned site has an Ahrefs Free project whose ownership is verified by an authorized operator.
2. Bootstrap, migration reconciliation, and the agreed recurring audit cadence include a manually initiated Site Audit and a manual Site Explorer review.
3. The operator persists dated, decision-grade evidence outside Ahrefs because the free plan provides no Site Explorer export rows and Ahrefs disclaims durable storage responsibility.
4. Missing Ahrefs access blocks only the Ahrefs checkpoint; it does not suspend unrelated GSC, live-site, code, analytics, or implementation work.
5. Ahrefs evidence is always labelled **third-party estimate** or **vendor crawl observation**. GSC remains authoritative for Google's actual query performance, the live site and repository remain implementation truth, and product analytics remains outcome truth.
6. Agents never automate, scrape, or harvest the Ahrefs UI. Free-tier programmatic use is limited to documented public API endpoints under their current licences.
7. On and after 2026-08-01, the Domain Rating request must send a free Ahrefs API key as a Bearer token. The key is a secret and never enters `.seo`, reports, logs, screenshots, or source control.

This contract should first be proven on `andesphere.com` and `acredix.cl`. The POC must establish incremental decisions and operating cost before the skill release makes cadence, evidence shape, and fleet reconciliation normative.

## Evidence

### Free account and verified-project boundary

- [Ahrefs Free](https://ahrefs.com/free) describes the account as permanent limited access rather than a trial, with no credit card required. It lists unlimited verified websites, Site Explorer with up to 1,000 backlinks and keywords visible at once, and Site Audit with 5,000 crawl credits per month per verified project.
- The current [free-tools help article](https://help.ahrefs.com/en/articles/13002606-what-can-i-use-for-free-in-ahrefs) identifies six free-account tools. For the SEO contract, the relevant owned-site capabilities are Site Explorer and Site Audit. Site Explorer includes Overview, Backlinks, Referring domains, Anchors, Organic keywords, Organic positions, Top pages, Organic competitors, paid-search reports, Best by links, Crawled pages, and internal-link reports. Site Audit can run on demand and evaluate the vendor's full default issue catalogue for an owned site.
- [Verified-project documentation](https://help.ahrefs.com/en/articles/4321336-what-is-a-verified-project) says verified projects are free and unlimited on every plan and receive 5,000 Site Audit crawl credits per project per month. It also describes 500 additional monthly Site Explorer credits for URLs inside verified projects. A current [plan-comparison article](https://help.ahrefs.com/en/articles/6117209-what-s-the-difference-between-all-ahrefs-subscription-plans) instead lists a 1,000-row verified-site ceiling and zero export rows; this supports the visible-row ceiling but leaves the exact credit counter inconsistent across current first-party pages.
- Ownership can be verified through GSC, a DNS TXT record, an HTML file, or an HTML meta tag. Ahrefs recommends GSC and requires the Ahrefs project mode to match the GSC property mode. DNS, HTML-file, and meta-tag proof must remain in place because Ahrefs rechecks ownership; DNS propagation may take up to 48 hours. See [ownership verification](https://help.ahrefs.com/en/articles/3275938-verifying-ownership-of-your-project-or-website).
- A free account has no unverified-project allowance in the current plan comparison. Therefore free Site Explorer and Site Audit cannot be treated as general competitor-analysis access. The canonical free contract is for sites the operator is authorized to verify.

### Site Explorer evidence and freshness

- The free plan exposes at most 1,000 rows for a verified site and has zero export rows per month according to the [current plan comparison](https://help.ahrefs.com/en/articles/6117209-what-s-the-difference-between-all-ahrefs-subscription-plans). Site Explorer evidence must therefore be read and recorded manually; the skill must not promise a CSV or a complete dataset.
- Ahrefs says its live backlink index is refreshed with new data every 15–30 minutes, while a complete refresh of the whole web index takes about two months and different pages are revisited at different rates. See [backlink database freshness](https://help.ahrefs.com/en/articles/78052-how-often-is-ahrefs-links-database-updated). A pull date does not imply every displayed backlink was checked that day.
- Organic-keyword refresh varies from daily to several months according to estimated search volume, cannot be manually refreshed, is desktop-only in Site Explorer, and is country-level rather than city-level. See [keyword refresh](https://help.ahrefs.com/en/articles/647195-for-some-keywords-i-see-the-positions-in-organic-keywords-have-not-been-updated-for-a-long-time-can-they-be-updated-more-often) and [Site Explorer versus Rank Tracker](https://help.ahrefs.com/en/articles/2445174-difference-between-the-rank-tracker-and-site-explorer-s-organic-keywords-report).
- Ahrefs says its keyword estimates blend Google Keyword Planner, Google Trends, consented and anonymized GSC data, and other third-party sources; backlink/content data comes from Ahrefs crawlers. See [Ahrefs data sources](https://help.ahrefs.com/en/articles/78119-where-do-you-get-the-data-from). These are not first-party Google performance facts for the managed site.

### Site Audit operation and evidence extraction

- The current free limit is 5,000 crawl credits per verified project per month. Ahrefs says only internal HTML pages returning `200 OK` consume monthly crawl credits. See [row, export, and user limits](https://help.ahrefs.com/en/articles/14333008-about-rows-export-rows-and-user-limits).
- Site Audit can use the website, auto-detected or specific sitemaps, a custom URL list, and Ahrefs' backlink inventory as seed sources. It can constrain scope, depth, runtime, parameters, and include/exclude patterns. Settings apply only to new crawls. Site Audit uses `AhrefsSiteAudit`; Site Explorer uses the separate `AhrefsBot`, so a Site Audit crawl does not refresh Site Explorer. See [Site Audit settings](https://help.ahrefs.com/en/articles/9082329-how-should-i-configure-my-site-audit-settings).
- Ahrefs documents an overview PDF print and per-issue exports, but no single export containing every affected page for every issue. The documentation does not explicitly state whether per-issue exports are enabled on the free account; the POC must verify this rather than make it a skill guarantee. See [exporting a Site Audit report](https://help.ahrefs.com/en/articles/2646667-how-to-export-site-audit-report).
- Always-on Audit is not included by default on Free or Starter; it requires a paid project boost. See [Always-on Audit availability](https://help.ahrefs.com/en/articles/10957674-how-always-on-audit-works). It must not enter the free canonical contract.

### Account and collaboration behavior

- Each Ahrefs user has their own workspace. Inviting members requires Lite or higher, so a free workspace does not provide a supported multi-member collaboration model. See [workspace membership](https://help.ahrefs.com/en/articles/411099-how-do-i-add-and-manage-users-to-my-account-s-workspace).
- Ahrefs' Terms define an account as owned by the customer and used by authorized users, make the account owner responsible for account security and all activity, and require reasonable efforts to prevent unauthorized use. See [Terms of Service sections 1–4](https://ahrefs.com/legal/terms).
- This means the fleet needs a deliberate owner/operator and credential-recovery model. It must not normalize password sharing to compensate for the free workspace's lack of seats.

### API, MCP, and automation boundary

- [API v3 documentation](https://docs.ahrefs.com/en/api/docs/introduction) limits operational API access to eligible paid plans. Non-eligible plans receive only limited test queries; test queries are not a production integration contract. The API normally requires a key, is limited to 60 requests per minute by default, and may be dynamically throttled.
- [Ahrefs MCP documentation](https://docs.ahrefs.com/en/mcp/docs/introduction) requires Lite or higher and consumes the same monthly API allowance as direct API access. Its external endpoint may not be used through custom scripts, bridges, or standalone HTTP/JSON-RPC clients; supported programmatic access uses the public API. Free Ahrefs must not be represented as providing general MCP access.
- [Terms of Service section 4.3](https://ahrefs.com/legal/terms) prohibits searching, crawling, scraping, or harvesting the service except through Ahrefs-provided software or search agents; prohibits automated use except through the Ahrefs API; and prohibits bypassing restrictions, limits, or access controls. The prohibition explicitly covers tools, agents, devices, and mechanisms. Browser automation, DOM extraction, network interception, repeated screenshot/OCR extraction, or replaying private application endpoints would all violate the canonical contract.
- [Terms sections 4.7–4.8](https://ahrefs.com/legal/terms) allow Ahrefs to change or discontinue functionality without notice and place responsibility for retaining User Content on the customer. Recheck the free plan and legal boundary at every skill release and retain the evidence needed for decisions outside Ahrefs.

### Free Domain Rating endpoint

- The official [Domain Rating endpoint](https://docs.ahrefs.com/en/api/reference/public/get-domain-rating-free) is `GET https://api.ahrefs.com/v3/public/domain-rating-free`. It accepts a domain or URL and can return JSON, CSV, XML, or PHP. It remains free and consumes no API units.
- It currently permits unauthenticated requests. Starting **2026-08-01**, every request must include a free API key as `Authorization: Bearer <token>`; unauthenticated requests will return `401 Unauthorized`. Ahrefs says operators can migrate immediately by creating the free key in Account settings.
- Use is governed by the [Domain Rating licence](https://ahrefs.com/legal/domain-rating-license). Every display or publication must show a functional linked attribution reading **Domain Rating by Ahrefs**. The licence prohibits reselling or repackaging DR as a substitute for Ahrefs, systematic or bulk extraction to reconstruct or train a competing dataset, and bypassing restrictions. Ahrefs may change rate limits or withdraw the endpoint without notice and disclaims accuracy, completeness, currency, continuity, and fitness.

### Privacy and security

- Connecting GSC authorizes Ahrefs to receive safe authentication tokens and content from that third-party account. Ahrefs' privacy policy says it collects account, device, IP, access, usage, voluntarily supplied content, and connected-service information; may use collected information to provide and improve services, build analytics, and develop products including training machine-learning models; and may transfer information to service providers and across borders. See [Privacy Policy sections 3–6](https://ahrefs.com/legal/privacy-policy).
- The same policy says personal data is stored in the United States, transit to the browser and database backups are encrypted, but most live database data is not encrypted. It provides purpose-based retention rather than a fixed retention period. See [Privacy Policy sections 6 and 9](https://ahrefs.com/legal/privacy-policy).
- The canonical contract should therefore use least privilege: prefer DNS, HTML-file, or meta-tag verification when GSC aggregation is not explicitly needed; never enter customer PII, confidential copy, credentials, or private analytics into Ahrefs; and treat granting GSC access as a separate, informed provider-consent decision rather than a default consequence of making Ahrefs canonical.

## Marketing claims

The following are useful descriptions of product intent, not proof that the tool improves SEO outcomes:

- “Free forever,” “most generous free SEO crawler,” “identify and fix 170+ issues,” and similar superiority or outcome language are Ahrefs marketing claims.
- Health Score is an Ahrefs-derived percentage based on the proportion of crawled internal URLs without issues currently classified as errors. It can change when issue severity or enabled checks change; it is not a Google metric or a business outcome.
- Ahrefs' claims about index size and frequent updates do not establish complete coverage of a particular site's links, queries, pages, locale, or fresh changes.
- Estimated organic traffic, keyword volume, DR, UR, and traffic value do not establish actual Google impressions, clicks, conversions, revenue, quality, or causation.

## Inference

- A required Ahrefs Site Audit checkpoint can add value by providing a second crawler, JavaScript-rendering option, graph views, and vendor issue catalogue alongside live and code inspection. It may also support dated crawl comparison if the POC confirms adequate free-account history retention. Its best incremental value is discrepancy discovery, not replacing the skill's technical audit.
- A required Site Explorer checkpoint can add value by putting owned-site backlink, referring-domain, top-page, organic-keyword, and internal-link estimates in one view. Its best incremental value is prioritization and anomaly discovery that is then verified against GSC, the live site, and first-party analytics.
- The free tier's lack of Site Explorer exports makes a high-frequency or unattended canonical workflow disproportionately expensive. A bounded checkpoint at bootstrap, reconciliation, and a justified cadence is more defensible than requiring Ahrefs on every operate iteration.
- The public DR API offers a small repeatable machine checkpoint across the fleet, but DR should never become a target, pass/fail gate, backlink-quality proxy by itself, or substitute for link relevance, legitimacy, indexability, referral, and conversion evidence.
- Sites with more than 5,000 eligible internal HTML pages cannot assume full monthly coverage. They need a documented priority scope or sitemap partition, or a separately approved paid plan; the free limit must not silently turn a partial crawl into a “site audited” claim.

## Unknowns that the POC must resolve

1. Whether the current free UI for `andesphere.com` and `acredix.cl` exposes exactly the report set and 1,000-row behavior described in the free help article.
2. Whether per-issue Site Audit CSV export is enabled for a free account and, if so, its practical row/format limits. Site Explorer exports are documented as zero and should not be retested by circumventing the UI.
3. Free-account crawl-history retention, scheduled-crawl availability and frequency, notification behavior, and evidence URLs that remain stable enough to reference later. Current first-party docs do not state these free-plan details clearly.
4. The exact free Site Explorer credit counter. Current first-party pages describe 500 verified-project credits, 1,000 visible rows, and conflicting “power user credits” values. The contract should depend only on the consistent 1,000-row visible ceiling until the UI proves more.
5. Rank Tracker eligibility. Ahrefs Free's product and help pages omit it from the six-tool free account, while a plan comparison currently shows free limits for it. Exclude it from the contract unless the POC and refreshed documentation agree.
6. The account owner, recovery path, human operator, credential location, and authorization model for a free workspace that cannot add members.
7. Whether either POC site should grant GSC access to Ahrefs after reviewing requested OAuth scopes and actual privacy trade-offs. Verification without GSC remains available.
8. Actual incremental value: unique material issues, false positives, duplicates of current evidence, decisions changed, time spent, and findings that survive live/code/GSC verification.
9. The free DR endpoint's unpublished practical rate limit and whether a free-account key can be provisioned now in the intended organizational account without a plan prompt or other provider friction.

## Required capability candidates for the POC

| Candidate | Proposed canonical requirement | Gate | Persisted evidence | Exclusion / fallback |
| --- | --- | --- | --- | --- |
| Account and verified project | One organizationally owned Ahrefs Free project per managed owned site | Named owner/operator; recovery path; authorized verification; project scope matches canonical host/property | Project name, scope/mode, verification method, verification state, checked date, operator; never credentials or token values | Missing access blocks only this checkpoint; other SEO work continues |
| Site Audit | Human starts a bounded crawl at bootstrap/reconciliation and proposed cadence | Verified project; declared URL sources, scope, JS choice, page cap, remaining credits; no sensitive authenticated surface | Crawl date/ID if exposed, scope/settings, pages crawled, credits used/remaining, Health Score labelled vendor metric, error/warning counts, material issue rows, export/screenshot pointers, limitations | No Always-on Audit; partial coverage labelled; >5,000-page sites use explicit priority scope or paid-plan decision |
| Site Explorer | Human reviews Overview, backlinks/referring domains, organic keywords/top pages, and internal links for the owned site | Verified project; target/country/date declared; visible-row ceiling accepted | Dated manual snapshot/table with report, filters, sample/row ceiling, estimate label, material observation, corroboration status, decision changed | No UI automation or Site Explorer export assumption; no general competitor requirement on Free |
| DR public API | Script may fetch DR for a bounded declared domain list | Current docs/licence rechecked; after 2026-08-01 `AHREFS_API_KEY` present; attribution applied when displayed/published | Endpoint, target, checked time, response status, DR as third-party estimate, licence URL/version, limitation | Never bulk harvest, optimize to DR, or hard-gate work; manual evidence if endpoint unavailable |
| Cross-source reconciliation | Every material Ahrefs finding is confirmed, contradicted, or retained as an estimate/unknown | GSC/live/code/analytics source identified where applicable | Matrix row: Ahrefs observation, corroborating source, disposition, action/skip, owner, date | Ahrefs never overrides stronger first-party evidence silently |
| Value accounting | Measure whether canonical use earns its recurring cost | Same bounded POC protocol on both sites | Time spent; unique material findings; duplicates; false positives; decisions changed; verified outcomes or follow-up obligation | If it changes no decisions on both POCs, revisit required cadence/surface rather than fabricate value |

## Explicit exclusions

- No account creation, site verification, OAuth consent, DNS/HTML mutation, crawl, or provider-state change belongs to this research ticket.
- No Ahrefs UI automation, scraping, OCR harvesting, private-endpoint replay, or workaround for row/export/access limits.
- No claim that Ahrefs Free supplies general API v3 or MCP access. Free test queries are not an operating dependency.
- No mandatory competitor Site Explorer, Keywords Explorer, Rank Tracker, Web Analytics, Bot Analytics, Social Media Manager, AI Content Helper, SEO Toolbar, or standalone anonymous checker in this contract. They require separate evidence of value and scope fit.
- No replacement of GSC, product analytics, live/site-code inspection, or the skill's evidence and verification rules.
- No publication of DR without linked attribution, no DR-based quality gate, and no retention of secrets in `.seo`.
- No fleet-wide `.seo/sites` reconciliation until the two-site POC resolves account ownership, evidence shape, cadence, privacy choice, and incremental-value thresholds.

## POC decision output required from the next tickets

For each of `andesphere.com` and `acredix.cl`, the POC should return one comparable matrix:

| Surface | Ahrefs observation | Current-system evidence | Unique / duplicate / false positive / unresolved | Decision changed | Operator minutes | Persisted evidence pointer |
| --- | --- | --- | --- | --- | --- | --- |

The implementation decision is ready only when the two POCs can answer:

1. Which Site Audit and Site Explorer checks are mandatory, at what lifecycle moments and cadence?
2. What exact minimum evidence is durable despite free export constraints?
3. Which verification method and account owner/operator model is safe and maintainable?
4. What site-size boundary changes the contract from full crawl to scoped crawl or paid-plan decision?
5. What observed benefit justifies reconciling all existing `.seo/sites` workspaces?

## Newly surfaced decision questions

- **Account and access model:** Who owns the canonical Ahrefs workspace, how can an authorized human operate and recover it without unsupported credential sharing, and how are company/site boundaries represented?
- **Provider consent:** Should GSC OAuth ever be the default verification method, or should the skill default to persistent DNS/HTML proof and require a separate decision before importing GSC content into Ahrefs?
- **Cadence and value threshold:** Which lifecycle checkpoints require Ahrefs, and what two-site POC result is sufficient to justify recurring manual effort?
- **Large-site policy:** At what crawlable-page count does the skill require a documented partial-crawl design versus a paid-plan decision?
- **Evidence schema:** Which manual observations are necessary and sufficient when Site Explorer cannot export, and which screenshot/CSV artifacts are safe to retain?
