# Gates

Use this reference when deciding whether a phase or final PR can move forward. Phase gates are run and judged by the phase worker; the final gate is run by the closeout worker. No human is involved in any gate.

## Phase Gate

Follow the target repo's agent-instructions file (`AGENTS`) and local docs first. Default baseline:

- TypeScript checks.
- Lint.
- Convex strict TypeScript checks when Convex exists.

Do not invent broad test suites unless the repo requires them. Record exact commands, results, branch, commit, PR, and safety statement in the child issue before merging the phase PR.

Command discovery priority:

1. `.shiploop/config.yaml`
2. the repo's agent-instructions file (`AGENTS`) and repo docs
3. package scripts
4. known Bun and Convex defaults

Gate commands are resolved at kickoff and recorded in `.shiploop/config.yaml`; ambiguity is settled with the human then, not mid-run. A worker that still hits ambiguity blocks its task with the exact question - it never asks interactively.

Canonical config schema (workers run `gates.phase` commands in order from the repo root; any non-zero exit fails the gate):

```yaml
gates:
  phase:
    - bun run check
  final: autoreview
labels:            # optional aliases
  ready: shiploop-ready
```

Creating or editing `.shiploop/config.yaml` is a repo mutation: draft it in the run plan before kickoff, commit it on the train branch after approval, and record the change in the parent issue timeline. The config intentionally ships with the final PR; the closeout worker notes it in the final PR body.

## PR Check Dispositions

After the phase gate passes, judge the PR's GitHub checks (`gh pr checks` - do not `--watch` unbounded):

- No checks reported (`gh pr checks` exits non-zero with "no checks reported"): treat as green; the recorded phase-gate evidence stands alone.
- All green: proceed.
- Pending: poll up to 15 minutes; if still pending, extend once, then block with the check names and queue state as evidence. Never merge with pending required checks.
- Red, provably pre-existing: self-applied waiver (below).
- Red because of the diff: fix it, or block.

## Check Waivers (Self-Applied)

A phase worker may waive a required GitHub check on its own phase PR only when all of these hold:

- the failure is provably pre-existing: it reproduces on the base branch, or on a branch whose diff from the base cannot affect the check (verify by reading the failing check's logs, not its label);
- the phase gate itself passed with recorded evidence;
- the waiver is recorded on the child issue before merging: which check failed, the proof it is pre-existing, and the scope of the waiver.

Never waive checks on the final PR. It carries the same red check to the human, who owns that merge decision. Record pre-existing check failures on the parent issue as repo problems worth fixing outside the run.

Waiver comment template:

```md
Shiploop gate passed (with self-applied check waiver).

Waiver:
- Failing check: <name and exact error>
- Proof pre-existing: <why the diff cannot cause it / reproduction on base>
- Scope: this phase PR into the train branch only
```

## Final Gate

The closeout worker opens the final PR as draft. Repo-local `autoreview` is mandatory.

Invocation - from the repo root, on the train branch, against the run's target branch:

```sh
.agents/skills/autoreview/scripts/autoreview --mode branch --base origin/<target-branch>
```

Exit 0 with no accepted/actionable findings is the clean result. Accepted findings are correctness, safety, and security findings the worker verifies against the real code; style-level suggestions may be declined with a recorded reason. Fix accepted findings on the train branch and rerun until clean or blocked. Reviews can take many minutes; treat heartbeat output as progress, not a hang.

If repo-local `autoreview` is missing, the closeout worker installs it unattended only when the kickoff plan recorded a standing pre-approval for exactly this:

```sh
npx skills add https://github.com/steipete/clawdis --skill autoreview
```

After installation it records the command, resulting files, and whether they are committed to the train branch, on the parent issue. Without that pre-approval, a closeout worker that finds `autoreview` missing blocks and waits. Kickoff preflight must confirm the worker profile can invoke `autoreview` (the helper is repo-local, so any worker with shell access to the checkout can).

Then the closeout worker marks the PR ready, labels the parent issue `shiploop-human-review`, completes its task, and leaves the checkout clean on the target branch.

## Evidence Template

```md
Shiploop gate passed.

Evidence:
- Scope: phase | final
- Branch: <branch>
- Commit: <sha>
- PR: #<number>
- Commands: <exact commands and result>
- Review gate: <command and result>
- Safety: no external sends, no production mutation, no secrets exposed

Next:
- <next step>
```
