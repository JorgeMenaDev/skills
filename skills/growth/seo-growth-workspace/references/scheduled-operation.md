# Scheduled Operation

Use when this skill is invoked without an interactive human in the loop — a cron, scheduler, watchdog, or delegated subagent running `operate`, `monthly-report`, or a monitoring checkpoint cold. An interactive session may also adopt this contract when the user asks for "unattended", "cron-safe", or "silent" behavior.

An unattended run is a *bounded* operate iteration: it resumes from workspace state, does one useful step or checkpoint, records evidence, and exits with a machine-readable summary. It never expands its own remit.

## Cold Resume

1. Read state in the State Read Order from `references/operating-loop.md` — the workspace is the only memory an unattended run has. Do not rely on conversation context, prior run output, or anything not written down.
2. Read the run's own loop state (below) to know its cadence, cooldowns, and what it already alerted on.
3. If `.seo/` is missing, do not bootstrap unattended — exit with status `blocked` and a note that the workspace needs an interactive first run. Never ask the install-mode question unattended (`references/hub-mode.md`).
4. In a hub workspace, the invoking prompt must name the target site; without one, exit `blocked` — never pick a target unattended.

## Bounded Remit

- One target site per run. Portfolio sweeps iterate targets as separate runs (`references/portfolio-registry.md`).
- Do exactly what the invoking prompt scopes — a monitor monitors, a reporter reports. New problems discovered outside the remit become Ready tickets with evidence, not work done now.
- One useful step or checkpoint per run, selected by the Work Selection order in `references/ticket-architecture.md`. If nothing is actionable, write the checkpoint evidence and exit; do not manufacture work.

## Mutation Ceiling

An unattended run may:

- read any workspace, repo, live-site, or read-only API surface;
- write `.seo/` state (backlog, log, audit updates, dated reports, loop state).

An unattended run must NOT, under any invoking prompt:

- publish or send anything externally (articles, webhook publishes, social posts, emails, review requests);
- deploy to production or merge/push product-code changes;
- request indexing, submit sitemaps, or change any admin/search-console setting;
- create, rotate, or consume credentials beyond read-only use of ones already configured;
- delete or rewrite workspace history.

Work above the ceiling becomes a Ready ticket plus a `needs_human` entry in the summary payload. If the invoking prompt asks for above-ceiling action, exit `blocked` naming the ceiling — the human runs it interactively.

## Silent Mode

Scheduled runs default to silent: emit the summary payload, and only flag for human attention when an alert condition is met — a metric crossed a threshold the loop state defines, a previously-green check went red, an external gate opened, or a `needs_human` action exists. Never send "all fine" filler to a human channel; the log entry is the record. The invoking scheduler decides delivery; this contract decides *whether there is anything to deliver*.

## Loop State (dedupe and cooldowns)

Persist per-loop state at `.seo/loops/<loop-name>.json` — meaning the resolved workspace root, so `.seo/sites/<slug>/loops/` in hub mode; hub-level sweep loops that iterate the registry may keep state at the hub's own `.seo/loops/`. Loop state exists so repeated runs do not re-alert or re-do work:

```json
{
  "loop": "weekly-gsc-monitor",
  "cadence": "weekly",
  "lastRun": "YYYY-MM-DD",
  "lastResult": "ok | alerted | blocked",
  "alerted": { "<alert-fingerprint>": "YYYY-MM-DD" },
  "cooldownDays": 14,
  "stop": "condition that ends this loop, or null"
}
```

- An alert already in `alerted` within its cooldown is logged, not re-raised.
- A loop whose `stop` condition is met exits `done` and says so once — the human retires the schedule.

## Summary Payload

End every unattended run with exactly one fenced JSON block, after the normal `.seo/log.md` handoff entry (which is still required — `references/operating-loop.md` owns its shape):

```json
{
  "status": "ok | alerted | blocked | done",
  "target": "<site or workspace root>",
  "mode": "operate | monthly-report | monitor",
  "action": "one line: what this run did",
  "evidence": "path, URL, or command output reference",
  "alerts": ["only threshold-crossing findings, empty when silent"],
  "needs_human": ["above-ceiling actions filed as tickets, empty if none"],
  "next": "next lead or recheck date"
}
```

The payload is the contract with the scheduler; keep keys stable and values one line each.

## Exit Criteria

A scheduled run exits cleanly when state was read cold, one bounded step or checkpoint completed (or blocked honestly), nothing above the mutation ceiling was attempted, loop state and `.seo/log.md` were updated, and the summary payload was emitted with silent-mode discipline applied.
