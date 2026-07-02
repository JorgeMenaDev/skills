# Job & Report Templates

Copy, fill, delete unused lines. Keep jobs short — the Operator reads them in a computer-use
context window; every line must earn its place. Paths are relative to the repo root
(`git rev-parse --show-toplevel`). `<requester>` is the requester identity from `HOST.md`.

## `generic` job  (the default — desktop/browser/CLI errand)

```markdown
# Job <NNN>: <imperative title>

**Kind:** generic
**Requested by:** <requester> (<task>)
**Goal:** <one sentence: the end state, not the clicks>

## Steps

1. <app/URL + exact action — name the menu, button, dialog>
2. ...

## Done looks like

- <what the final screen shows when this is complete>

## Deliverables

- Screenshot the end state to `.agents/operator/evidence/<NNN>/`.
- Report to `.agents/operator/reports/<NNN>-<slug>.md`.
```

## Run brief (appended to an existing job for a re-run — never a new file)

```markdown
## Run <N> (<YYYY-MM-DD>)

**Why:** <one line — what blocked or what's left from run <N-1>>
**Already DONE (do not redo):** <steps/results that stand — e.g. "step 1 invoice check; keep its verdict">
**Changed since:** <new facts, fixed access, new permissions>

1. <what THIS run does — exact actions, same rigor as base steps>
2. ...
```

## `config` job

```markdown
# Job <NNN>: <imperative title>

**Kind:** config
**Requested by:** <requester> (<task>)
**Goal:** <one sentence: the end state>

## Steps

1. <URL + exact action>
2. ...

## Deliverables

- Append to `<secrets destination from HOST.md>`: `<ENV_KEY_NAME>=<value>`
- Report to `.agents/operator/reports/<NNN>-<slug>.md` with: <what to confirm, names only>

**Do NOT** put secret values in the report or evidence.
```

## `qa` job

```markdown
# Job <NNN>: QA run — <feature area>

**Kind:** qa
**Requested by:** <requester> (<task>)
**Specs:** `tests/gherkin/<domain>/<file>.feature`
**Scenarios:** all | <scenario IDs and names>

## Environment

- App / URL: <where, must already be running — default in HOST.md>
- Sign in: <actor / sign-in path — default in HOST.md>
- Preconditions: <fixture command run? feature flag?>
- Allowed evidence surfaces: <Browser, dashboard, CLI, API>
- Allowed commands: `<exact read/setup/evidence command>`  <!-- omit if none -->

## Verdict rules

One verdict per scenario: pass / fail / blocked. Screenshot every fail/blocked at the moment
of divergence into `.agents/operator/evidence/<NNN>/`. Quote failing UI text or command errors
verbatim, except for secrets.

## Deliverables

- Report to `.agents/operator/reports/<NNN>-<slug>.md` using the qa report template.
```

## `code` job

```markdown
# Job <NNN>: Implement <slice name>

**Kind:** code
**Requested by:** <requester> (<task>)
**Goal:** <one sentence: the working end state>

## Design (already decided — do not reopen)

- Design doc / decision notes: <link>
- Glossary: use the project glossary's terms exactly: <Term, Term, …>
- Decisions: <numbered list of every architecture decision the implementation must honor>

## Plan

1. `<file path>` — <what to add/change>
2. ...

## Conventions

- <package manager, repo CLAUDE.md/AGENTS.md rules, test policy — defaults in HOST.md>

## Validation (run all, paste output summary in report)

- `<typecheck / lint / test commands>`

## Deliverables

- **Do NOT commit or push.** Leave changes in the working tree.
- Self-review your diff for bugs, then run the review gate from HOST.md until clean.
- Report to `.agents/operator/reports/<NNN>-<slug>.md` using the code report template.
```

## Report — `generic` / `config`

```markdown
# Report <NNN>: <same title as the job>

**Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | ABANDONED — <one sentence of evidence>

## What I did

1. <in the order it happened, divergences from the job noted inline>

## Values produced  <!-- omit if none -->

- `<ENV_KEY_NAME>` → written to <destination>

## Blockers & surprises

- <anything the requester would not predict from the job file; "none">

## Evidence

- `.agents/operator/evidence/<NNN>/<file>` — <what it shows>
```

## Report — `qa`

Same as above, plus a verdict table before Blockers:

```markdown
## Verdicts

| Scenario | Verdict | Evidence | Note |
|---|---|---|---|
| <id — name> | pass / fail / blocked | `evidence/<NNN>/<file>` | <verbatim error for fails> |
```

## Report — `code`

Same as `generic`, plus before Blockers:

```markdown
## Changed files

- `<path>` — <what changed>

## Validation

- `<command>` → <pass/fail + one-line summary>
- Review gate: <command> → clean after <N> loops
```
