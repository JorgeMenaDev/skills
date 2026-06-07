# Operating Loop

Use for `operate` mode: continuing SEO work from an existing target repo without treating SEO as a one-time checklist.

## Purpose

The skill should always answer:

- What was the last SEO action?
- What evidence was collected?
- What is currently in progress or ready?
- If nothing is ready, what should be checked next?
- What is the next smallest evidence-backed improvement?

Do not conclude SEO is done because the visible backlog is empty. An empty queue means the operator should run a lightweight checkpoint, create one evidence-backed ticket if needed, or log why the next useful review is later. If the user's goal is explicitly finite, such as exhausting all unblocked repo-owned work, the checkpoint may end with "no immediate action remains" instead of inventing a recheck ticket.

## State Read Order

Read current state before choosing work:

1. `.seo/backlog.md` for current focus, in-progress work, Ready rows, Blocked rows, and Done history.
2. `.seo/log.md` for the last action, handoff notes, stale leads, and recheck dates.
3. `.seo/audit.md` for evidence-backed findings and unresolved risks.
4. `.seo/strategy.md` for durable decisions, tooling, market, language, and production paths.
5. Latest relevant `.seo/reports/*` for dated GSC, analytics, content, pSEO, backlink, local SEO, validation, or admin evidence.
6. `.seo/backlinks/work-log.md` for pending outreach, submissions, and live-link states.
7. `.seo/context.md` for business context, ICP, competitors, conversion paths, and constraints.

If `.seo/` is missing, run `bootstrap` first. If a required file is missing in an existing workspace, create only that missing file and preserve existing notes.

## Target Boundary

Before continuing a current-focus or blocked ticket, ask whether it is still the target site's growth work. A ticket should be parked or moved out of the active loop when it is mainly:

- infrastructure monitoring,
- another site's publishing path,
- waiting on another operator or a scheduled run,
- blocked on product/business ownership rather than SEO implementation, or
- outside the surface the user asked to improve.

Label reports with the target surface at the top. When parking a side monitor, record the evidence, owner/surface, and next unblock signal, then continue with the smallest target-owned SEO checkpoint.

## Work Selection Order

Choose work in this order:

1. `Current focus` in `.seo/backlog.md` when it points to a real ticket and still belongs to the requested target surface.
2. First real row in `In progress`.
3. Top Ready ticket by priority and table order.
4. Blocked ticket that has become unblockable because access, data, ownership, deployment, or product state changed.
5. New evidence-backed ticket from stale notes, expired recheck dates, missing reports, or checkpoint findings.

Avoid duplicate tickets. If a log entry, report, audit row, or backlog note already points to a ticket, continue that ticket instead of creating another one.

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
| Performance | recent Lighthouse/CWV, public pages loading app/auth code, image/font regressions | `performance` |
| Authority | backlink work-log states, staged prospects, live-link verification, entity/profile gaps | `backlinks` or `entity` |
| Local | GBP, reviews, citations, service-area pages, local competitor changes | `local-seo` |
| Reporting | missing monthly report, stale metrics, no single next action | `reporting` |

If all checks look healthy, log the evidence and create a small reporting or future opportunity-analysis ticket with a recheck date instead of stopping silently.

## Empty Backlog Final Checkpoint

Use this when the user asks to continue until no backlog items remain, or when all visible work is external-gated.

1. Read backlog, log, audit, strategy, latest reports, and live public sanity routes.
2. Separate unblocked repo-owned SEO actions from external gates such as GSC recrawl lag, missing profile ownership, missing contact destination, legal/business facts, or infrastructure monitoring.
3. If no unblocked repo-owned action remains, write a dated checkpoint report and log entry instead of creating a fake Ready ticket.
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
