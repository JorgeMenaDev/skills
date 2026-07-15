# Pages: Evidence And Launch

Use for every new or materially revised public SEO page, regardless of the owning ticket's Area. This file owns substantiation (claims, voice, assets, approval) and the launch gates. Shared evidence vocabulary: `references/operating.md`; comparison and disclosure rules: `references/commercial-integrity.md`. A page ticket moves to Done only when gates 1–4 have `PASS` evidence; gate 5 needs a logged decision, never a request.

## 1. Lock the revision (evidence contract)

One evidence record belongs to one page revision — page/revision ID, target URL/slug, owner, dates, publication decision. Complete it before drafting; a later revision gets a new record, never an edit of an older one. Depth is proportional to materiality: minor wording/metadata changes use a light record (revision, changed claims, checks, reviewer, rendered result); new pages, material factual or commercial claims, regulated/YMYL topics, comparisons, time-sensitive claims, and material voice or asset use require the full record. `Not applicable` with a reason is acceptable; omission is not.

**Engine-native revision evidence is authoritative when a content engine holds it** — record its location in the adapter (`references/workspace.md`) and create no duplicate ledger. Without a provenance-capable engine, copy the template below to `SITE_WORKSPACE/reports/content/<slug>/<YYYY-MM-DD>-<revision-id>-evidence.md` (engine revision ID, else a two-digit sequence per page and date). The fallback file is the evidence record, never a site-wide source library, and legacy pages are never parsed to invent claim mappings.

**Evidence brief before drafting**: audience and buyer stage; query/task and business purpose; a dated SERP observation (market, language, device, result formats, mixed intent — observed facts labeled separately from inference and estimates); existing-page and cannibalization check; recurring questions; intended information gain and genuinely unique contribution; first-hand proof plan (`test`, `screenshot`, `interview`, `dataset`, `practitioner evidence`, or `None`); CTA and conversion destination; internal-link destination. Missing credible information gain means `defer`, `update existing page`, or `choose another page type` — drafting and publishing fail. SERP observations never justify competitor-average word counts, entity quotas, or causal ranking instructions.

**Claims**: map each material factual claim (statistics, dates, prices, legal assertions, comparisons, named third-party assertions) to a fetched original source — discovery tools locate, they are not the authority; a reachable URL does not prove support. Record claim locator, source and stable URL, short support note, evidence state, checked date, limitations, recheck date where time-sensitive, verifier. Unsupported, contradicted, or stale material claims block publication until removed, qualified, or supported.

**Voice inputs**: for every material input record owner, authorization or public-use basis, capture date, intended use, sensitivity/redaction state, and extracted traits (tone, cadence, vocabulary, POV — never copied passages). Redact PII, credentials, and confidential material before model use.

**Assets**: record asset ID, source and stable URL/path, creator/rightsholder, generated/edited status, and alt-text purpose (`informative`/`functional`/`decorative`/`complex`) — rights are never inferred from the file. At publish time snapshot the approved rights values from `backlinks/asset-rights.md` (license + version, attribution duty, release/consent state, checked-at, caveats, master-row version/hash): the master answers "may we use it now", the immutable snapshot records what this revision was approved under, and a later master change requires a recheck for future use without rewriting old snapshots. Image distribution and rights-based outreach route through the image-rights contract in `references/backlinks-entity.md`.

**Approval**: a named human records approval, decision, date, and notes for the exact revision. Publication fails when applicable evidence is absent, a material claim lacks source support, information gain is missing, authorization is unresolved, or approval is absent.

<page-evidence-template>

```md
# Page Evidence — <page title>
## Revision identity
| Page / revision ID | Target URL or slug | Record owner | Created / updated | Materiality and depth | Publication decision |
## Pre-draft evidence brief
| Audience / buyer stage | Query or task | Business purpose | SERP observation (date, market, language, device) | Result formats / mixed intent | Existing page / cannibalization | Questions / requirements | Evidence gaps | Information gain | First-hand proof plan | CTA / conversion destination | Internal-link destination |
## Claim-to-source support
| Claim ID / locator | Material claim | Original source / stable URL | Support note | Evidence state | Checked date | Limitations | Recheck date | Verifier | supported / unsupported / contradicted / stale |
## Authorized voice inputs
| Input ID / source | Owner | Authorization basis | Capture date | Intended use | Redaction state | Extracted traits only | approved / blocked |
## Material assets and immutable rights snapshot
| Asset ID | Source | Rightsholder | Generated / edited | Alt-text purpose | License + version | Attribution duty | Release / consent | Checked at | Caveats | Master-row version/hash | Approver |
## Human approval and rendered-citation survival
| Revision ID | Approver | Decision / date | Notes | Preview / live URL | Checked at / by | Citation locators checked | PASS / FAIL |
```

</page-evidence-template>

## 2. Implement the search surface

Apply `references/technical-seo.md` and `references/schema-rich-results.md`: unique title and meta description; final self-referencing canonical and intended `index,follow`; Open Graph/Twitter metadata with a share image where supported; a public unauthenticated route in the sitemap and reachable from at least one crawlable internal link; visible content, headings, citations, CTA, analytics, language, and voice matching the approved revision; schema decided explicitly — valid JSON-LD only for supported types whose required facts are visible and true, else a recorded `not applicable` with reason.

## 3. Verify before publish

Run the repo's established checks and build; inspect the staged/preview page on desktop and at least one mobile viewport; confirm the public path does not redirect to authentication and the approved revision, citations, metadata, structured data, and CTA render correctly. Verify rendered-citation survival wherever a preview exists — every intended citation present, pointing at its destination, beside the claim it supports; with no staging, run the same check immediately on delivery, and a failure there requires immediate rollback or same-day fix-forward — the revision must not stay public in a failed state. Deploy only through the repo's established path when the run is authorized to mutate production; record commit and deployment IDs, else keep the ticket Blocked with the exact gate, owner, and next action.

## 4. Verify the live page

Verify production, never infer from code or preview: final `200` at the intended URL; rendered title, description, canonical, robots, OG/Twitter metadata correct; every JSON-LD block parses, uses an applicable type, and agrees with visible content; approved content and citations survived delivery; sitemap inclusion and one crawlable internal link exist; desktop and mobile layouts usable; the route stays public without auth or crawler-specific failure. Record pass/fail in the ticket's existing report/audit home — no second launch ledger.

## 5. Decide discovery submission

Apply `references/search-console.md#bounded-indexing-requests` only after every mandatory gate passes. Manual indexing requests are optional and bounded; record `requested`, `skipped`, or `blocked` in the dated report. Missing GSC access blocks only the optional request, never Done, when the page is live, indexable, sitemap-listed, and internally linked.
