# Brief template, executor report, and standing lessons

Briefs across a run are ~70% isomorphic; hand-write only the slice-specific parts. Executors get no follow-up questions — ambiguity belongs in the brief or in a recorded decision, never in a mid-run chat.

## Brief skeleton

Write one file per slice to disk before spawn:

```markdown
# Brief: <slice-id>

## Objective and scope
<goal in one paragraph; explicit non-scope list>

## Base
- Repo: <path>  Branch: <branch>  Base SHA: <sha>
- Worktree: <exact path the worker owns>
- Execution context: <deployment, ports, QA actor, browser session, env>

## Decisions already made
<numbered; the worker follows them without relitigating>

## Read first
<files/issues the worker must read before editing>

## Acceptance criteria
<one per line: criterion → the exact command/flow that proves it → expected result. If a criterion can't be proved in this slice, say where it will be — never overclaim.>

## Owned paths
- May edit: <paths>
- Generated/formatter allowlist: <paths>
- Must not touch: <paths>

## Hard constraints and stop rules
<safety, sensitivity, budget, and the exact conditions that stop work>

## Definition of done
<clean committed state, self-checks run, REPORT.md written last>

## Standing lessons
<append the run's standing-lessons verbatim here>
```

## Executor REPORT.md

The report is written last and locates proof — it is never proof itself:

- files changed, each with one line of why;
- exact commands run with unpiped exit codes;
- per-criterion disposition: `passed | failed | unprovable-here`, with artifact locations;
- decisions taken that the brief left unsettled, each flagged for conductor review;
- risks, known gaps, and an unrelated-change statement;
- reviewer-first-look: the two or three places a reviewer should read first.

## Standing lessons

The `## Standing lessons` section of `PLAN.md` is conductor-owned. Append each generalizable accepted finding once, deduplicated, with the originating slice; every later brief embeds the section verbatim, so tooling facts never drift between waves. At run end, portable entries graduate to the canonical skill through its normal release flow; run-local entries stay with the run.
