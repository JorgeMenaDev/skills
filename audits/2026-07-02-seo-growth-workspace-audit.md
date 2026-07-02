# Audit: `skills/growth/seo-growth-workspace`

- **Date:** 2026-07-02
- **Skill version audited:** current `main` (39 files, ~284 KB: SKILL.md + 19 references + 9 templates + 11 scripts + 7 fixtures + 2 release artifacts)
- **Method:** four parallel audit lenses — (1) skill-authoring/structure vs Anthropic Agent Skills conventions and repo house style, (2) comparison against [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (cloned locally), (3) SEO domain accuracy/currency review with targeted web verification, (4) code review + live execution of all bundled scripts (run in an isolated copy, never in the skill dir).
- **Note:** Exa MCP was not connected in this session; web verification used Firecrawl/WebSearch instead.

---

## 1. Executive summary

This is an unusually disciplined skill — better than most practitioner playbooks and categorically stronger than anything in the marketingskills repo on state management, evidence standards, pSEO gating, and anti-fabrication guardrails. It is **not** release-ready as packaged, for three reasons:

1. **Privacy/packaging leak (worst finding):** two release-run artifacts ship inside the skill directory containing your personal absolute paths (`/Users/jorge/...`), private client/project names (SuperaSEO, Arketix, Acredix, Andy, Laborix), and a worker UUID. The default install path (`npx skills add`) copies them verbatim; the custom exporter that strips them is not on that path. Ironically, `evaluate-release.mjs` scans for exactly these contamination markers but exempts these two files.
2. **Measurement-era staleness:** the skill has no AI-crawler robots policy, no AI Overviews/zero-click interpretation rules, conflates Lighthouse lab scores with Core Web Vitals field data (never names LCP/INP/CLS; INP replaced FID in March 2024), and still recommends `HowTo` schema (rich results removed 2023).
3. **Self-referential bloat:** ~30–40% of the package (release-dogfood mode, 2 references, 3 scripts totaling ~970 lines, fixtures) exists to develop/publish the skill itself, not to do SEO — and it all ships to end users.

### Scorecard

| Dimension | Score | One-liner |
| --- | :-: | --- |
| Frontmatter / discoverability | 8/10 | Strong trigger-rich description; missing `version`, `license`, `writes_to` fields siblings carry |
| Token economy | 6/10 | SKILL.md is ~1,460 words (~3x router ideal); ~430 words duplicate references |
| Progressive disclosure | 7/10 | Mode router genuinely works; all 19 referenced files exist; undermined by domain sections in SKILL.md and 4 orphaned templates |
| Instruction quality | 8/10 | Imperative, evidence-first, honest guardrails; 15-step Core Workflow over-specifies across modes |
| Packaging hygiene | 4/10 | Personal artifacts + release machinery ship in the consumer package |
| SEO domain accuracy | 7/10 | FAQ deprecation note verified accurate; HowTo, CWV, and CTR-threshold issues found |
| 2026 currency | 5/10 | Anti-hack AI stance exists, but no AI-crawler, zero-click, or answer-engine workflow |
| Scripts quality | 7/10 | Validators pass; secret handling deliberately good; 2 medium bugs + 0644 secrets file mode |

### Strengths to preserve (do not regress)

Independently confirmed across lenses — marketingskills has no equivalent for most of these:

- **Durable stateful workspace** (`.seo/` backlog/log/audit/strategy/reports) with a work-selection order and handoff discipline (`references/operating-loop.md`).
- **Evidence standards**: per-area done criteria, "weak evidence such as 'looks good' is not enough" (`references/ticket-architecture.md`), live-verification gates.
- **Anti-fabrication guardrails** repeated at every surface where they matter (SKILL.md:149, `backlinks-entity.md:45-48`, `local-seo-gbp.md:60-64`).
- **pSEO publish gating** ("plan early, publish late", prove one normal article first, small inspectable batches) — stronger than marketingskills' `programmatic-seo` checklist.
- **GSC operational depth** incl. the no-token-printing OAuth flow and bounded indexing-request rules.
- **Dated volatile-guidance pattern**: the FAQ rich-results note (`schema-rich-results.md:22`, "no longer appearing as of 2026-05-07, API support deprecated August 2026") was verified accurate against Google's changelog. Extend this pattern; don't remove it.
- **Local SEO depth** (`local-seo-gbp.md`) — marketingskills has no local-SEO skill at all.
- Per-mode exit criteria in the mode table, and "Use for `<mode>`" openers on every reference.

---

## 2. Packaging & portability (highest severity)

### 2.1 HIGH — Personal release artifacts ship in the skill directory

`SEO_GROWTH_WORKSPACE_RELEASE_RUN.md` and `SEO_GROWTH_WORKSPACE_AUDIT.md` contain:

- `"Ask Jorge for confirmation"` (RELEASE_RUN:48), absolute paths `/Users/jorge/dev/code/superaseo` (:155, :199-207), subagent UUID `019ea3c2-…` (:168)
- Private project/client names SuperaSEO, Arketix, Acredix, Andy, Laborix (RELEASE_RUN:13, :132-137; AUDIT:211-216)

`scripts/evaluate-release.mjs:331-340` scans portable files for exactly these markers but **exempts these two root files**, and `export-clean-skill.mjs:50-53` strips them only on the custom-exporter path — the README's documented install (`npx skills@latest add ...`) copies the directory as-is. No sibling skill ships such artifacts.

**Fix:** move both files out of the skill dir (e.g. repo-level `docs/release-runs/` or `audits/`), and remove the exemption logic from the exporter/evaluator.

### 2.2 MEDIUM — Skill-maintenance machinery ships to consumers

`release-dogfood` mode (SKILL.md:60), `references/release-checklist.md` (422 w), `references/skill-release-validation.md` (345 w), `templates/skill-dogfood-report.md`, `fixtures/release-scenarios.json`, and `validate-skill.mjs` + `evaluate-release.mjs` + `export-clean-skill.mjs` (~970 of 2,216 script lines) are authoring tools, not SEO capability. The exporter's portable-file set includes all of it.

**Fix:** move release machinery under a `dev/` subtree excluded from install; drop `release-dogfood` from the user-facing mode table (or mark maintainer-only). See also §6 keep/drop table — `evaluate-release.mjs` should not ship at all.

### 2.3 MEDIUM — Bun lock-in contradicts the skill's own ground rule

SKILL.md:16 says "use the target repo's package manager", yet every documented invocation is `bun scripts/…` (`search-console.md:90-106`, `adapters.md:26-33`, `release-checklist.md`), `validate-skill.mjs` hard-spawns `bun` (and hides the ENOENT when bun is absent — the error detail line is empty), and `evaluate-release.mjs:345-350` actively *penalizes* docs showing `node`/npm commands. All 11 scripts run fine under plain Node ≥18 (verified).

**Fix:** state once in SKILL.md "scripts run under Node ≥18 or Bun"; use `node` (or generic) in user-facing examples; have `validate-skill.mjs` spawn `process.execPath` instead of `"bun"` and surface `result.error?.message`.

### 2.4 LOW — Ecosystem-specific leaks in the portable core

- `.agents/product-marketing.md` named as a context source in SKILL.md:107, `operating-loop.md:27`, `adapters.md:13` — most target repos won't have it. Rephrase as "any product/positioning doc (e.g. …)".
- `adapters.md:26-33` shows source-repo-only paths (`bun skills/growth/seo-growth-workspace/scripts/...`) that don't exist from an installed copy.
- `evaluate-release.mjs:331-341` hardcodes the author's personal contamination markers ("jorge", "hermes", "laborix", …) — brittle and itself a fingerprint leak.

---

## 3. Structure & token economy

### 3.1 SKILL.md violates its own router contract (~430 words of duplicated domain content)

SKILL.md:10 declares "Use this skill as a mode router. Load only the reference needed." Then:

- SKILL.md:124-131 (Content And pSEO Gates) duplicates `pseo-gates.md:7` and `content-ops.md:5-14`
- SKILL.md:133-143 (Search Console) duplicates `search-console.md:39-46,59-66`
- SKILL.md:145-151 (Backlinks) duplicates `backlinks-entity.md:43-47` near-verbatim

**Fix:** delete the three sections — the mode table + Progressive References already route there. Cuts SKILL.md ~30% (from ~1,460 toward the <1,000-word range).

### 3.2 Governance rules are triplicated (taxonomy quadruplicated)

The 5-step work-selection order appears verbatim in `operating-loop.md:45-52` and `ticket-architecture.md:31-39`, condensed in `templates/taxonomy.md`, and inlined (already divergent) in `bootstrap-seo-workspace.mjs:86-88`. The done-criteria table exists in both `ticket-architecture.md:54-68` and `templates/taxonomy.md`.

**Fix:** make `ticket-architecture.md` the single owner; `operating-loop.md` links to it; `bootstrap-seo-workspace.mjs` writes `.seo/taxonomy.md` from `templates/taxonomy.md` instead of an inline copy.

### 3.3 Four templates are never routed from any instruction

`templates/backlink-gap.md`, `templates/gsc-opportunity.md`, `templates/local-seo-gbp.md`, `templates/taxonomy.md` are referenced only by validation scripts. Agents in those modes will hand-roll report shapes. **Fix:** one "save results using `templates/<x>.md`" line each in `search-console.md`, `local-seo-gbp.md`, `backlinks-entity.md` (mirroring what `admin-preflight.md:3`, `content-ops.md:45`, `monthly-reporting.md:23`, `pseo-gates.md:23` already do correctly).

### 3.4 Other structural findings

- **Core Workflow over-specifies** (SKILL.md:102-118): steps 8-15 describe bootstrap/operate only, contradicting "pick the narrowest mode". Keep mode-independent steps 1-7; let mode references own execution.
- **Marketing-lens list duplicated and divergent**: SKILL.md:122 lists 11 skills; `phase-architecture.md:58-78` lists 15. Keep the table, reduce SKILL.md to a pointer.
- **Orphaned fixture**: `fixtures/gsc-opportunities.expected.md` is consumed by nothing, and its prettier-padded format has drifted from actual script output (verified by running the script) — it can't work as a golden file as-is. Wire it into `validate-skill.mjs` with normalization, or delete it.
- **Frontmatter**: add `version`, `license`, and a `writes_to: [.seo/]`-style mutation declaration (house precedent: `operator-handoff`, `shiploop`, `work-tracking`). Version metadata also lets exported copies detect staleness (marketingskills pattern: `AGENTS.md:61-68` + `VERSIONS.md`).
- **Description rewrite** (SKILL.md:3): good keyword density, but no quoted trigger phrasings ("my traffic dropped", "why am I not ranking", "monthly SEO report") and no scope-boundary routing ("for X, see Y") — the two strongest description conventions in marketingskills (`AGENTS.md:119-128`).

Token-economy verdict: no individual reference is bloated (median ~420 words; worst co-load path ≈ 4.5k tokens — acceptable). The problem is duplication, not size.

---

## 4. SEO domain accuracy (verified issues)

1. **`HowTo` schema still recommended** — `schema-rich-results.md:39` lists `HowTo` as expected schema for resource/tool pages. HowTo rich results were removed in September 2023 and the documentation was later deleted by Google. Drop it or add a dated deprecation note mirroring the FAQ note on line 22. Consider one consolidated dated table: HowTo (2023), sitelinks search box (Oct 2024), the seven types Google removed in June 2025, FAQ (May 2026).
2. **Lighthouse conflated with Core Web Vitals** — `technical-seo.md:13` and `operating-loop.md:69` treat "CWV/PageSpeed/Lighthouse" as one evidence source. CWV assessment is CrUX **field data** at p75; Lighthouse is lab data and cannot measure INP at all. The skill never names LCP / INP / CLS (INP replaced FID March 2024). Fix: name the three metrics with thresholds (LCP < 2.5s, INP < 200ms, CLS < 0.1), make CrUX/PSI-field-data the source of truth, demote Lighthouse to lab proxy.
3. **Flat CTR threshold is analytically wrong** — `gsc-opportunities.mjs:63` flags `position <= 10 && ctr < 0.02`. Expected CTR ranges from ~25%+ at position 1 to <2% at positions 8–10, so the filter flags healthy position-8–10 rows and misses underperforming position-2–4 rows. Neither script nor `search-console.md` excludes branded queries, which dominate high-impression low-CTR lists. Fix: position-banded CTR baselines + a branded-query exclusion step.
4. **Silent 25k-row truncation** — `gsc-fetch.mjs:83-89` sets `rowLimit: 25000` (the per-request max) with no `startRow` pagination; mid-size sites get silently incomplete exports. Fix: paginate, or at minimum warn when exactly 25,000 rows return. (Endpoint and `webmasters.readonly` scope verified correct.)
5. **Internal gate contradiction** — `pseo-gates.md:17` accepts "submitted for indexing" as gate-satisfying, while `search-console.md` correctly calls manual submission "an exception, not a discovery strategy". Require indexed or independently crawlable.

Verified-accurate (keep): the FAQ deprecation note dates, the absence of sitelinks-search-box or June-2025-deprecated types, `SoftwareApplication` still being supported.

---

## 5. 2026 currency gaps (the AI-search era)

The skill's anti-hack AI stance (`phase-architecture.md:80-84`) is sane framing but offers no workflow. Prioritized gaps:

1. **No AI-crawler robots policy anywhere.** A 2026 technical audit must inventory GPTBot, OAI-SearchBot, ClaudeBot/Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot — including **CDN-level defaults** (Cloudflare's AI-bot blocking is a common accidental suppressor of assistant visibility) — and record allow/block as a deliberate business decision in `.seo/strategy.md`.
2. **Zero-click / AI Overviews blind spot in measurement.** `search-console.md` and `monthly-reporting.md` never warn that impressions can rise while clicks fall due to AI Overviews/AI Mode, that GSC folds AI-surface impressions into totals, or that CTR decline may be SERP-feature-driven rather than a title problem — the CTR Fixes playbook will systematically misdiagnose this. Also missing: branded vs non-branded split, core-algorithm-update annotations, YoY comparison for seasonality.
3. **No answer-engine visibility loop.** Nothing for legitimate LLM visibility: spot-checking brand citations for money queries in ChatGPT/Perplexity/Gemini, ensuring content renders without JavaScript (most AI crawlers don't execute JS), Bing Webmaster Tools + IndexNow (Bing's index feeds several assistants). The marketingskills `ai-seo` skill provides a full adaptable procedure (see §7).
4. **E-E-A-T absent from content ops** — no author pages, `Person` schema, first-hand-experience proof, or editorial standards; increasingly also what LLMs cite.
5. **Reddit/UGC and video absent** — no playbook for monitoring which forum threads rank for money queries or whether video/`VideoObject` belongs in the mix.
6. **Schema framed only as rich-result eligibility** — never mentions structured data's entity-grounding role for AI answers, the strongest remaining argument for schema investment.

---

## 6. Scripts & tooling

### Validation runs (in an isolated copy)

| Command | Result |
| --- | --- |
| `node scripts/validate-skill.mjs` | PASS (but only because `bun` was on PATH — it spawns bun internally even under node) |
| `node scripts/evaluate-release.mjs` | PASS, 100/100 — but most checks are phrase-presence regexes over the skill's own prose; it measures self-conformance to wording, not behavior |
| `gsc-opportunities.mjs` vs fixture | Semantically correct output; raw diff vs `.expected.md` fails (format drift + timestamp) |
| Edge probes | bun-less PATH → empty error detail; malformed `package.json` in profile root → unhandled crash; `\|` in query → table corruption |

### Notable bugs (severity-ordered)

1. **MEDIUM — Unescaped `|` in GSC query strings breaks markdown tables** (`gsc-opportunities.mjs:44-49,68-86`, `monthly-report.mjs:61-67,257-271`). Verified: a query `"foo | bar"` shifts every column. Since anyone searching Google can inject arbitrary text into your GSC data, this is also a report-injection surface for agents that later read these reports. `gsc-to-backlog.mjs:40-42` already has `escapeCell()` — apply it in the other two.
2. **MEDIUM — Round-trip corruption**: `backlog-to-content-keywords.mjs:26-36` splits on `|` naively, breaking the `\|` escapes `gsc-to-backlog.mjs` writes (verified: keyword became `"foo \\"`).
3. **MEDIUM — Secrets file written world-readable**: `gsc-oauth.mjs:104` writes `GSC_CLIENT_SECRET`/`GSC_REFRESH_TOKEN` with default 0644. Fix: `{ mode: 0o600 }`. Also drop the undocumented `--client-secret` CLI flag (shell history / `ps` exposure); require the env var.
4. **MEDIUM — `evaluate-release.mjs` crashes on malformed `package.json`** in a profile root (`:134-137`, no try/catch), despite promising read-only inspection.
5. **LOW (selection):** `monthly-state.mjs:55` `doneThisPeriod` counts all Done rows ever (no date filter); `monthly-report.mjs:73-89` movers can never show disappeared queries (iterates current rows only); `:133-138` "highest-impression low-CTR query" uses unsorted `.find()`; CTR delta lacks the `+` sign other metrics get; filler lines can displace real findings; JSON parse errors don't say which of up to 4 input files was bad; Windows path-separator assumptions in release tooling; `argValue` footgun copy-pasted across 8 scripts.

Security overall: **deliberately designed and mostly good.** No shell exec anywhere; `spawnSync` uses fixed argv without `shell: true`; OAuth flow never prints token values on any path (verified); minimal `webmasters.readonly` scope; exporter's destructive `rmSync` is scoped and gated. The two fixable gaps are bug 3 above and the unescaped third-party GSC strings (bug 1).

### Keep / simplify / drop

| Script | Verdict | Why |
| --- | --- | --- |
| `bootstrap-seo-workspace.mjs` | Keep | Cheap, idempotent, deterministic scaffolding (but source taxonomy from the template, §3.2) |
| `gsc-oauth.mjs` | Keep (fix perms/flag) | Secret-safe OAuth is exactly what agents shouldn't improvise with curl |
| `gsc-fetch.mjs` | Keep (add pagination/warning) | One API call done safely; keeps tokens out of shell history |
| `gsc-opportunities.mjs` + `gsc-to-backlog.mjs` | Merge | ~80% duplicate logic; one script with `--format report\|backlog` halves the surface |
| `backlog-to-content-keywords.mjs` | Drop / demote to instructions | Output is mostly fabricated metadata (`relevance: 10`, formulaic `priorityScore`) — the judgment task the reading agent does better; also has the round-trip bug |
| `monthly-state.mjs` | Fold into `monthly-report.mjs` | Pure glue; direct flags remove a script and an intermediate format |
| `monthly-report.mjs` | Keep (fix bugs) | Strongest script: weighted-position math and per-query deltas are exactly where LLMs err |
| `validate-skill.mjs` | Keep for maintainers | Genuine smoke test; swap hardcoded `bun` for `process.execPath`; exclude from consumer package |
| `evaluate-release.mjs` | Drop from package | 457 lines of self-grading phrase-regexes + personal markers producing a vanity 100/100; belongs in authoring-repo CI |
| `export-clean-skill.mjs` | Keep only if multi-repo installs are real | Careful engineering, but distribution tooling, not SEO capability |

Bottom line: the four GSC/report scripts + bootstrap earn their keep; roughly 40% of script mass is glue or self-assessment.

---

## 7. What to borrow from marketingskills

The repos have opposite centers of gravity: marketingskills = broad stateless domain knowledge + tool wiring, no execution/verification loop; this skill = narrow stateful operator with evidence gates, almost no external-data wiring. Borrow the knowledge and wiring; keep the operating model.

Prioritized borrow list (source citations are paths in the cloned repo):

1. **AI-search visibility reference (opt-in)** — `skills/ai-seo/SKILL.md:110-168, 386-417` + `references/platform-ranking-factors.md`: robots.txt AI-bot access check with named crawlers, query-by-query visibility audit matrix (fits this skill's matrix-output rule), machine-readable files (`llms.txt`, `/pricing.md`), monthly DIY monitoring protocol, per-platform ranking factors, and the correctly separated "Google says no special markup" vs non-Google engine nuance. → new `references/ai-search-visibility.md`, keeping the local anti-hack framing; directly closes currency gaps §5.1/5.3.
2. **Keyword research method + scoring rubric** — `skills/content-strategy/SKILL.md:167-201, 283-315`: buyer-stage modifier taxonomy, six ideation sources (incl. Reddit/Quora `site:` mining, call transcripts, support tickets), weighted prioritization (Customer Impact 40 / Content-Market Fit 30 / Search Potential 20 / Resources 10). → makes `content-ops.md`'s existing `priorityScore`/`buyerStage` columns computable instead of vibes; closes the "keyword batch assumed to exist" gap.
3. **SEO data-tool adapter** — `tools/REGISTRY.md:132-144`, `tools/integrations/dataforseo.md`/`ahrefs.md`/`semrush.md`: today the skill's only external data path is GSC, and `backlinks-entity.md:7` shrugs ("when backlink tools are available… document the limitation"). → small `references/data-tools.md` mapping each audit matrix (backlink gap, demand gap, refresh) to preferred API + env-var names + fallback, honoring the no-secrets rule.
4. **International SEO / hreflang** — `skills/seo-audit/SKILL.md:158-229` + `references/international-seo.md`: reciprocity/self-reference, `en-GB` not `en-UK`, x-default, canonical/hreflang agreement, Next.js `alternates.languages` caveat. → the `phase-architecture.md:20` site-type classifier already routes "Multilingual / multi-region" to a workflow that doesn't exist; this fills it.
5. **Competitor profiling pipeline** — `skills/competitor-profiling/SKILL.md:44-174, 351-365`: Firecrawl map→scrape extraction, dated raw-snapshot layout (matches this skill's evidence discipline), quick-scan vs deep-profile depth tiers. → `references/competitor-profiling.md` writing to `.seo/reports/competitors/`.
6. **Directory tier catalog + readiness gate** — `skills/directory-submissions/SKILL.md:34-106`: 13-tier sequencing, 9-question readiness gate with hard/soft blocks, "destination pages before directories". Gate philosophy identical in spirit to the local pSEO gates. → fold into `backlinks-entity.md`; track in existing `.seo/backlinks/work-log.md`.
7. **Schema JS-injection detection warning** — `skills/seo-audit/SKILL.md:38-49`: curl/fetch cannot prove schema *absence* (client-side-injected JSON-LD); require rendered-DOM or Rich Results Test proof before filing a "missing schema" ticket. One callout in `schema-rich-results.md`.
8. **pSEO playbook chooser + data-defensibility hierarchy** — `skills/programmatic-seo/SKILL.md:43-49, 70-104`: 12 playbooks with "if you have X assets → playbook Y" chooser; proprietary > product-derived > UGC > licensed > public data. → add both tables to `pseo-gates.md` Plan Shape.
9. **CWV thresholds + E-E-A-T mini-checklists** — `skills/seo-audit/SKILL.md:109-129, 339-361`. Cheap adds to `technical-seo.md` (pairs with fix §4.2).
10. **Comparison-page format library** — `skills/competitors/SKILL.md:69-144`: 4 formats with intent, URL pattern, section order. → referenced from pseo-gates' Comparison row and content briefs.
11. **Description style** (trigger phrases + scope-boundary routing, `AGENTS.md:119-128`) and **version metadata** (`VERSIONS.md` pattern) — see §3.4.
12. **AI-writing naturalness gate** — `skills/seo-audit/references/ai-writing-detection.md`: 6–8 bullet self-check (em-dash density, stock transitions, filler) for engine-produced articles in `content-ops.md`.
13. **Depth-tier convention** ("quick scan vs deep profile", default cheap) for the costlier audits (backlink gap, local competitor matrix).
14. **UTM/event-naming conventions** — `skills/analytics/SKILL.md:70-98, 183-198` → one block in `conversion-cta.md`'s conversion event matrix.

**Explicitly not worth borrowing:** the `` !`command` `` dynamic-injection pattern (their own docs mark it Claude-Code-only and unsafe for portable skills); their "Related Skills" footers (the local Optional Expert Lenses + Marketing Skill Bridge table already define better lens-not-dependency semantics).

---

## 8. Policy & risk flags

1. **Scaled-content-abuse guard missing on the content engine.** `content-ops.md`/`adapters.md` operationalize automated calendar-driven publishing with quality gates only on the pSEO side. Google's March 2024 policy covers "many pages without adding value" regardless of method. Add a per-article human-review/value gate and cite the policy by name (the pSEO side already embodies it — cite it there too so operators can defend decisions).
2. **Review solicitation edges toward gating.** `local-seo-gbp.md:63` "suggest prompts that help happy customers…" — selectively soliciting happy customers violates Google review policies and the FTC's 2024 fake-reviews rule. Reword: "ask all customers; never filter by sentiment."
3. **Paid directory links**: no warning that paid placements require `rel="sponsored"`/`nofollow` under the link-spam policy; no anti-pattern list (link farms, mass paid directories).
4. Indexing-request discipline, anti-fabrication rules, and schema-must-match-visible-content are all correctly conservative — no penalty-risk guidance found there. Consider one explicit line: "disavow is rarely needed."

---

## 9. Prioritized roadmap

### P0 — before any further publishing (privacy, safety, correctness)

1. Move `SEO_GROWTH_WORKSPACE_RELEASE_RUN.md` + `SEO_GROWTH_WORKSPACE_AUDIT.md` out of the skill dir; remove their exemptions from exporter/evaluator (§2.1).
2. `gsc-oauth.mjs`: write env file with mode 0600; drop `--client-secret` flag (§6 bug 3).
3. Remove `HowTo` from `schema-rich-results.md:39`; add the dated deprecated-rich-results table (§4.1).
4. Fix CWV guidance: name LCP/INP/CLS + thresholds, field data (CrUX/PSI) as source of truth, Lighthouse as lab proxy (§4.2).
5. Fix review-solicitation wording in `local-seo-gbp.md:63` (§8.2).
6. Add the per-article human-review gate + named scaled-content policy to `content-ops.md` (§8.1).

### P1 — structural and measurement integrity

7. Delete SKILL.md:124-152 (three duplicated domain sections) (§3.1).
8. Deduplicate ticket governance into `ticket-architecture.md`; bootstrap writes taxonomy from the template (§3.2).
9. Route the four orphaned templates from their mode references (§3.3).
10. Move release machinery to `dev/`; drop `release-dogfood` from the user mode table; stop shipping `evaluate-release.mjs` (§2.2, §6).
11. Resolve Bun vs package-manager tension; fix `validate-skill.mjs` spawn + error surfacing (§2.3).
12. Frontmatter: `version`, `license`, `writes_to`; description rewrite with trigger phrases + scope boundaries (§3.4).
13. AI-crawler robots module in `technical-seo.md` incl. CDN-level bot blocking; record decision in `.seo/strategy.md` (§5.1).
14. Zero-click/AI-Overviews interpretation rules + branded/non-branded split + core-update annotations + YoY option in `search-console.md`/`monthly-reporting.md` (§5.2).
15. Position-banded CTR baselines + branded-query exclusion in `gsc-opportunities.mjs` and `search-console.md` (§4.3); paginate `gsc-fetch.mjs` (§4.4).
16. Fix `pseo-gates.md:17` gate contradiction (§4.5); fix markdown-cell escaping in the two report scripts (§6 bug 1).

### P2 — capability expansion (mostly borrows, §7)

17. New `references/ai-search-visibility.md` (borrow 1) + Bing/IndexNow + LLM citation spot-check (§5.3).
18. Keyword research methodology + scoring rubric in `content-ops.md` (borrow 2).
19. `references/data-tools.md` adapter (borrow 3).
20. International SEO/hreflang workflow (borrow 4).
21. E-E-A-T/author-entity section in `content-ops.md` (§5.4) + E-E-A-T checklist (borrow 9).
22. Directory readiness gate + tier table; digital-PR/linkable-asset + unlinked-mention reclamation; "disavow rarely needed / mark paid links sponsored" in `backlinks-entity.md` (§7.6, §8.3).
23. Competitor profiling reference (borrow 5); pSEO playbook chooser + data hierarchy (borrow 8); comparison-page formats (borrow 10).
24. Content-refresh decision tree (refresh vs consolidate-301 vs remove-410; no date-bumping without substantive change); GBP Q&A module + spam-listing redressal in `local-seo-gbp.md`.
25. Script consolidation per keep/drop table (§6); remaining LOW script bugs; wire or delete the `.expected.md` fixture.

---

## Appendix

### Word counts (references, descending)

| File | Words | ~Tokens |
| --- | ---: | ---: |
| SKILL.md | 1,461 | ~1,940 |
| phase-architecture.md | 1,040 | ~1,380 |
| operating-loop.md | 992 | ~1,320 |
| search-console.md | 824 | ~1,100 |
| ticket-architecture.md | 709 | ~940 |
| local-seo-gbp.md | 569 | ~760 |
| pseo-gates.md | 510 | ~680 |
| schema-rich-results.md | 450 | ~600 |
| adapters.md | 434 | ~580 |
| conversion-cta.md | 427 | ~570 |
| release-checklist.md | 422 | ~560 |
| content-ops.md | 411 | ~550 |
| monthly-reporting.md | 381 | ~510 |
| admin-preflight.md | 355 | ~470 |
| skill-release-validation.md | 345 | ~460 |
| internal-linking.md | 334 | ~440 |
| backlinks-entity.md | 284 | ~380 |
| business-context.md | 279 | ~370 |
| technical-seo.md | 262 | ~350 |
| content-refresh.md | 172 | ~230 |

Observation: `technical-seo.md` — the most load-bearing playbook — is the second-thinnest reference, while ~770 words of references + ~970 lines of scripts serve skill-release machinery. The worst co-loaded path (`operate`) is ~4.5k tokens: acceptable.

### Verification sources (domain claims)

- Google Search documentation updates changelog (developers.google.com/search/updates)
- Google structured-data search gallery (rich-result availability)
- Schema App on sitelinks search box deprecation (Oct 2024)
- The HOTH on FAQ rich-results removal (May 2026)

### Artifacts

- marketingskills clone: `/private/tmp/claude-501/-Users-jorge-dev-code-skills/ab3fbb4d-f550-4bbe-acd2-1277caf2d88f/scratchpad/marketingskills` (scratchpad; delete freely)
- Script test runs executed in an isolated copy at `.../scratchpad/skill-copy`, never in the skill directory
