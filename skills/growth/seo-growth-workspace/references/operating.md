# Operating

Use for `operate` mode and for any checkpoint that would otherwise end with no immediate action. This file owns the loop: state reading, work selection, tickets, terminals, wake/sleep, cadences, obligations, ships, frontier discovery, unattended runs, and the upgrade pass. Fixed values (stages, cadences, caps, gate families, measurement timing) live in `references/policy.md`. Machine state formats, legal transitions, and crash intermediates live in `scripts/loop-state.mjs` — it is the single writer and validator of everything under `loops/`; prose here says what states mean, never what bytes look like.

## State read order

`.seo/` means the resolved SITE_WORKSPACE (`references/workspace.md`). Read before choosing work:

1. `backlog.md` — current focus, in progress, Ready, Blocked, Done.
2. `node "$SKILL_DIR/scripts/cadence-status.mjs" --workspace "$SITE_WORKSPACE" --format backlog` — due occurrences, due obligations, in-flight reconciliation rows, earliest next-due.
3. `log.md` — last action, stale leads, recheck dates.
4. `audit.md` — findings and unresolved risks; `strategy.md` — durable decisions and tooling.
5. Latest relevant `reports/*`; `backlinks/work-log.md` for pending outreach.
6. `context.md` — business context (fall back to strategy/audit/README and record drift when missing).

If `.seo/` is missing, run `bootstrap` first (interactive only). If one file is missing, create only it; in no-write runs report the drift instead.

## Work selection

1. **Emergency Selector** — an observed red safety delta promotes to P0 and runs first. A due safety check is evidence to run the check, never itself a P0. If it interrupts active work, record the exact resume point.
2. `Current focus` when it points at a real, still-target-owned ticket.
3. First real `In progress` row.
4. Top Ready ticket by priority and table order.
5. A Blocked ticket that became unblockable (access, data, ownership, deployment, or product state changed). Re-evaluate every `wakeOn` predicate on each invocation.
6. A new evidence-backed ticket from stale notes, expired rechecks, missing reports, or checkpoint findings — never a duplicate of an outcome the backlog, log, audit, or reports already point at.

**Target boundary.** Park work that is mainly infrastructure monitoring, another site's publishing path, waiting on another operator, or blocked on business ownership — record evidence, owner/surface, and the unblock signal, then continue with the smallest target-owned checkpoint. In hub mode a parked ticket belonging to another registered site may be re-filed there (`references/workspace.md`).

## Tickets

| Field | Rule |
| --- | --- |
| ID | `SEO-000`, monotonically increasing per site workspace |
| Priority | `P0` urgent indexability/data loss · `P1` revenue/conversion/measurement · `P2` quality/performance/schema · `P3` content/internal links/pSEO · `P4` authority/backlinks/monitoring |
| Area | `indexability` `gsc` `analytics` `cro` `schema` `performance` `content` `internal-links` `pseo` `local-seo` `backlinks` `entity` `ai-visibility` `reporting` `admin` |
| Ticket | One clear outcome, not a theme |
| Verify | The exact evidence required for Done |
| Status | Row location: `Ready`, `In progress`, `Blocked`, `Done` |

Hygiene: one current focus; no duplicate tickets for one outcome; long evidence lives in `audit.md` or `reports/*`, not backlog cells; Done rows carry date and verification summary.

**Eligibility gate** — an implementation ticket is eligible only with all of: dated source signal; target-owned outcome; non-duplicate fingerprint; phase readiness (`references/first-run.md`); plausible business-impact hypothesis; at least one dated first-party or `[E]`/`[P]` observation; a baseline or an explicit proxy plan naming its decision threshold; the metric and decision the work can affect; rough effort and dependencies; acceptance evidence per Done criteria. A failed candidate is retained as a dated skip or Blocked row naming the failing gate, owner, and a dated recheck or `closed:<reason>` (human provenance required). Classify every failed gate with one of the four families in `references/policy.md` and apply its wake/escalation timing. For a due cadence occurrence, due-ness is the dated signal and the cadence row's check and decision satisfy hypothesis and metric; dedupe still applies, and a still-open ticket for the same occurrence is reused.

**Blockers** record what is blocked, exact evidence, owner, and next unblock action. If a route has a safe fallback, use it and log the limitation instead of blocking.

## Evidence

