# Operating Loop

Use for `operate` mode: continuing SEO work from an existing target repo without treating SEO as a one-time checklist.

## Purpose

The skill should always answer:

- What was the last SEO action?
- What evidence was collected?
- What is currently in progress or ready?
- If nothing is ready, what should be checked next?
- What is the next smallest evidence-backed improvement?

Do not conclude SEO is done because the visible backlog is empty. Apply the Empty Backlog Rule in `references/ticket-architecture.md`: run the smallest health checkpoint below, and when the checkpoints look healthy, switch to the Opportunity Frontier below. When the user wants all unblocked work exhausted, use the Final Checkpoint at the end.

## State Read Order

`.seo/` here means the resolved workspace root — repo-local `.seo/` in standalone mode, `.seo/sites/<slug>/` in hub mode (`references/hub-mode.md`). Read current state before choosing work:

1. `.seo/backlog.md` for current focus, in-progress work, Ready rows, Blocked rows, and Done history.
2. `.seo/log.md` for the last action, handoff notes, stale leads, and recheck dates.
3. `.seo/audit.md` for evidence-backed findings and unresolved risks.
4. `.seo/strategy.md` for durable decisions, tooling, market, language, and production paths.
5. Latest relevant `.seo/reports/*` for dated GSC, analytics, content, pSEO, backlink, local SEO, validation, or admin evidence.
6. `.seo/backlinks/work-log.md` for pending outreach, submissions, and live-link states.
7. `.seo/context.md` for business context, ICP, competitors, conversion paths, and constraints. If missing in a mature workspace, use `.seo/strategy.md`, `.seo/audit.md`, `.seo/README.md`, and any product/positioning doc the repo keeps (for example `.agents/product-marketing.md`) for the current run and record workspace drift.

If `.seo/` is missing, run `bootstrap` first. If a required file is missing in an existing workspace, create only that missing file and preserve existing notes unless the run is no-write; then report the drift instead of writing.

## Target Boundary

Before continuing a current-focus or blocked ticket, ask whether it is still the target site's growth work. A ticket should be parked or moved out of the active loop when it is mainly:

- infrastructure monitoring,
- another site's publishing path,
- waiting on another operator or a scheduled run,
- blocked on product/business ownership rather than SEO implementation, or
- outside the surface the user asked to improve.

Label reports with the target surface at the top. When parking a side monitor, record the evidence, owner/surface, and next unblock signal, then continue with the smallest target-owned SEO checkpoint. In hub mode, a parked ticket that belongs to another *registered* site may additionally be re-filed into that site's backlog per the Cross-Site Re-Filing rule in `references/hub-mode.md`.

## Work Selection Order

Choose work using the Work Selection order in `references/ticket-architecture.md` (current focus → in progress → top Ready → newly unblockable Blocked → new evidence-backed ticket). That file owns the order, duplicate rules, and done criteria; do not restate them here or in the workspace.

## Lightweight Checkpoints

When no current, in-progress, or Ready ticket exists, do not rerun every audit. Pick the smallest checkpoint suggested by stale evidence or the most likely growth constraint.

| Area | Check | Likely ticket area |
| --- | --- | --- |
| Indexability | robots, sitemap, canonical host, noindex, changed public routes | `indexability` |
| Search Console | sitemap read state, URL inspection state, page/query opportunities, stale follow-ups | `gsc` |
| Analytics | pageview proof, conversion events, organic landing pages, missing CTA/form tracking | `analytics` |
| Conversion | cold-visitor CTA paths, pricing/contact/demo path, mobile CTA behavior | `cro` |
| Content | blog renderer, recent posts, content calendar, keyword gaps, stale briefs | `content` |
| Internal links | orphan pages, blog-to-money-page links, pSEO hub links, repeated exact-match anchors | `internal-links` |
| pSEO | planned vs published state, sitemap/noindex policy, batch QA, stale generated pages | `pseo` |
| Schema | rendered JSON-LD, visible-content match, missing page-type schema | `schema` |
| Performance | CWV field data (CrUX/PSI or the GSC CWV report), public pages loading app/auth code, image/font regressions | `performance` |
| Authority | backlink work-log states, staged prospects, live-link verification, entity/profile gaps | `backlinks` or `entity` |
| AI visibility | AI-crawler access state, assistant citations for money queries, assistant referral traffic | `ai-visibility` |
| Local | GBP, reviews, citations, service-area pages, local competitor changes | `local-seo` |
| Reporting | missing monthly report, stale metrics, no single next action | `reporting` |

If all checks look healthy, log the evidence, then move to the Opportunity Frontier below instead of stopping silently or manufacturing a monitoring ticket.

## Opportunity Frontier

A healthy site with an empty backlog is the signal to switch from defect-finding to demand-finding. Sweep the sources below until enough evidence-backed Ready tickets exist for the next cycle (default 1-3; configurable), or every source has been run or skipped with a recorded reason. Each source either yields tickets with the qualifying evidence or a one-line skip reason (no access, no data yet, out of scope, human gate). The source list, order, and ticket target are practitioner-consensus skill defaults, not Google guidance.

