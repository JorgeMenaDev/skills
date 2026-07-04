# Deep Audit: `skills/growth/seo-growth-workspace` v2.1.0

- **Date:** 2026-07-04
- **Skill version audited:** v2.1.0 (commit `aedb5ef`), 36 shipped files: SKILL.md + 22 references + 8 templates + 5 scripts (+ quarantined `dev/seo-growth-workspace/` maintainer tooling)
- **Relation to prior audit:** builds on [`audits/2026-07-02-seo-growth-workspace-audit.md`](./2026-07-02-seo-growth-workspace-audit.md). v2.0.0 (`4166b67`) and v2.1.0 (`aedb5ef`) landed after it. This audit (1) verifies what actually shipped, (2) covers dimensions the prior audit never touched — portfolio operation, delegation/cadence, credential-home fit, agent-executability dry runs — and (3) re-mines [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (cloned durably at `~/dev/code/marketingskills`).
- **Method:** 7-agent workflow — 4× opus-4.8 @ xhigh (roadmap regression + structure; skill-craft vs `writing-great-skills`; portfolio-fit; scripts + domain currency with live execution and web verification), 2× gpt-5.5 @ xhigh via Codex (marketingskills mining round 2; adversarial cross-check), 1× fable-5 (chief-architect synthesis). Scripts executed only in isolated scratchpad copies; repo untouched during audit.

---

## 1. Executive summary

**v2.0/v2.1 executed essentially the entire 25-item prior roadmap.** Every P0/P1/P2 item is DONE or DONE-with-caveat; all named script bugs are fixed or moot-by-deletion, execution-verified. Routing integrity is clean (zero orphans, zero dangling pointers), governance is single-owned, the GSC pipeline is live-verified correct, and the AI-search-era coverage is both current and honest. The skill went from "not release-ready" (prior audit) to the house exemplar for frontmatter, exit criteria, and progressive disclosure.

**What remains falls into exactly three strata**, and they define the improvement phases:

1. **Small correctness/currency debts** introduced or exposed by the v2 refactor: a drifted bootstrap taxonomy fallback that silently drops `ai-visibility`, a missing `--brand` filter in `monthly-report.mjs` (verified to misdirect the report's Single Next Action at a branded query), and a mid-2026-stale AI-crawler inventory that omits the citation-critical user-triggered agents (ChatGPT-User, Perplexity-User, Claude-User).

2. **The operating-model seam — the strategic finding of this audit.** The skill has no first-class model of *{site → target-root → GSC property string → credential location}* and no delegation contract for unattended runs. This is precisely why Jorge's own consumers routed around it **three separate times**: acredix abandoned the skill's GSC scripts for a parallel `gsc-api.mjs` reading `credentials/acredix-gsc/*.json`; the acredix weekly monitor hand-wrote its own "Cron-safe workflow" (still routing to the retired Dante profile); and the Toby publish crons ignore `.seo/` entirely. All three of the agent-executability dry runs ("audit andesphere.com", "traffic dropped", "monthly report across my sites") stall at this same seam. The prize for fixing it is concrete: **collapsing three parallel SEO systems back onto one substrate** and making the skill's stated portfolio-wide mission actually executable.

3. **House-pattern craft**: no bash-preamble state computation, no named STOP gates in a `mutating: true` skill that fires external publishes and production deploys, and residual four-way routing duplication in the router.

**The strongest evidence in this audit is real use.** The skill is in production across five repos with committed `.seo/` workspaces (superaseo, andesphere, arketix, laborix, wainwrightsbaggers). The andesphere `.seo/log.md` proves the operate loop end-to-end: a JSON-LD bug driven to root cause in Jorge's own npm package (patched, deployed, published `next-metadata-toolkit@0.2.1`), es-CL/en-GB split-market work, pSEO pruning, and content-engine wiring with a cannibalization guard. The loop works. What's missing is the layer above it.

### Scorecard (prior audit → now)

| Dimension | 07-02 | 07-04 | Note |
| --- | :-: | :-: | --- |
| Frontmatter / discoverability | 8/10 | 10/10 | House exemplar: `version`+`license`+`mutating`+`writes_to`, trigger-rich description with scope boundary |
| Token economy | 6/10 | 8/10 | SKILL.md 1,461→1,065 words; residual routing duplication across 3 surfaces |
| Progressive disclosure | 7/10 | 9/10 | Textbook; every reference opens with a "Use for/when" pointer |
| Instruction quality | 8/10 | 8/10 | Exit criteria exemplary; over-constrains scaffold, under-specifies prerequisites |
| Packaging hygiene | 4/10 | 9/10 | `dev/` quarantine clean; only judgment call left is the SuperaSEO worked example |
| SEO domain accuracy | 7/10 | 9/10 | All prior issues fixed and web-verified; one new stale crawler inventory |
| 2026 currency | 5/10 | 8/10 | AI-search coverage now the strongest story; crawler list + Cloudflare framing need a refresh |
| Scripts quality | 7/10 | 9/10 | All prior bugs execution-verified fixed; one real new gap (`monthly-report --brand`) |
| **Agent-executability (new)** | — | 6/10 | Single-site runs strong; all multi-site/cold-start paths stall on the unmodeled site→creds→property seam |
| **Portfolio operation (new)** | — | 3/10 | Architecturally single-site; consumers built three parallel systems around the gap |

---

## 2. Prior-roadmap regression check (Task A, opus @ xhigh)

Full 25-item scorecard verified against the tree with file:line evidence; summary:

- **P0 (6 items): all ✅.** Personal artifacts out of the skill dir (now `dev/seo-growth-workspace/`); OAuth env file 0600 + `chmod` on `--force`, `--client-secret` flag removed; `HowTo` gone with a dated deprecated-rich-results table (`schema-rich-results.md:29-34`); CWV named LCP/INP/CLS with thresholds, CrUX field data as source of truth, Lighthouse demoted to lab proxy; review-solicitation reworded ("Ask ALL customers… never filter by sentiment"); per-article publish gate citing the scaled-content policy by name.
- **P1 (10 items): 9 ✅, 1 ◑.** SKILL.md's three duplicated domain sections deleted (router-only body); templates all routed; release machinery quarantined; Bun lock-in fully resolved (zero `bun` refs; validator spawns `process.execPath`); frontmatter complete; AI-crawler module + zero-click/branded-split/YoY measurement rules landed; banded CTR + `--brand` + pagination landed and live-verified; pipe-escaping verified with a hostile fixture. The ◑: governance is single-owned in `ticket-architecture.md`, **but** the bootstrap script's inline fallback still restates it and has drifted (see R2).
- **P2 (9 items): 8 ✅, 1 ◑.** All five new references landed (`ai-search-visibility`, `data-tools`, `international-seo`, `competitor-profiling`, plus expanded `content-refresh`); keyword rubric (40/30/20/10), E-E-A-T, directory gates/tiers, disavow/sponsored rules, pSEO chooser + data-defensibility hierarchy, comparison formats, GBP Q&A + redressal. The ◑: script consolidation done (11→5) with the golden fixture wired into the dev validator; `argValue()` remains copy-pasted across scripts (harmless, correct cost of dependency-free scripts).
- **All 4 named script bugs + all 5 LOW residuals: fixed or moot**, each execution-verified (see §5).

**No roadmap item regressed.** Routing integrity is best-in-class: all 22 references enumerated and existing, all 8 templates routed from instructions, all 5 scripts documented, zero orphans (exhaustive grep).

### New debt introduced by v2.0–2.1

| # | Finding | Severity | Evidence |
|---|---|---|---|
| R1 | **SuperaSEO worked example ships in the portable package** — `content-engine-webhooks.md:39-89` (~550 of 1,082 words, the largest reference) embeds `superaseo.app`, `@jorgemenadev/superaseo`, the full CLI surface; SKILL.md:78 names it in the router. Deliberate v2.1 reversal of the prior audit's de-branding direction. Defensible (public product; the generic contract at :7-37 is stronger with a real instance) but every third-party install carries one vendor's CLI as SEO "capability". | Judgment call | Decision 1 |
| R2 | **Bootstrap's inline taxonomy fallback drifted** — `bootstrap-seo-workspace.mjs:35` omits `ai-visibility` from the Areas list while the canonical set (templates/taxonomy.md, ticket-architecture.md, phase-architecture.md) includes it. Only bites degraded installs (template path verified correct), but it's a second, drifting source of truth — residue of the exact triplication the prior audit flagged. | MEDIUM | I1 |
| R3 | Two references now outweigh the router (phase-architecture 1,094 w; content-engine-webhooks 1,082 w vs SKILL.md 1,065 w). Neither is hot-path; webhooks' bulk is R1. | LOW | fixed by I6 |
| R4 | **CTR-band gap**: `bandFor` rounds position, so rows averaging in (10.5, 11.0) fall through both the CTR bands and the page-2 table (`gsc-opportunities.mjs:96,116`). | LOW | I5 |

---

## 3. Skill-craft compliance + agent-executability (Task B, opus @ xhigh)

### vs `writing-great-skills` (foundation)

- **PASS (exemplary):** progressive disclosure; exit criteria (every mode row, every phase, every reference — the skill's strongest craft dimension); script-vs-instruction tradeoff (5 scripts do exactly the deterministic work agents shouldn't improvise; deleting the metadata-fabricating keyword script was right); imperative voice; template routing; `mutating`/`writes_to` frontmatter.
- **PARTIAL:** description (strong triggers + scope boundary, but the middle identity sentence restates the body — foundation says cut it; ~110 words of permanent context); token economy (113 lines vs the <100 target; routing restated across the mode table, Progressive References, Core Workflow, and phase-architecture's Scenario Routing — four surfaces); degrees of freedom (over-constrains: full 12-node scaffold + 8 Core-Workflow steps fire regardless of mode; under-specifies: the prerequisites below).
- **MISS:** PATTERNS #1 bash-preamble state computation (bootstrap-vs-operate fork and creds existence are model-inferred; both house exemplars open with an echoed-token preamble); PATTERNS #3 STOP gates (zero named gates in a mutating skill that fires `superaseo articles publish` and production deploys); no machine-parseable end-of-run status line; no coined leading word for the evidence discipline (it's restated at 3+ sites instead).
- **OPEN — deliberate:** the dated-volatile-guidance pattern violates the foundation's "no time-sensitive info" letter but is the right call for this domain and is paying off (verified: the FAQ/HowTo dates are all still accurate). Declare it an intentional exception dev-side (Decision 5).

### Dry runs — where a real agent actually stalls

All three realistic requests fail at the **same seam**: the skill has no model of **{site → target-root → GSC property string → credential location}** — exactly the seam `operator-handoff` solved with HOST.md and `afk-pipeline` with REGISTRY.md.

- **(a) "audit the SEO of andesphere.com"** — user gives a *domain*; the skill is repo-centric. Nothing maps domain→repo. GSC access is assumed, never discovered (no "check existing creds before initiating OAuth" step). The GSC property-string form (`sc-domain:andesphere.com` vs `https://andesphere.com/`) is never shown despite causing silent 403s.
- **(b) "my traffic dropped on superaseo"** — the description advertises the trigger, but **neither the mode table nor Scenario Routing has a drop row**. The correct playbook (branded split, AI-Overviews impressions-up/clicks-down pattern, core-update annotation) already exists at `search-console.md:20-24` — it's just unrouted. The content-engine regression path (articles stopped deploying, sitemap broke) surfaces only if the agent happens to enter `operate`.
- **(c) "monthly SEO report across my sites"** — **architecturally unsupported.** Everything is single-target; no iteration rule, no per-site credential map, no aggregation template; even one site needs two unchained `gsc-fetch` runs (current + previous windows) before `monthly-report.mjs` will run. Largest executability gap for the skill's stated multi-company purpose.

---

## 4. Portfolio-fit & operating model (Task D, opus @ xhigh)

### Real-use evidence

In production across five repos, workspaces committed to git (tracked file counts: superaseo 46, arketix 12, laborix 12, andesphere 11, wainwrightsbaggers 9). The andesphere log is the proof the loop works (JSON-LD root-cause → npm patch → deploy → verify; 12 ES-mirror pSEO pages killed; WhatsApp-first ES CTA repositioning; EN+ES content-engine lanes with cannibalization guard). **Market/language spread is the skill's strongest portfolio dimension** — es-CL/en-GB split demonstrably handled.

### Gaps (with skill-vs-consumer routing per the fix-at-source table)

| Gap | Finding | Routing |
|---|---|---|
| **A — No cross-portfolio view** | "Which site deserves the next SEO hour?" is unanswerable: single-site by construction, no portfolio index, no ranked digest. arketix/laborix cold since 06-04 with nothing surfacing that. | Split: shape + reader script portable; the property list is consumer (matias registry) |
| **B — No delegation/cold-resume contract** | The skill assumes an interactive human. Consumers reinvented the contract twice: acredix's hand-written "Cron-safe workflow" (`weekly-gsc-monitor.md:16-24`, still routing to the retired **Dante** profile at :6-8) and the Toby publish crons (`~/.hermes/profiles/toby/cron-prompts/seo-publish-*.md`) which reference neither the skill nor `.seo/` (ripgrep-verified). | Split: the contract portable (`scheduled-operation.md`); schedules stay Hermes config |
| **C — Credential model fights the `credentials/` home** | Skill parks GSC OAuth in the target repo's `.env.local` (`search-console.md:103,119`) — opposite of Jorge's convention on both axes (location + file-shape). Consequence is visible: **acredix discarded the skill's scripts entirely** for a parallel `gsc-api.mjs` reading `credentials/acredix-gsc/*.json` — with full `webmasters` scope where the skill correctly uses `readonly`. ~6 properties make per-repo tokens strictly worse. | Skill: scripts accept `GSC_CREDENTIALS_DIR`; folder names stay consumer-side. **Highest business-impact fix — this is the change that ended real adoption** |
| **D — No bridge to the Life OS tracker/brief** | Reports stop at `.seo/reports/`; "the single most important action for next month" never becomes a `### Needs from Jorge` item; SEO is invisible to the 08:20/14:20 nudge layer. | Split: digest shape portable; cron + tracker wiring consumer |
| **E — B2B intent** | Only thin spot in an otherwise strong market-spread story; no observed failure (andesphere log handles it via judgment). | Defer — evidence bar not met |

### Cross-cutting collision — SEO code fixes bypass the AFK gate

The andesphere operate loop implements product code and pushes to `main` inline (commits `565d87f`, `3add92a`, `77d80d5`, `91388bb`) while the matias standing rule says "never implement product code inline; every dev task → AFK pipeline," and both andesphere and superaseo are AFK-registered. Two contradictory doctrines run on the same repos; SEO wins by silence. The doctrine is Jorge's call (Decision 2); the skill's contribution is one portable line.

*(Sub-note: workspace location is unguided for partner-owned repos — arketix/laborix commit `.seo/` into Jean/Seba-owned repos while acredix's SEO lives profile-central; the skill should name the "partner repo → external workspace root" pattern.)*

---

## 5. Scripts + domain currency (Task E, opus @ xhigh, live execution + web verification)

### Scripts

All 5 scripts reviewed line-by-line and executed against synthetic fixtures (including a hostile `' | '` query and branded terms) on Node 22:

- **All 10 prior named bugs/residuals: FIXED, execution-verified** (0600 + `wx` + `chmod` on `--force`; pagination; banded CTR + brand exclusion; escaping intact under injection; disappeared movers; sorted low-CTR pick; per-file JSON error attribution; date-filtered `doneThisPeriod`; signed CTR delta; filler no longer displaces findings).
- **N1 — the one real new gap:** `monthly-report.mjs` has **no `--brand`** — the v2 fix landed in `gsc-opportunities.mjs` only. Verified failure: a branded query (5,000 impr, 1% CTR, pos 2) became the report's problem #1 **and its Single Next Action** — the exact misdiagnosis `search-console.md:21` warns against. Prior §4.3 is therefore PARTIAL, not fixed.
- Nits: N2 false-positive cap warning edge in `gsc-fetch`; N3 round-then-subtract display disagreement; N4 absent-position coerces to band 1-3 (unreachable with real GSC data).
- **Security posture intact and deliberately good:** no `child_process`/`exec` anywhere, no secret printing on any path, `webmasters.readonly` scope only, 0600 verified. Bootstrap verified idempotent and template-sourced (byte-identical taxonomy).
- **Verdict: the 5-script surface is right-sized.** No further merges or drops. One real fix (N1), rest nits.

### Domain currency (mid-2026, web-verified with sources)

**Verified correct — the dated-note discipline is paying off:** FAQ rich-results dates (stopped 2026-05-07; API removed Aug 2026) accurate; HowTo/sitelinks/June-2025 table accurate; CWV thresholds current (no new metric in 2026); llms.txt "Unproven" framing exactly right (Mueller: no AI system consumes it; ~97% of files get zero AI requests); scaled-content policy still governing; index-backing map (ChatGPT→Bing, Claude→Brave, Gemini/AIO→Google) accurate.

**Stale/incomplete:**

- **D1 (MEDIUM):** the AI-crawler inventory omits the **user-triggered/live-fetch agents that are the citation-critical ones** — ChatGPT-User, Perplexity-User, Claude-User — plus Amazonbot, Meta-ExternalAgent, Bytespider, xAI/Grok. The reference's own cite-path logic depends on naming them. Split the table by purpose (training / search-index / user-triggered), dated.
- **D2 (LOW/MED):** Cloudflare framing stale — since 2025-07-01 it **default-blocks AI crawlers on new zones** (and from 2026-09-15, stricter ad-page defaults + Pay-Per-Use marketplace). Reframe from "common accidental suppressor" to "default-block on new Cloudflare properties — verify explicitly," dated.
- **D3 (LOW):** name the **site-reputation-abuse** sibling policy in `content-ops.md:86` (algorithmic enforcement since Nov 2024) — cheap defensibility for an operator running sponsored/partner content across many sites.
- Date the two correct-but-undated AI-visibility claims (index-backing, llms.txt) "as of mid-2026" per the skill's own pattern.

---

## 6. marketingskills mining, round 2 (Task C, gpt-5.5 @ xhigh)

### Fidelity of the 14 prior borrows

All 14 landed: **6 faithful, 8 lossy-but-adequate.** The compressions were mostly deliberate and correct (the skill's token discipline beat the source's sprawl). Notable drops worth knowing about: the ai-seo source's per-platform ranking factors and `/pricing.md`/OKF machinery (correctly parked), content-strategy's survey/call-transcript mining, the 13-tier directory catalog (compressed to 6), and the translations pSEO playbook.

### New borrows — what survived the evidence bar

The mining pass proposed 18 candidates; the architect pass killed everything not tied to observed friction in Jorge's five live workspaces. **Survivors:**

1. **Loop-state pattern** (`marketing-loops/references/loop-state.md`) — cadence, stop condition, dedupe/cooldown, run log → absorbed as design input into the new `scheduled-operation.md` (I11), not a standalone borrow.
2. **Product-marketing context bridge** (`product-marketing/SKILL.md:54-126`) — one optional-import line in `business-context.md` (`operating-loop.md:27` already half-does this).

**Killed as speculative** (revisit only when a real run hits the gap): site-architecture deliverable bundle, competitor data-file separation, CMS content-model checklist, content portfolio classifier, AI-visibility worksheet expansion, directory tracker CSV, free-tool scorecard, Seven Sweeps QA, `@graph` contract expansion, launch mode.

### Repo-architecture adoptions (skills-repo infra, not this skill)

Worth adopting from the marketingskills repo itself: **`VERSIONS.md` manifest** (skill · version · last-updated · migration notes) and **changed-skill CI validation** (diff-scoped PR checks dispatching to per-skill validators like `dev/seo-growth-workspace/validate-skill.mjs`) → I18. Also liftable later: generated README index from frontmatter, a skill-change PR checklist, and a description linter. **Anti-borrows** (explicitly rejected): Claude-only `!command` injection in portable skills, auto-`git pull` update behavior, Playwright-based browser examples, hardcoded tool pricing, FAQ/HowTo growth tactics (deprecated), OKF as a default gate, unverifiable numeric GEO claims.

---

## 7. Adversarial cross-check (Task F, gpt-5.5 @ xhigh)

Independent contradiction/completeness pass over all five reports, adjudicated by reading the actual files (fanned out into three sub-investigations). Key outcomes:

- **Spot-checks of the severest claims: CONFIRMED** — including the drifted bootstrap fallback, the missing `monthly-report --brand` (branded query as Single Next Action), the repo-local credential model at `search-console.md:103,119`, and the advertised-but-unrouted "traffic dropped" trigger. The architect independently re-verified each against the tree before designing on them.
- **Consumer version drift is the cross-check's highest-priority action** (dimension no other lens covered). Actual consumer state is badly fragmented: only `acredix-landing` is locked and current at 2.1.0. `andesphere`, `acredix-app`, and `andy-partner` carry v2.0.0 copies (mostly with no `skills-lock.json` entry). Worst: **`superaseo`, `arketix`, and `laborix` run pre-v2 copies that still reference deleted scripts** (`gsc-to-backlog`, `backlog-to-content-keywords`, `monthly-state`, release tooling) and lack the v2 trigger-rich description — so on the flagship SEO property the skill both misfires on discovery and points agents at scripts that no longer exist. `superaseo/packages/backend/scripts/export-seo-monthly-snapshots.ts:10` even codes against the retired `monthly-state.mjs` contract. The skills repo README has no per-skill published install target, making this drift structural. Elevates propagation to a named Phase 1 exit criterion and strengthens I18.
- **Attribution gap:** the skill adapts marketingskills-derived material (both repos MIT, so compatible) but ships no attribution/notice. Normalized line-matching found only one high-similarity block (the CWV thresholds table) — the rest is genuinely adapted, not copied. Cheap fix: an attribution line (carrying the Corey Haines MIT notice) in `dev/seo-growth-workspace/` release notes or the repo README; not a consumer-package blocker.
- **Partial veto on "keep the SuperaSEO example as-is":** the cross-check upholds keeping a worked example but rules that the *top-level router* naming SuperaSEO (`SKILL.md:78`) plus package/config/token-prefix detail violates the skill's own adapter doctrine (`adapters.md:5-15`: portable logic generic, project bridges in `.seo/adapters/`). The architect's framing-line disposition (I6) stands as the minimum; Decision 1 should weigh genericizing the router line too.
- **Vetoes protecting the do-not-regress list:** no filled site/property/credential registry in the portable skill (shape portable, map consumer — matches I9's split); no hard-coded Matias credential paths in portable scripts (a generic `GSC_CREDENTIALS_DIR` is the right interface — matches I7); no stripping of dated volatile guidance to satisfy generic craft checklists (tighten dating, never strip currency).
- **Property-string evidence firmed up:** the docs show only the URL-prefix `--site https://example.com/` form while Jorge's real consumer code uses `sc-domain:acredix.cl` — confirming I8's exact fix.
- **Prose-vs-script mismatch on absent GSC data:** the references handle no-access/fresh-property cases well (record gaps, mark `partial`, never fabricate — `search-console.md:88-95`, `monthly-reporting.md:44-52`), but `monthly-report.mjs:532-540` hard-requires `--gsc-current`/`--gsc-previous`/`--backlog` with no degraded mode — an agent following the prose hits a CLI wall. Fold into Phase 1 (I5 batch) as a small `--allow-missing-gsc` or documented manual path. `.seo/` concurrent-edit (human + agent) guidance is only indirect; acceptable, watch for real friction.
- No material contradictions between the five reports survived adjudication; where emphasis differed (e.g. how bad R1 is), the architect's disposition (keep + framing line) stands.

---

## 8. Target architecture (Task G, fable-5)

**Design stance.** The skill stays what it demonstrably is — a *single-site stateful SEO operator* (the andesphere log proves the loop) — and gains **one thin portable layer** that makes it **addressable** (registry), **delegable** (scheduled-operation contract), and **aggregable** (portfolio rollup). Everything Jorge-specific (the actual property list, credential folder names, cron schedules, tracker wiring, AFK doctrine) lands in the matias consumer per the fix-at-source table. The dev/consumer boundary, single-owner governance, evidence discipline, dated-volatile-guidance pattern, pSEO gating, and the GSC pipeline are on the do-not-regress list and are preserved untouched in shape.

### End-state file tree (portable skill)

```
skills/growth/seo-growth-workspace/
  SKILL.md                          CHANGED   Router: + bash state preamble, + diagnose mode row, Core Workflow folded
                                              into references, description tightened; <100 lines (v3.0.0)
  references/
    phase-architecture.md           CHANGED   + "Traffic/rankings dropped" scenario row → search-console.md
    operating-loop.md               CHANGED   + STATUS line in handoff template; + "route code through the repo's
                                              PR/AFK gate where one exists" line
    business-context.md             CHANGED   + one-line optional import of .agents/product-marketing.md
    admin-preflight.md              UNCHANGED
    adapters.md                     UNCHANGED
    technical-seo.md                CHANGED   AI-crawler table split by purpose (training/search/user-triggered) +
                                              2026 agents; Cloudflare default-block reframe, dated
    international-seo.md            UNCHANGED
    search-console.md               CHANGED   Credential discovery-before-ask preflight; creds → credential home not
                                              repo .env.local; sc-domain: vs URL-prefix property forms; "traffic
                                              dropped" analysis anchor
    content-ops.md                  CHANGED   + one-line site-reputation-abuse policy note
    content-engine-webhooks.md      CHANGED   + one-line "worked example; your engine differs — record yours in
                                              .seo/adapters/" framing above the SuperaSEO section (Decision 1)
    pseo-gates.md                   UNCHANGED
    ticket-architecture.md          UNCHANGED
    internal-linking.md             UNCHANGED
    schema-rich-results.md          UNCHANGED
    content-refresh.md              UNCHANGED
    conversion-cta.md               UNCHANGED
    local-seo-gbp.md                UNCHANGED
    backlinks-entity.md             UNCHANGED
    competitor-profiling.md         UNCHANGED
    data-tools.md                   UNCHANGED
    ai-search-visibility.md         CHANGED   Crawler inventory sync with technical-seo; date the index-backing and
                                              llms.txt claims ("as of mid-2026")
    monthly-reporting.md            CHANGED   + portfolio rule: one target per run; iterate the registry; per-site
                                              reports + portfolio index
    portfolio-registry.md           NEW       Registry shape: site → target-root → GSC property string → credential
                                              location → market/language → publish gates; read-first rule for
                                              multi-site asks
    scheduled-operation.md          NEW       Cold-resume/delegation contract: state read order → bounded remit →
                                              silent mode → mutation ceiling → dedupe/cooldown state → fixed JSON
                                              summary payload
  scripts/
    bootstrap-seo-workspace.mjs     CHANGED   Drop drifted inline taxonomy fallback; stub-or-fail when template absent
    gsc-oauth.mjs                   CHANGED   Document/support writing to a credential home outside the repo
    gsc-fetch.mjs                   CHANGED   + GSC_CREDENTIALS_DIR / --credentials-dir (file-shaped client_secret.json
                                              + token.json) alongside existing env vars
    gsc-opportunities.mjs           CHANGED   bandFor gap (10.5,11) fix; skip position<=0 rows
    monthly-report.mjs              CHANGED   + --brand passthrough (shared parseBrandTerms/isBranded); band fix
    portfolio-status.mjs            NEW       Reads N workspaces from the registry → ranked table: site · last-touched ·
                                              open P0/P1 · staleness · top opportunity
  templates/
    (all 8 existing)                UNCHANGED
    portfolio-index.md              NEW       Cross-site rollup shape consumed by portfolio-status output

  DELETE: nothing — the shipped tree carries no dead weight (dev/ quarantine confirmed clean)
```

### End-state consumer surfaces (matias profile + siblings)

```
~/.hermes/profiles/matias/
  .agents/seo/REGISTRY.md           NEW       The filled map: 6 properties × {repo/workspace root, property string,
                                              credentials/<svc>/ folder name, market, approval rule, AFK-or-inline}
  CLAUDE.md / AGENTS.md             CHANGED   SEO-code-vs-AFK doctrine line (Decision 2)
Hermes crons                        NEW       Monthly portfolio rollup → "Needs from Jorge" tracker items → 08:20 brief
skills/acredix/acredix-ops/
  references/weekly-gsc-monitor.md  CHANGED   Fix stale Dante refs (lines 6-8); re-base on scheduled-operation.md;
                                              retire parallel gsc-api.mjs once GSC_CREDENTIALS_DIR lands
~/dev/code/skills/ (repo infra)
  VERSIONS.md                       NEW(opt)  Per-skill version manifest
  .github/ changed-skill CI         NEW(opt)  Validate only changed skills on PR
```

---

## 9. Improvement list (why / how / impact / effort / routing)

### Stratum 1 — Correctness & currency

**I1. Kill the drifted bootstrap taxonomy fallback.**
WHY: the inline fallback omits `ai-visibility` (`bootstrap-seo-workspace.mjs:35`, verified) — a second, drifting source of truth that silently deletes v2.0's headline area in degraded installs.
HOW: delete the fallback; on missing template, write a 3-line stub pointing at `references/ticket-architecture.md` and warn, or fail with a named error.
Impact: agent reliability. Effort: **S**. Routing: portable skill.

**I2. Add `--brand` to `monthly-report.mjs`.**
WHY: execution-verified misdiagnosis — a branded query became the report's Single Next Action, contradicting the skill's own rule (`search-console.md:21`). Prior §4.3 is PARTIAL, not fixed.
HOW: port `parseBrandTerms`/`isBranded` from `gsc-opportunities.mjs`; exclude branded from `isLowCtr` and mover-problem selection; document in `monthly-reporting.md`.
Impact: SEO outcome — the one bug that corrupts a shipped deliverable. Effort: **S**. Routing: portable skill.

**I3. Refresh the AI-crawler inventory.**
WHY: `technical-seo.md:35` + `ai-search-visibility.md:11` omit the user-triggered agents (ChatGPT-User, Perplexity-User, Claude-User) that are the citation-critical ones, plus Amazonbot, Meta-ExternalAgent, Bytespider, xAI — web-verified stale for mid-2026.
HOW: replace the flat list with a purpose-split table (training / search-index / user-triggered), dated.
Impact: SEO outcome — AI visibility is the skill's flagship currency story. Effort: **S**. Routing: portable skill.

**I4. Cloudflare + policy currency; date the undated claims.**
WHY: Cloudflare default-blocks AI crawlers on new zones since 2025-07-01 — "accidental suppressor" framing stale; site-reputation-abuse is the missing sibling policy; two correct-but-undated claims in `ai-search-visibility.md`.
HOW: reframe dated; one site-reputation-abuse line in `content-ops.md`; "as of mid-2026" on the two claims.
Impact: SEO outcome/defensibility. Effort: **S**. Routing: portable skill.

**I5. Script nits batch.**
WHY: `bandFor` gap for positions in (10.5, 11); absent `position` coerces to band 1-3; `monthly-report.mjs:532-540` hard-requires GSC exports while the prose (`monthly-reporting.md:44-52`) says to record gaps and mark `partial` — an agent following the docs hits a CLI wall (cross-check finding).
HOW: band on unrounded position with explicit boundaries; skip rows with `position <= 0`; add a degraded path for absent GSC exports (flag or documented manual route). Accept N2/N3 as-is; `argValue` duplication stays (correct cost of dependency-free scripts).
Impact: marginal reliability. Effort: **S**. Routing: portable skill.

**I6. SuperaSEO worked-example framing** *(pending Decision 1)*.
WHY: the example is ~half of the skill's largest reference and ships to every install; the generic contract is genuinely stronger with a real instance — the fix is framing, not removal.
HOW: one line above it: "One worked example follows; your engine will differ — record its contract in `.seo/adapters/<engine>.md`."
Impact: portability/token cost. Effort: **S**. Routing: portable skill.

### Stratum 2 — The operating-model seam (the strategic work)

**I7. Credential portability: `GSC_CREDENTIALS_DIR`.**
WHY: the skill parks GSC OAuth in the target repo's `.env.local` — the opposite of the `credentials/` home on both axes, and the proximate cause of acredix **abandoning the skill's scripts** for a parallel `gsc-api.mjs`. ~6 properties make the per-repo model strictly worse.
HOW: `gsc-fetch.mjs`/`gsc-oauth.mjs` accept `--credentials-dir`/`GSC_CREDENTIALS_DIR` with file-shaped `client_secret.json`/`token.json`, falling back to existing env vars; `search-console.md` says "store credentials in your profile's credential home, not the target repo." Folder names stay consumer-side.
Impact: **highest business impact — this is the change that ended real adoption**; unblocks every multi-property scenario. Effort: **M**. Routing: portable skill.

**I8. GSC discovery-before-ask + property-string forms.**
WHY: all three dry runs stall at the same unstated prerequisites — no "check existing creds before initiating OAuth" step; `sc-domain:` vs URL-prefix never shown despite causing silent 403s.
HOW: preflight block in `search-console.md`: check `GSC_CREDENTIALS_DIR` → `GSC_*` env → prior `.seo/reports/gsc-*` → registry, only then OAuth; document both property forms.
Impact: kills the most frequent mid-run stall. Effort: **S**. Routing: portable skill.

**I9. Portfolio registry — shape in the skill, filled map in the consumer.**
WHY: the shared root cause of all three dry-run failures; "which site deserves the next SEO hour" is unanswerable across 5+ live workspaces. The exact seam operator-handoff solved with HOST.md and afk-pipeline with REGISTRY.md.
HOW: new `references/portfolio-registry.md` defining the row shape + "on any multi-site or by-name ask, read the registry first"; matias gets `.agents/seo/REGISTRY.md` with six filled rows (credential *folder names* only — values stay in `credentials/`).
Impact: portfolio addressability. Effort: **M** (skill) + **S** (consumer). Routing: **split**.

**I10. Diagnosis route: "traffic dropped" lands somewhere.**
WHY: the description advertises the trigger but neither the mode table nor Scenario Routing has a drop row; the correct playbook exists at `search-console.md:20-24`, unrouted.
HOW: add a `diagnose` row to Choose-A-Mode and a "Traffic/rankings dropped" scenario row, both landing on the search-console Analysis Rules + operating-loop checkpoints; give the landing section an anchor heading.
Impact: deterministic routing for an advertised trigger. Effort: **S**. Routing: portable skill.

**I11. `scheduled-operation.md` — the delegation/cold-resume contract.**
WHY: the skill assumes an interactive human; consumers invented their own contracts twice (acredix's hand-written cron workflow, still routing to the retired Dante profile; Toby publish crons bypassing `.seo/` entirely).
HOW: new reference: state read order → bounded remit → silent-mode rule → mutation ceiling (no publishes, no deploys, no indexing requests unattended) → dedupe/cooldown state → fixed JSON summary payload. Absorbs the marketingskills loop-state pattern as design input.
Impact: makes the skill cron-safe by contract, not by consumer improvisation. Effort: **M**. Routing: portable skill; cron *schedules* stay in Hermes config.

**I12. Portfolio rollup: reference + script + template.**
WHY: "monthly report across my sites" is architecturally unsupported; with 5 live workspaces there is no ranked next-hour view and SEO is invisible to the tracker/brief nudge layer.
HOW: `monthly-reporting.md` gains the iteration rule; new `scripts/portfolio-status.mjs` reads N workspaces → ranked table; new `templates/portfolio-index.md`. Consumer: a monthly Hermes cron runs the rollup and files one `### Needs from Jorge` item per site-owed action (contract already exists in `docs/triage-format.md`).
Impact: the marginal-hour question becomes answerable; SEO enters the morning brief. Effort: **M** (skill) + **S** (cron). Routing: **split**.

**I13. AFK-gate acknowledgment + doctrine** *(pending Decision 2)*.
WHY: `technical-seo-fix` ships product code straight to `main` on AFK-registered repos while the matias standing rule forbids inline product code — two contradictory doctrines, SEO winning by silence.
HOW: one portable line in `operating-loop.md`/`technical-seo.md`: "in a repo with a PR/code-review or AFK gate, route implementation through it." The doctrine itself is Jorge's call, encoded in matias CLAUDE.md/AGENTS.md + AFK registry.
Impact: governance consistency. Effort: **S**. Routing: **split**.

**I14. Consumer cleanups.**
WHY: `weekly-gsc-monitor.md:6-8` still routes to the retired Dante profile (stale since 2026-06-29); the parallel `gsc-api.mjs` uses full `webmasters` scope vs the skill's `readonly`.
HOW: fix Dante refs now; after I7 lands, re-base the acredix monitor on the skill's scripts + `scheduled-operation.md` and retire `gsc-api.mjs`.
Impact: reliability + least-privilege. Effort: **S**. Routing: matias/acredix consumer repos.

### Stratum 3 — House-pattern craft

**I15. Bash-preamble state computation (PATTERNS #1).**
WHY: the bootstrap-vs-operate fork and workspace/creds existence are model-inferred; both house exemplars open with an echoed-token preamble — the highest-impact craft gap.
HOW: SKILL.md opens with a preamble echoing `WORKSPACE: present|missing`, per-file existence, `FOCUS_TICKET:`, `GSC_CREDS: dir|env|missing`, `REGISTRY: present|missing`; "Branch ONLY on the echoed tokens."
Impact: removes the largest nondeterminism source. Effort: **M**. Routing: portable skill.

**I16. STOP gates at the two real mutation boundaries (PATTERNS #3).**
WHY: a `mutating: true` skill that fires external publishes and production deploys has zero named STOP gates; aligns with the standing "never publish externally without explicit go-ahead."
HOW: (i) STOP before any external publish of unreviewed content — naming the failure (scaled-content policy exposure + irreversible external send); (ii) STOP before production deploy/indexing request without recorded admin-preflight evidence.
Impact: reliability + boundary safety. Effort: **S**. Routing: portable skill.

**I17. Router prune + description tighten + status line + leading word.**
WHY: SKILL.md is 113 lines vs the <100 target with routing restated across four surfaces; the description's identity sentence restates the body; no machine-parseable end-of-run status; the evidence discipline is spelled at 3+ sites instead of one coined anchor.
HOW: fold Core Workflow's mode-specific steps into their owning references; cut the identity sentence; add `STATUS: DONE|PARTIAL|BLOCKED — <evidence>` to the log template; coin one leading word for "proven on live evidence."
Impact: token cost + chaining reliability. Effort: **M** (taste-heavy). Routing: portable skill.

### Skills-repo infrastructure

**I18. `VERSIONS.md` manifest + changed-skill CI validation.**
WHY: marketingskills' version manifest and diff-scoped PR validation directly address consumer-drift risk this repo manages by hand across `skills-lock.json` consumers; the cross-check independently flagged the missing published install target.
HOW: repo-root `VERSIONS.md` (skill · version · last-updated · migration notes); GitHub workflow validating only changed skills, dispatching to per-skill validators where they exist.
Impact: reliability across the whole repo. Effort: **M**. Routing: skills-repo infra.

### Killed as speculative (evidence bar not met)

Ten marketingskills round-2 borrows (site-architecture bundle, competitor data files, CMS checklist, portfolio classifier, AI worksheet, directory CSV, free-tool scorecard, Seven Sweeps, `@graph` expansion, launch mode); the B2B-intent block (no observed failure — andesphere log handles it); `argValue` dedup and cosmetic script nits; merging the description's three same-branch triggers (they aid recall; duplication cost negligible).

---

## 10. Multi-phase plan

| Phase | Version | Theme | Items | Execution lane | Exit criteria |
|---|---|---|---|---|---|
| **1 — this week** | **2.2.0** | Correctness, credential portability, currency, diagnosis routing | I1, I2, I3, I4, I5, I6*, I7, I8, I10 | **AFK-pipeline-able** — clear-spec mechanical; one Agent Brief against `~/dev/code/skills` (*I6 needs Decision 1 first — default is add-framing) | All 5 scripts pass fixture runs incl. a new branded-query monthly-report fixture; no drifted fallback (`grep ai-visibility`); `gsc-fetch` runs green against a `credentials/acredix-gsc/`-shaped dir; "traffic dropped" routes deterministically in a dry run; version bumped, committed, propagated to **all seven consumers** — including re-locking the lockless v2.0.0 copies (`andesphere`, `acredix-app`, `andy-partner`) and replacing the pre-v2 copies with dangling deleted-script references (`superaseo`, `arketix`, `laborix`); check `superaseo`'s `export-seo-monthly-snapshots.ts` against the retired `monthly-state.mjs` contract (cross-check §7) |
| **2** | **2.3.0** | Portfolio + delegation layer (the strategic seam) | I9, I11, I12, I13, I14 | **Matias inline** for the two new references (design judgment); AFK for `portfolio-status.mjs` + template once the reference is written; Decisions 2–4 gate the consumer half | `scheduled-operation.md` + `portfolio-registry.md` shipped; matias `.agents/seo/REGISTRY.md` filled with all 6 properties; acredix monitor re-based (Dante refs gone, `gsc-api.mjs` retired); one live monthly rollup produced a ranked table and filed tracker items that appeared in the 08:20 brief |
| **3** | **3.0.0** | Router rewrite to house patterns | I15, I16, I17 | **Matias inline** — taste-heavy, touches the routing contract (major bump justified: Core Workflow section removed, preamble added) | SKILL.md <100 lines; preamble tokens branch-tested by re-running the three dry runs green; STOP gates fire in a simulated unreviewed-publish attempt; description ≤ ~80 words with triggers + scope boundary intact; do-not-regress list re-verified item by item |
| **4 — opportunistic** | n/a (repo infra) | Skills-repo hardening | I18 | AFK-pipeline-able | `VERSIONS.md` exists and CI validates changed skills on a test PR |

**Sequencing logic:** Phase 1 is pure debt-payment with zero design risk and ships the single highest-business-impact change (I7) — it can go out this week as one AFK run. Phase 2 is where judgment lives (two new contracts) and is gated on Jorge's doctrine decisions; its consumer half proves the contracts on the acredix monitor before any Toby-cron consolidation. Phase 3 deliberately comes last: pruning the router *after* the new modes/references land avoids pruning twice, and the 3.0.0 bump signals the contract change to consumers.

### Do-not-regress list (carried forward + extended)

Everything on the prior audit's list, plus (new, verified this round): the live-verified GSC pipeline (pagination, banded CTR, brand exclusion, escaping, 0600 OAuth); the per-reference anti-fabrication guardrails that propagated into every v2 reference; the honest AI-search framing (llms.txt "Unproven", citations as the only honest metric, per-engine index-backing); single-owner governance with explicit "do not restate" deferrals; the `dev/` maintainer/consumer boundary; the dated-volatile-guidance pattern (declare intentional, Decision 5).

---

## 11. Open decisions for Jorge

1. **SuperaSEO worked example in the portable package** (I6). Keep as-is / add framing line / demote to repo-local adapter? **Recommendation: keep + framing line, and genericize the router line** (`SKILL.md:78` → "content-engine webhook publishing (worked example included)") — the cross-check ruled that a named vendor in the top-level router violates the skill's own adapter doctrine, while the in-reference example is fine with framing.
2. **SEO code fixes vs the AFK-first rule** (I13 — live contradiction on two AFK-registered repos). **Recommendation: exempt small verify-in-browser SEO fixes** (metadata, robots, schema, redirects — things the loop live-verifies in minutes); **require AFK** for anything a Verify Phase would meaningfully cover (new routes, receivers, rendering changes). Encode in matias CLAUDE.md/AGENTS.md; skill gets the one-line acknowledgment either way.
3. **Registry home and credential references** (I9). **Recommendation: generic shape in the skill; filled map at matias `.agents/seo/REGISTRY.md`; the registry records credential *folder names* only, never values** — consistent with the existence-vs-value rule.
4. **Toby publish-cron consolidation** onto `scheduled-operation.md`. **Recommendation: defer** — prove the contract on the acredix weekly monitor in Phase 2 first; the Toby pipeline is live revenue infrastructure and shouldn't be re-platformed on an unproven contract.
5. **Dated-volatile-guidance exception** vs the foundation's "no time-sensitive info" checklist. **Recommendation: declare it intentional in `dev/seo-growth-workspace/release-checklist.md`** (dev-side, zero consumer-token cost) so future audits stop re-flagging it.
6. **Skills-repo infra adoption** (I18). **Recommendation: yes, as a separate small AFK task** — it hardens every skill in the repo, and the source patterns are directly liftable.

---

## Appendix

### Audit provenance

| Lens | Agent/model | Key output |
|---|---|---|
| A — Roadmap regression + fresh structure | opus-4.8 @ xhigh | 25/25 roadmap items verified with file:line evidence; R1–R4 new debt |
| B — Skill-craft + executability | opus-4.8 @ xhigh | Foundation compliance matrix; 3 dry-run traces; top-10 craft list |
| C — marketingskills mining round 2 | gpt-5.5 @ xhigh (Codex) | 14-borrow fidelity table; 18 new candidates (2 survived); repo-infra adoptions; anti-borrow list |
| D — Portfolio fit & operating model | opus-4.8 @ xhigh | Real-use evidence across 5 repos; Gaps A–E; AFK collision; composition diagram |
| E — Scripts + domain currency | opus-4.8 @ xhigh | All prior bugs execution-verified fixed; N1 `--brand` gap; D1–D3 currency findings with sources |
| F — Adversarial cross-check | gpt-5.5 @ xhigh (Codex) | Spot-check confirmations; install/update-drift dimension |
| G — Chief architect | fable-5 | Target architecture, I1–I18, 4-phase plan (all load-bearing claims re-verified against the tree) |

### Artifacts

- marketingskills clone (durable, for future mining): `~/dev/code/marketingskills`
- Prior audit: `audits/2026-07-02-seo-growth-workspace-audit.md`
- Script test runs executed in isolated scratchpad copies, never in the skill directory; the skill tree was untouched by this audit