Every ticket needs at least one concrete verification source: file path + command output for repo changes; live URL, status code, rendered metadata, or screenshot for site changes; admin report row for hosting/GSC/analytics/DNS/scheduler changes; API/CLI output for engine state; public URL for backlinks; property + date range for GSC/analytics. "Looks good" and "should work" are not evidence.

Evidence states: **Reported** (stated by an identified source) · **Observed** (directly inspected in the declared sample) · **Third-party estimate** (assumptions stated) · **Inference** (reasoned interpretation, not fact) · **Action completed** (dated intervention, separate from result) · **Outcome** (later observed result; never causation by label). Provenance tiers: `[E]` established first-party or documented standard; `[P]` attributed practitioner/platform consensus; `[H]` hypothesis/default; `[V]` vendor claim. `[H]`/`[V]` can label a research lead but never qualify an implementation ticket. Material evidence records name source, date/period, sample, locale/device where relevant, owner, limitations, and recheck date. Outcome ladder (no arrow implies causation): exposure → mention → citation → referral/session → qualified conversion → customer → revenue. Buyer stages when supported: Discovery, Research, Comparison, Trust validation, Action, Retention/referral; otherwise `Unknown` — never inferred to fill a field.

## Done criteria by area

| Area | Done requires |
| --- | --- |
| `indexability` | Live URL, robots/sitemap/canonical/noindex evidence |
| `gsc` | Property/date-range evidence, exported/browser data, follow-up if data is fresh or unavailable |
| `analytics` | Installed code/admin state plus live traffic/event or blocked no-traffic note |
| `cro` | CTA path verified desktop and mobile |
| `schema` | Rendered JSON-LD type and parseable output |
| `content` | Keyword/brief/article/calendar state plus route/sitemap proof |
| `internal-links` | Source pages, target pages, anchor text, deployed verification |
| `pseo` | Plan/data/gates plus explicit publish/no-publish decision |
| `local-seo` | GBP/citation/review matrix plus ranked actions or applied changes |
| `backlinks` | Public indexable URL or logged outreach/submission status |
| `ai-visibility` | AI-crawler access evidence plus dated citation matrix or assistant-referral data |
| `reporting` | Data source, date range, deltas, wins/problems/next action |

Any ticket that creates or materially revises a public SEO page also inherits the launch gates in `references/pages.md`, regardless of Area.

## Three terminals

Every run ends in exactly one terminal — **"nothing to do" is not a terminal**, and silent dry exits do not exist:

1. **Executed work** — one eligible, target-owned action attempted, verified against Done criteria, recorded.
2. **Scoped dated sleep** — `loop-state.mjs sleep certify` succeeded, writing a deduplicated certificate with the earliest next due date and/or an observable wake predicate.
3. **Honest blocked** — a named gate family, owner, evidence, and recheck value are recorded.

The terminal is scoped to the resolved target, mode, requested surface, remit, and mutation ceiling. A partial sweep may claim only `no candidate from rungs checked`; `nothing valuable this cycle` requires a completed sweep within every coverage window and names the top three rejected candidates with their failing gates. Contribute-back to this skill is a post-run side effect under the workspace contract — never a terminal, a rung, or a backlog row.

## Wake and sleep

Continuity is `nextWakeAt` (dated next check) and/or `wakeOn` (machine-checkable predicate with source, owner, fingerprint). A predicate nothing can observe is `paused/needs_human` — never invent a date for an event-gated blocker. The certificate is minted only by `loop-state.mjs sleep certify`, which refuses — as exit codes, not judgment — under upgrade drift, unreconciled in-flight occurrences or obligations, expired or annotated coverage under a `complete` claim, or an armed ungated autopublish path. A certificate suppresses work only for an equivalent invocation fingerprint and is never permission to skip a newly observed signal. Re-running inside the wake window without a new signal is a hot-loop heartbeat: `loop-state.mjs sleep heartbeat`, zero new report/log/ticket spam; append a log entry only when evidence, wake state, or terminal outcome changes.

## Cadences, obligations, ships

All machine state lives under `loops/` and is written only through `loop-state.mjs` (`--help` documents every command and exit code); `cadence-status.mjs` stays the cold reader. Crash retries re-run the same idempotent command — the tool reconciles by fingerprint and never duplicates.