| Frontier source | What to look for | Reference | Qualifying evidence for a ticket |
| --- | --- | --- | --- |
| Customer language | Repeated sales/support/review/community questions and pains the site does not answer | `references/content-ops.md` | Verbatim question or pain, where and how often it appears, buyer stage or `Unknown` |
| GSC opportunities | Page-2 positions, CTR-vs-band gaps, cannibalization, emerging query themes | `references/search-console.md` | Query-to-URL row with baseline clicks/impressions/position and date range |
| Content decay | Historically strong, business-relevant pages declining vs the prior comparable period | `references/content-refresh.md` | Decline metrics plus a refresh/consolidate/remove decision |
| Competitor gaps | Demand competitors capture that the target does not; changed competitor money pages | `references/competitor-profiling.md`, `references/content-ops.md` | Dated snapshot or gap row with an ICP-relevance note |
| Money-query SERPs | Intent shifts, SERP-feature changes, weak ownership of commercial queries | `references/search-console.md` (Money Page Mapping) | Dated live-SERP observation mapped to an owned or planned page |
| Product surface | New features, integrations, comparisons, or datasets that unlock page types | `references/pseo-gates.md` | Named data/asset, chosen page type, publish gates acknowledged |
| Utility tools | Repeated task-shaped questions a small tool could satisfy on-page | `references/utility-tool-pages.md` | Opportunity-matrix row with product fit and conversion path |
| Entity/brand | Brand SERP state, Organization schema, profile consistency | `references/backlinks-entity.md` | Observed inconsistency or missing owned surface |
| Authority/PR | Linkable first-party data, unlinked mentions, qualified listicle/directory targets | `references/backlinks-entity.md` | Qualified prospect row with reproducible query evidence |
| AI visibility | Assistant citation gaps or portrayal problems on money queries | `references/ai-search-visibility.md` | Dated observation row routed per that contract |

Read the site's stage from `.seo/context.md` current standing and lead with the sources most likely to pay off (practitioner-consensus emphasis, not a rule):

- **Early, little GSC data**: customer language, category/comparison/jobs-to-be-done pages, entity basics. Thin GSC data is not evidence of no opportunity — early demand lives in sales and support language before it shows in Search Console.
- **Growth**: GSC striking-distance rows, decay refreshes, internal links, competitor gaps.
- **Mature and healthy**: decay/refresh program, authority/PR, conversion work on top organic landing pages, and delta monitoring via `references/scheduled-operation.md` loops.

### Frontier Ticket Bar

Every frontier ticket clears this bar before it enters Ready:

- Names the expected business outcome — qualified traffic, leads, signups, or conversions on a money path — not a vanity metric.
- Records baseline metrics and the exact verification evidence required by `references/ticket-architecture.md`, so the outcome is attributable later.
- Cites its frontier-source evidence (row, snapshot, or report path).

Hard rejects — manufactured work, never tickets: generic article ideas without demand and product-fit evidence, re-running a clean technical audit (after a green baseline, monitor deltas instead), date-only "freshness" bumps (`references/content-refresh.md`), mass or thin page batches outside the pSEO gates, and rank/authority-score/traffic goals with no conversion path.

### Nothing Valuable This Cycle

"Nothing valuable this cycle" is a certified conclusion, not a default. Log it only when every frontier source was run (evidence saved) or skipped with a recorded reason, and no candidate cleared the ticket bar. Anything less is "have not looked deeply enough" — run the cheapest unrun source instead. Record the certification as a dated checkpoint report with per-source results, then name the next unblock signals or recheck date. Do not backfill the queue with junk tickets to avoid writing it.

## Empty Backlog Final Checkpoint

Use this when the user asks to continue until no backlog items remain, or when all visible work is external-gated.

1. Read backlog, log, audit, strategy, latest reports, and live public sanity routes.
2. Separate unblocked repo-owned SEO actions from external gates such as GSC recrawl lag, missing profile ownership, missing contact destination, legal/business facts, or infrastructure monitoring.
3. If no unblocked repo-owned action remains, complete the Opportunity Frontier (run or skip every source with a reason), then write a dated checkpoint report and log entry instead of creating a fake Ready ticket.
4. Move out-of-scope side monitors out of the active backlog with evidence and an owner/surface note.
5. Name the next unblock signals clearly without turning them into backlog items.

## Handoff Log

Write a short `.seo/log.md` entry after each run. Long evidence belongs in `.seo/audit.md` or `.seo/reports/*`; the log is for continuity.

```md
## YYYY-MM-DD - Short title

- Mode: operate / technical-seo-fix / content-ops / ...
- Read: backlog, log, audit, strategy, latest reports.
- Chosen ticket: SEO-000 or `new ticket created`.
- Evidence: command, live URL, report path, admin surface, or limitation.
- Result: completed, in progress, blocked, skipped, or new Ready ticket.
- Next lead: one concrete follow-up with owner or recheck date.
```

## Exit Criteria

`operate` exits when current state has been read, the next work has been selected by the order above, one useful action has been completed or honestly blocked, verification evidence has been recorded, and `.seo/log.md` has a handoff entry.
