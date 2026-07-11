# Page Evidence

Use for a new SEO page or a material revision when claims, research, voice inputs, or assets must be approved for publication. This is the canonical substantiation contract. Use the shared terms in [Evidence Conventions](evidence-conventions.md); comparison and disclosure rules remain in [Commercial Integrity](commercial-integrity.md).

## Revision-scoped page evidence

One record belongs to one page revision. It identifies the page/revision ID, target URL or slug, record owner, created/updated dates, and publication decision. Complete its evidence brief before drafting or importing a new page. A later revision gets a new record or immutable engine revision; never edit an older record to describe new evidence.

Evidence depth is proportional to materiality. A minor wording or metadata change may use a light record that identifies the revision, changed claims, checks, reviewer, and rendered result. New pages, material factual or commercial claims, regulated or YMYL topics, comparisons, time-sensitive claims, and material voice or asset use require the full applicable record. `Not applicable` is acceptable with a reason; omission is not.

Engine-native revision evidence is authoritative when a content engine holds it. Record its location in the adapter and do not create this fallback or any duplicate provenance ledger. Without a provenance-capable engine, copy `templates/page-evidence.md` to:

```text
SITE_WORKSPACE/reports/content/<slug>/<YYYY-MM-DD>-<revision-id>-evidence.md
```

Use the record's own stable revision identifier as `<revision-id>`. When no engine revision ID exists, assign a two-digit sequence (`01`, `02`, ...) within that page and date so every material revision has a unique immutable filename. The fallback file is the evidence record, not a pointer to a site-wide source library. Never create a global or site-wide source ledger. Apply this contract to new or materially revised pages only; do not parse legacy pages to invent claim mappings.

## Evidence brief before drafting

Record:

- Target audience and buyer stage; query/task and business purpose.
- A dated SERP observation with market, language, device, material result formats, and mixed intent. Label observed result-set facts separately from inference, third-party estimates, and causal claims.
- Existing owned page and cannibalization check; recurring questions or requirements; evidence gaps in existing results.
- Intended information gain and genuinely unique contribution; first-hand proof plan (`test`, `screenshot`, `interview`, `dataset`, `practitioner evidence`, or `None`).
- CTA and observable conversion destination; intended internal-link destination.

If credible information gain is missing, the decision is `defer`, `update existing page`, or `choose another page type`; drafting and publishing fail. SERP observations do not justify competitor-average word counts, entity quotas, arbitrary result-count thresholds, proprietary content scores, or causal ranking instructions.

## Claim and check support

Map each material factual claim to a fetched original source when one exists. Discovery tools may locate it but are not the final authority. Prioritize statistics, dates, prices, legal/regulatory assertions, comparisons, and named third-party assertions. Each mapping records the claim or stable locator, source/provider and stable URL, short paraphrased support or locator, evidence state, fetched/checked date, limitations, recheck date where time-sensitive, and verifier.

A reachable URL does not prove that it supports the claim. Do not retain long copied passages as internal evidence. Unsupported, contradicted, or stale material claims block publication until removed, qualified, or supported.

## Authorized inputs

For every material voice input, record its owner, authorization or public-use basis, capture/check date, intended use, sensitivity/redaction state, and extracted traits. Inputs must be owned, explicitly authorized, or appropriately public. Reduce them to traits such as tone, cadence, vocabulary, point of view, and examples to seek; do not copy passages. Exclude or redact customer PII, credentials, confidential material, and unnecessary personal data before model use.

For every material asset, record its asset ID, source and stable URL/path, creator/rightsholder, generated/edited status, and alt-text purpose (`informative`, `functional`, `decorative`, or `complex`). Do not infer rights from the file.

At publish time, snapshot the material rights values approved for that revision from `SITE_WORKSPACE/backlinks/asset-rights.md`: license and version, attribution duty and permitted destination, model/property/trademark release and consent state, checked-at date, and exceptions/caveats, plus the consulted master-row version/hash. The master answers whether the asset may be used now; the immutable page snapshot records what this revision was approved under. A later master change requires a recheck before future use and never rewrites an older snapshot.

## Publish and delivery gate

A named human records approval, decision, date, and notes for the exact revision. Publication fails if applicable evidence is absent, a material claim lacks actual source support, information gain is missing, voice or asset authorization is unresolved, or approval is absent.

Verify the rendered revision before public publication whenever the delivery pipeline offers a preview or staged render: every intended inline citation must remain present, point to the intended destination, stay associated with the supported claim, and work in the render rather than only in source/payload. When no preview or staged render exists, run the same check immediately upon delivery. Record the preview/live URL, checked-at date, checker, citation locators/results, and any mismatch. The target proves citation survival; it does not reproduce the engine's research ledger. A failed check blocks public publication from staging; after direct delivery it requires immediate rollback/unpublish or fix-forward of that revision. The revision is not publish-complete and must not remain public in a failed state.
