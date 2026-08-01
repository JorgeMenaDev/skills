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

## GitHub autopilot routing (include only in GitHub autopilot)
- Required capabilities: `{ vision: <true|false>, computerUse: <true|false> }`
- Selected route: `<harness> / <model> [variant]`; route capabilities: `{ vision: <true|false>, computerUse: <true|false> }`
- Ticket PR base: <integration branch>
- Allowed GitHub actions: commit and push the assigned branch; open or update its ticket PR
- Conductor-reserved actions: review; merge; tracker mutation; integration/final PR handling; final gates
- Ticket verification: relevant existing checks + predefined ticket-scoped Gherkin; browser/visual flows only with required capabilities
- Reserved verification: no `autoreview`, full Gherkin suite, or accumulated integration UI checks
- Hand-back identity: ticket PR URL/number + exact PR head SHA

## Decisions already made
<numbered; the worker follows them without relitigating>

## Read first
<files/issues the worker must read before editing>

## Acceptance criteria
<one per line: criterion → the exact command/flow that proves it → expected result. If a criterion can't be proved in this slice, say where it will be — never overclaim.>

For runtime-change acceptance proof, use this verification contract: The verifier runs the **delta** (scenarios the diff adds or touches) against the live app through the golden path — login via `/api/qa/login` (local) or `qa:login-url` (preview/prod), fixtures via `qa:seed` — using computer-use when in-session on the mini and agent-browser in AFK/cloud/sandbox lanes, and attaches per-scenario verdicts + screenshots + an `executor:` line to the PR recap. The verification rule is: scenarios come from the spec, never authored at verify time.

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
- ticket PR URL/number and exact head SHA (GitHub autopilot only);
- exact commands run with unpiped exit codes;
- GitHub autopilot verification attestation: ticket-scoped checks/Gherkin only; no `autoreview`, full suite, or accumulated integration UI checks;
- per-criterion disposition: `passed | failed | unprovable-here`, with artifact locations;
- decisions taken that the brief left unsettled, each flagged for conductor review;
- risks, known gaps, and an unrelated-change statement;
- reviewer-first-look: the two or three places a reviewer should read first.

## Standing lessons

The `## Standing lessons` section of `PLAN.md` is conductor-owned. Append each generalizable accepted finding once, deduplicated, with the originating slice; every later brief embeds the section verbatim, so tooling facts never drift between waves. At run end, portable entries graduate to the canonical skill through its normal release flow; run-local entries stay with the run.
