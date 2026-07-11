# Internal Linking

Use for audits and fixes involving link equity, crawl paths, blog hubs, pSEO hubs, and conversion paths.

## Audit Matrix

| Source URL | Target URL | Anchor text | Click depth | Current state | Desired state | Intent | Priority | Fix |
| ---------- | ---------- | ----------- | ----------- | ------------- | ------------- | ------ | -------- | --- |

Check:

- Homepage links to primary money pages, blog hub, and key pSEO hubs.
- Money and hub pages sit <= 3 clicks from the homepage; record click depth in the matrix.
- Blog posts link to relevant product/service pages and related articles.
- pSEO pages link back to hubs and high-intent CTAs.
- Orphan pages are listed and assigned sources.
- Breadcrumbs render on nested pages and match `BreadcrumbList` markup when present.
- Anchor text is descriptive and natural, not repeated exact-match spam.
- Footer/nav links support core conversion and crawl paths.
- Use the GSC Links report as evidence for internal-link counts and top linked pages.

## Offline link-graph analyzer

Run the analyzer after an approved local process has produced a complete page/link export, before filling the audit matrix or planning link changes. It reads one file, performs no crawl or network request, and writes deterministic Markdown suitable for a dated report or `.seo/audit.md`. JSON is the only v1 input; third-party crawler CSV ingestion is deferred until a real consumer export requires a specific dialect.

Check the bundled command without depending on the current directory:

```bash
node "${SKILL_DIR}/scripts/link-graph-analyzer.mjs" --help
```

For a real approved export, run `node "${SKILL_DIR}/scripts/link-graph-analyzer.mjs" --input <pages-links.json> > <report.md>`. Supply `--stamp <value>` only when the caller needs an explicit evidence label; the script never creates a date or timestamp.

### Input contract

The top-level JSON object has exactly two record kinds plus coverage:

```json
{
  "coverage": { "complete": true, "note": "All rendered public routes." },
  "siteOrigins": ["https://example.com/"],
  "pages": [
    {
      "url": "https://example.com/",
      "status": 200,
      "finalUrl": "https://example.com/",
      "canonicalUrl": "https://example.com/",
      "indexable": true,
      "entryPoint": true,
      "moneyPage": false
    }
  ],
  "links": [
    {
      "source": "https://example.com/",
      "target": "https://example.com/service",
      "anchor": "Service",
      "placement": "nav",
      "rel": []
    }
  ]
}
```

All page fields shown are required except `finalUrl` and `canonicalUrl`, which may be omitted when unknown. All link fields are required; `rel` is an array of tokens. Records are supplied facts only. `moneyPage` and `entryPoint` must be declared booleans: the analyzer never infers commercial importance or entry points. Every `links[]` record remains a separate edge, so duplicate source/target pairs with different or repeated anchors and placements are preserved.

`siteOrigins[]` is optional (maximum 200 prefixes) and declares the normalized HTTP(S) origin or origin-plus-path prefixes that define internal scope. Prefixes match only on the same origin and at a path boundary. When omitted, the analyzer derives internal scope from the distinct origins in `pages[]`. Scope applies to BOTH edge endpoints and to resolution: an edge whose source, supplied target, or redirect/canonical-resolved target falls outside internal scope is `external` — it remains counted in the edge and anchor inventories, is never called broken, and never enters the internal graph, so out-of-scope records cannot alter click depth, inbound support, orphan findings, or heuristic authority. Only an internal target absent from `pages[]` is a broken-target finding.

The ten pinned schema decisions are:

1. page vs edge records with duplicate edges preserved (anchors/placements)
2. page-record fields taken from supplied records only (never fetched) with declared-not-inferred money pages and entry-point flags
3. edge fields (source, target, anchor, placement, rel)
4. stated URL-normalization policy applied identically to pages and edges
5. explicit redirect/canonical/indexability/nofollow graph policy and entry points
6. `heuristic internal authority` labeling with recorded damping/iteration bounds and exclusions (never "PageRank", never a ranking prediction)
7. input-size limits with actionable over-limit failure, byte-identical determinism, no fetch/child-process/deps/fs-traversal
8. injection-safe emission (Markdown escaping; spreadsheet-formula neutralization if CSV output exists)
9. outputs mapping to the existing `internal-linking.md` audit matrix (evidence for that matrix, not a second workflow)
10. Ahrefs keyless DR documented in `data-tools.md` only (privacy, linked attribution, third-party-estimate status, volatility, terms reverified at implementation date) — the analyzer makes no network call

