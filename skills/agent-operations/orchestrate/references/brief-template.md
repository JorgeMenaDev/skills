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

## Acceptance criteria and evidence matrix
| Criterion | Actor (role/workspace/state) | Action | Expected | Artifact | Verifier | If unprovable |
|---|---|---|---|---|---|---|
<one row per criterion; "If unprovable" names the deferred-gate rule, never an overclaim>

## Owned paths and allowlist
- May edit: <paths>
- Generated/formatter allowlist: <paths>
- Must not touch: <paths>

## Hard constraints and stop rules
<safety, sensitivity, budget, and the exact conditions that stop work>

## Definition of done
<clean committed state, self-checks run, REPORT.md written last>

## Standing lessons
<append the run's standing-lessons.md verbatim here>
```

## Executor REPORT.md schema

The handoff report is written last and locates proof; it is never proof by itself:

- files changed, each with one line of why;
- exact commands run with unpiped exit codes;
- evidence-matrix dispositions: per criterion `passed | failed | unprovable-here` with artifact locations;
- decisions taken that the brief left unsettled, each flagged for conductor review;
- risks, known gaps, and an unrelated-change statement;
- reviewer-first-look: the two or three places a reviewer should read first.

## Standing lessons

One `standing-lessons.md` per run directory, owned by the conductor:

- When an accepted review finding generalizes beyond its slice, append it once, deduplicated, with the date and originating slice.
- Every subsequent brief embeds the file verbatim at dispatch time — tooling facts are never re-typed per brief, so they cannot drift between waves.
- At run end, portable entries graduate to `knownLessons` and, when they change doctrine, to a canonical skill issue; run-local entries stay with the run's evidence.