- **Cadence occurrences** (`occurrence add|materialize|attempt|satisfy|block`): identity is `{cadenceId, dueWindow}`; one active ticket per occurrence, retries reuse it; both `ok` and `alerted` count as observed, and `alerted` also links remediation or `needs_human` work; failures take the bounded backoff in `references/policy.md` and never silently satisfy the cadence. Cadence rows materialize at their area's normal priority — due-ness never raises priority; only the Emergency Selector promotes.
- **Measurement obligations** (`obligation add|claim|materialize|resolve|inconclusive|supersede`): every SEO Ship whose outcome could still change a keep/rollback/iterate decision creates one at ship time — baseline, metric, decision it can change, due date per `references/policy.md`. A dated recheck promise in a Done row or log entry is itself an obligation: ledger it in the same pass or record an exemption — prose next-leads are where follow-ups die. An inconclusive due measurement records attempt, reason, and evidence and returns to pending with a later wake; GSC lag and missing access are inconclusive, never resolved. Deploy verification alone never resolves a ranking, CTR, conversion, or indexation hypothesis.
- **Ship events** (`loop-state.mjs cap`, publish, then `ship record`): run `cap` **before** any qualifying publication — a cap hit blocks it and routes to `needs_human` or a dated wake; it does not certify sleep and does not manufacture a ticket. Every qualifying or ambiguous SEO Ship then appends one normalized event in the same pass (one event per counted canonical URL; a multi-URL event asserts a qualifying shared release via `--shared-release`); the Done row references it or records why the ship does not qualify. Ambiguity fails closed and counts.
- **Coverage ledger**: one dated artifact per frontier rung; the reader derives expiry from current policy. A rung annotated `staleAsOf` counts as stale until a fresh observation rewrites the row; the re-observation is filed as a normal backlog row.

## Frontier sweep

When Ready is empty, discovery runs as a cadence row — an evidence ladder, not a re-audit. Persist the cursor in loop state; start at the cursor, not at A. Skip rungs inside their coverage max-age or cooldown (`references/policy.md`). Stop at the first candidate that passes the eligibility gate; materialize or reuse one ticket; retain the top rejected candidates with failing gates; write the dated ledger report (shape below). Sweep output is never silence.

| Rung | Question | Data source / method owner |
| --- | --- | --- |
| A | What sales, CS, or review language exposes an unmet job, objection, comparison, or use case? | Dated CRM/call/support/review records the operator may read — recipe below |
| B | Which query/page impressions expose CTR, page-two, cannibalization, or thin-data opportunities? | GSC export via `references/search-console.md` |
| C | Which page decayed or needs consolidation/removal? | `references/content-refresh.md` |
| D | Which evidenced competitor demand or page type is absent from the target? | `references/competitor-profiling.md` |
| E | What does live SERP anatomy require that the target lacks? | `references/content-ops.md` |
| F | Which committed roadmap capability creates a search candidate useful at or before launch? | Recipe below |
| G | Where is brand/entity identity inconsistent or unsupported? | `references/backlinks-entity.md` |
| H | Which task-completion query can a genuinely useful free utility satisfy? | `references/utility-tool-pages.md` |
| I | Which evidence-backed story, dataset, or linkable asset merits digital-PR work? | `references/backlinks-entity.md` |
| J | Where do dated assistant observations show a source/portrayal void with one bounded action? | `references/ai-search-visibility.md` |

**Rung A**: declare sources, access boundary, market, date range, sampling limits; extract short faithful phrases into a dated matrix (source pointer, job, verbatim/paraphrase, objection, owned URL, evidence state); cluster by customer job; frequency only inside the declared sample; form the smallest candidate answering a repeated job, check cannibalization, then the gate. Keep customer secrets and PII out of reports; store pointers when sources are private.

**Rung F**: read only a dated roadmap whose owner and commitment state are identifiable — only `committed` supports implementation work. Map capability → job/query, audience, locale, earliest truthful public date, current coverage, available proof. Reject announcement-only pages; prefer surfaces accurate at publication. Dedupe, validate SERP intent per `references/content-ops.md`, then the gate; record product-truth/timing dependencies as the failing gate.

**Ledger report** (`reports/frontier-sweep-YYYY-MM-DD*.md`):