Normalization accepts absolute HTTP(S) URLs without credentials, lowercases scheme/host, removes fragments and default ports, resolves URL dot segments, removes a non-root trailing slash, and sorts query pairs by key then value. Path and query value case remain unchanged. The same function processes page URLs, final/canonical URLs, and link endpoints; normalized duplicate page URLs fail.

The graph includes followed, non-self edges whose source and resolved target are supplied, indexable 2xx self-canonical pages. A self-link is one whose normalized source equals its normalized supplied target, including a fragment-only link normalized back to the same URL. Self-links remain annotated in the edge and anchor inventories but provide no inbound support, do not prevent orphan/near-orphan findings, and do not propagate heuristic authority. A redirect resolves only through that page record's declared `finalUrl`; a canonicalized target resolves only through its declared `canonicalUrl`. Internal missing destinations remain broken; external targets do not. Nofollow edges remain in the inventory but do not transfer reach or authority, and noindex pages remain edge observations but are excluded from the graph. Click depth is reported from declared entry points and separately from declared money pages.

The authority column is named **heuristic internal authority**. It uses damping `0.85` for exactly 20 iterations (minimum and maximum 20), preserves duplicate followed-edge weight, and records those bounds in every report. It is neither Google PageRank nor a ranking prediction.

Limits are 5,000,000 input bytes, 50,000 pages, and 500,000 links. The script checks file size before reading the full input. Identical input and arguments yield byte-identical output: ordering is stable and the script creates no timestamp or random value. Imported strings are treated as hostile: Markdown table delimiters, link/image metacharacters, and HTML-significant characters are escaped; LF, CRLF, and lone CR line endings are flattened; and leading spreadsheet formula prefixes (`=`, `+`, `-`, `@`) are neutralized. The analyzer reads only the named input file and has no dependencies or network behavior.

Set `coverage.complete` to `false` whenever the producer did not capture the entire intended page/link set, and explain the gap in `coverage.note`. The report then returns **insufficient input coverage** for orphan evaluation and never labels pages orphan or near-orphan. Other supplied-record observations remain available with that limitation.

### Output mapping

| Analyzer output | Audit matrix use |
| --- | --- |
| Page evidence: root click depth, money-page depth, distinct followed inlinks/outlinks | `Click depth` and `Current state` |
| Orphan, near-orphan, and weak declared money-page findings | Candidate matrix rows; reviewer decides `Priority`, `Desired state`, and `Fix` |
| Edge handling: broken, external, self-link, redirected, canonicalized, noindex, nofollow | `Source URL`, `Target URL`, and `Current state` |
| Anchor inventory with duplicate count and placement | `Anchor text`, intent review, and repeated exact-match review |
| Heuristic internal authority | Directional support evidence only; never an outcome or ranking claim |

## Done Criteria

- Link exists in rendered HTML or verified route output.
- Target returns 200 and canonical is correct.
- Sitemap includes the target if it is intended to be indexed.
- Mobile layout does not hide or break critical CTAs.

## Threshold Checkpoints

When the site has at least 3 published blog posts, verify each detail page has crawlable related-reading links:

- Link only to published/indexable posts.
- Exclude the current post from its own related list.
- Verify rendered heading text, links, target status, and canonical URLs.
- Add a source or test guard when the codebase has validation scripts.

After a first pSEO batch is published/indexable, verify homepage or hub crawl paths:

- Homepage links to each published/indexable pSEO money page, or links to a hub that links to all of them.
- No homepage or hub links point to planned/noindex pSEO pages.
- Rendered HTML contains crawlable `<a>` links.
- Each target returns 200, has the expected canonical, and is `index, follow`.

## Common Fixes

- Add blog hub to nav/footer when blog exists.
- Add related-reading sections after first post batch.
- Add fixed internal targets to project YAML for generated content.
- Add pSEO hub pages before publishing large page sets.
