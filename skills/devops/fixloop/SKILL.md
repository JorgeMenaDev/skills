---
name: fixloop
description: Production incident loop - triage alerts, investigate read-only, record every incident in a durable ledger, fix only what evidence proves, verify, ship, close. Use when the user says triage Sentry, debug production, investigate an error spike, a customer reports a prod bug, or wants the incident maintenance loop run end to end.
version: 1.0.0
license: MIT
---

# Fixloop

Run production incidents through one durable loop: alert or report in, evidence gathered read-only, every actionable incident recorded as a ledger issue, fixes shipped only on proof, loop closed in both the ledger and the alerting surface.

Keep this skill as the router. Load only the reference needed for the current step.

## Vocabulary

- **Alerting surface**: where production errors surface automatically. Default: Sentry.
- **Ledger**: the durable incident record. Default: GitHub issues. One issue per incident grouping. The ledger is the only durable artifact of an investigation.
- **Handles doc**: `DEBUGGING.md` at the host repo root — project handles, known-good commands, gotchas, symptom routing.
- **Evidence pass**: the read-only investigation. See [references/evidence.md](references/evidence.md).
- **Doctor**: first-run discovery that probes the stack and writes the handles doc. See [references/doctor.md](references/doctor.md).

## First Move

Read `DEBUGGING.md` at the host repo root.

- Exists → proceed with its handles, commands, and gotchas.
- Missing → run the doctor ([references/doctor.md](references/doctor.md)), write `DEBUGGING.md`, then proceed.

Also read the host repo's agent instructions (`AGENTS.md`, `CLAUDE.md`). Repo policy wins over this skill's defaults — verification commands, testing policy, language rules, deploy path.

## Entry Points

- **Alert-driven**: "run the Sentry loop", error spike, regression alert → run the full loop from step 2.
- **Report-driven**: a customer or user reports a production bug with no alert in hand → skip alert discovery, start the evidence pass, search the alerting surface for a matching grouping anyway, and still record the incident in the ledger.

## The Loop

1. **Start clean.** Confirm branch, remote, and dirty state. Never disturb unrelated work.
2. **Inspect the alerting surface.** Unresolved and recently regressed production issues. Prioritize by last-seen recency, user impact, and proximity to recent deploys. Capture IDs, first/last seen, event count, release, environment, culprit, URL, request/replay IDs when available. Inspect the latest event — never decide impact from the title alone. When several groupings are one user journey, merge them into one incident and list every alert ID.
3. **Classify.** Search the ledger for the grouping IDs before creating anything. Open match → fresh evidence comment. Closed match with a newer event → reopen as regression. No match → new ledger issue. Templates: [references/ledger.md](references/ledger.md).
4. **Evidence pass** (read-only): [references/evidence.md](references/evidence.md). Comment findings, root cause confidence, and recommendation on the ledger issue.
5. **Decide.**
   - Fix when evidence shows a current product bug, a missing production-compatible data guard, config/deploy drift that belongs in the repo, or a missing guardrail.
   - Do not fix when the event is stale on current code/data, the grouping is bot/noise, or the only action is operational outside the repo. Comment the rationale, close the ledger issue, resolve or ignore on the alerting surface.
6. **Fix.** Smallest production-compatible change, scoped to the ledger evidence. Never weaken auth, permissions, or product contracts to silence an error.
7. **Verify.** Use the host repo's verification workflow (handles doc + repo instructions). Propose regression coverage in the ledger issue; write tests only when repo policy or the user asks.
8. **Ship.** Follow the repo's deploy path. Commit message references the ledger issue and alert IDs.
9. **Close the loop.** Ledger comment with root cause, fix commit, verification results, deploy status. Close the ledger issue only after the deploy is complete or explicitly not required. Resolve the alert with the ledger reference.

Repeat from step 2 while actionable alerts remain or until the user stops the loop.

## Rules

- The evidence pass is read-only. No production writes without explicit user approval.
- Never print secrets, tokens, PII, or raw env values.
- One ledger issue per incident grouping; reopen instead of duplicating.
- If the alerting CLI or token is missing or unauthorized, report the blocker and stop — do not guess from code.
- Do not stage or overwrite unrelated dirty work; stop and report the conflict.
- New gotcha discovered (hanging command, secret-leaking flag, unsupported subcommand) → append it to the handles doc. Include the handles-doc change in the fix commit; if no fix ships, commit the doc change alone.

## Done

- [ ] Every inspected alert is fixed and resolved, ignored with documented rationale, or left open with a ledger comment saying why.
- [ ] Ledger issues carry the alert IDs; alerts carry the ledger reference.
- [ ] Final response lists: alerts touched, ledger URLs, commits pushed, verification run, deploy state, residual caveats.

## Anti-Patterns

- Diagnosing from the alert title without opening the latest event.
- Calling root cause from one surface — cross-check at least two.
- Writing a fix before the evidence pass.
- A second incident write-up outside the ledger — the ledger is the only durable artifact.
- Letting this skill's defaults override host repo policy.