```md
# Frontier sweep — YYYY-MM-DD (run id)
Cursor: start → end. Rungs observed: … Skipped (fresh/cooldown): …
| Rung | Evidence (dated) | Candidates | Gate result | Artifact |
Outcome: ticket SEO-NNN materialized / no candidate from rungs checked.
Top rejected: candidate — failing gate (× up to 3).
```

**Autopublish quality watch.** While a content engine's autopublish is armed, a live quality-watch occurrence covering the next publish window must exist (inspection method: `references/content-engine-webhooks.md`; an observed watch mints the next window's watch). An armed ungated path makes the site ineligible for sleep — `sleep certify` refuses — until a gate is restored or autopublish is disarmed. Record the engine's observed scheduler state (`autoPublish`, `enabled`, window, checked-at, evidence) in the loop file's `schedulerMirror`.

**Empty backlog rule.** An empty Ready/In-progress queue never means SEO is done and never justifies a fake recheck ticket. Separate unblocked repo-owned actions from external gates; if none remain, sweep, then certify or block honestly. Do not rerun every audit — pick the smallest checkpoint suggested by stale evidence or the likeliest growth constraint (indexability, GSC, analytics, conversion, content, internal links, pSEO, schema, performance, authority, AI visibility, local, reporting).

## Unattended runs

A cron, scheduler, or delegated subagent run is one *bounded* operate iteration: resume cold from workspace state (the workspace is its only memory), do one useful step or scoped checkpoint, record evidence, exit through a terminal. It never expands its own remit — a monitor monitors; discoveries outside the remit become Ready tickets, not work done now. In a hub, the invoking prompt must name the target site; a missing workspace or unnamed target exits `blocked` (never bootstrap or pick a target unattended).

**Mutation ceiling** — an unattended run may read anything and write `.seo/` state, and must never: publish or send anything externally; deploy or push product code; request indexing or change admin/search-console settings; create, rotate, or consume credentials beyond configured read-only use; delete or rewrite workspace history. Above-ceiling work becomes a Ready ticket plus `needs_human`; if the prompt itself asks for above-ceiling action, exit `blocked` naming the ceiling.

**Silent mode.** Alert only on a defined threshold crossing, a green→red transition, an opened external gate, or a `needs_human` item; never send "all fine" filler. An alert already recorded in loop state is logged, not re-raised, until its probe goes green again. End every unattended run with one fenced JSON summary:

```json
{ "status": "ok | alerted | blocked | done", "target": "…", "mode": "…", "action": "one line",
  "evidence": "path or URL", "alerts": [], "needs_human": [], "next": "lead or recheck date" }
```

On observed drift, an unattended run reports (`needs_human`: upgrade pass pending), completes its other eligible work, and ends without a certificate — never a false all-clear, never executing the pass itself. A schedule's configured `done` stop is lifecycle metadata, not a fourth terminal.

## Upgrade pass

`loop-state.mjs stamp check` reports drift (absent stamp = drifted; drift blocks sleep certificates only — everything else continues; workspace creation stamps itself at birth). When drifted, the operator — never an unattended run — runs one pass per workspace:

1. `loop-state.mjs verify` — machine state validated; repair forward with `--repair` or filed rows.
2. Re-judge every open backlog row against current gates — each gets a dated keep/amend/close with reason; closes move to Done with a note.
3. Check ship history and dated promises have their obligations — file gaps as normal rows.

Write a short dated report to the path `stamp report-path` names, then `stamp write --report <path>`. Real work exits into normal rows; the pass is bookkeeping, never a re-audit. History is never rewritten: Done rows, past reports, and ledger history stay as recorded. In a shared working tree, passes over different workspaces serialize as entire runs; concurrent passes need their own clone or worktree, each committing only its own workspace's paths with pull-rebase before commit and push.

## Handoff log

Append to `log.md` after each run in which evidence, wake state, or terminal outcome changed:

```md
## YYYY-MM-DD - Short title
- Mode: operate / technical-seo-fix / …
- Chosen ticket: SEO-000 or `new ticket created`.
- Evidence: command, live URL, report path, admin surface, or limitation.
- Result: executed work, scoped dated sleep, or honest blocked.
- Next lead: one concrete follow-up with owner or recheck date.
```

## Exit criteria

State was read in order, work was selected by the rules above, exactly one terminal was recorded with its evidence, machine state was written only through `loop-state.mjs`, and the handoff entry exists when anything changed.
