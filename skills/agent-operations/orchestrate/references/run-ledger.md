# Run ledger

Use the helper from the installed skill directory. `run.json` is machine authority; edit it only through the helper. `RUN.md` is regenerated with a source revision and digest.

## Initialize

Create a spec from `examples/three-slice-spec.json`, then use the one-command entry:

```bash
node <skill>/scripts/orchestrate-run.mjs start --dir <scratchpad>/orchestrate/<run-id> --spec <spec.json>
node <skill>/scripts/orchestrate-run.mjs inspect --run <run.json>
node <skill>/scripts/orchestrate-run.mjs render --run <run.json>
```

`start` verifies the repo, fills `baseSha`/`expectedHead` from the live target branch when the spec says `"auto"`, initializes the ledger, writes the locator, reconciles, and emits the first frontiers in one step. `init` remains the low-level initializer for specs whose repo state is intentionally absent.

The helper also writes `XDG_STATE_HOME/orchestrate/active-runs/<repo-hash>.json` (fallback `~/.local/state`) so a fresh conductor can find the run; `start` and `adopt` fail closed while that locator points at a live run.

When orchestration is discovered mid-run — work already dispatched from prose — import it conservatively with `adopt --dir <dir> --spec <spec.json>`. Every effect not provably observed becomes `unknown`, every progressed slice without ledger-grade proof (observed dispatch, cleared edges, passing criteria) is downgraded to `UNKNOWN` with a blocker, and reconciliation starts `unknown`. Adoption never pretends prior acts were ledgered: rule on each `UNKNOWN` slice and unresolved effect before the write frontier opens.

## Update and effects

Only the conductor updates facts:

```bash
node <skill>/scripts/orchestrate-run.mjs update --run <run.json> \
  --expected-revision <n> --patch <merge-patch.json> \
  --conductor-id <id> --conductor-epoch <n>
```

Updates use an atomic lock directory, re-read revision and conductor ID/epoch under lock, validate legal transitions, and rename the next revision atomically. A stale writer fails closed. Ownership changes use `takeover` after clean reconciliation; it changes the conductor ID and increments the epoch exactly once.

Before dispatch, external resume, global allocation, push, PR create/update, merge, issue close, or another external operation, add an effect with status `prepared`, owner epoch, attempt key, and exact reconciliation probe. Move it to `executing` immediately before the act and `observed` only with the real remote/runtime identity. A dangling or unprobeable effect becomes `unknown`; retry only provider-idempotent work with the same key.

An `unknown` or executing effect may become `cancelled` only with proof of definite non-execution or an `authorization.effectRulings` entry naming the effect, ruling, approver, and evidence. Unprobeable irreversible acts remain unknown until that ruling.

## Inspect and recover

```bash
node <skill>/scripts/orchestrate-run.mjs reconcile --run <run.json> \
  --expected-revision <n> --conductor-id <id> --conductor-epoch <n>
node <skill>/scripts/orchestrate-run.mjs inspect --run <run.json>
```

`reconcile` compares recorded repo/worktree/process/runtime-observation facts with live state and emits `RECONCILIATION: clean|unknown|offline`. It never guesses clean. `inspect` validates recorded authority and emits `WRITE_FRONTIER`, `PREPARATION_FRONTIER`, `INTEGRATION_FRONTIER`, and unresolved tokens; only those tokens drive dispatch.

Pass conductor ID/epoch to every mutating command (or set `ORCHESTRATE_CONDUCTOR_ID` and `ORCHESTRATE_CONDUCTOR_EPOCH`). Reconciliation checks the exact local and remote target head, worktrees/branches, fresh active-runtime observations, mutex owner contents, bound merge/external-effect observations, and preparation source SHAs. A disagreement moves the affected slice to `UNKNOWN` and closes the write frontier.

Every adapter observation file is a current snapshot bound to `runId`, conductor ID/epoch, `observedForRevision`, and an `observedAt` no more than five minutes old. Runtime rows bind attempt key, executor/vendor, session identity, status, and timestamp. Merge rows use a unique 40-hex source identity and either locally verified Git ancestry or provider-attested PR-head binding; all external rows bind effect ID, expected source, locator, observed identity, live remote target head where applicable, status, and timestamp. Missing, stale, or mismatched fields yield `UNKNOWN`; clean reconciliation itself expires after five minutes.

Lifecycle: `PLANNED -> ACTIVE -> READY_FOR_ACCEPTANCE -> ACCEPTED -> TERMINAL`. `BLOCKED` and `UNKNOWN` interrupt but do not finish a slice. One formal failed handoff may return to `ACTIVE`; a second abandons that attempt and starts a new attempt key. Terminal outcomes are `merged`, `accepted_local`, `report_accepted`, `operation_verified`, `cancelled`, or `deferred`. Cancellation/defer may terminate without successful criteria only when `authorization.cessations` records slice, outcome, approver, and evidence; parent criteria must be marked accounted with evidence.

After a dead process leaves a lock, use `recover-lock` or `recover-mutex --confirm-stale`; both verify ledger ownership and refuse a live PID. Mutex recovery requires the resource and reconciliation already be `UNKNOWN`, and unresolved effects still require an explicit ruling.

## Checkpoint and rotation

```bash
node <skill>/scripts/orchestrate-run.mjs checkpoint --run <run.json> \
  --expected-revision <n> [--reason <text>] [--observations FILE] \
  --conductor-id <id> --conductor-epoch <n>
```

`checkpoint` reconciles, appends a checkpoint record to the ledger, and renders `RESUME.md`: frontiers, per-slice branch/base/attempt/correction state, active runtime identities, held resources, unresolved effects, open deferred gates, and the next safe act. Checkpoint at every wave boundary on multi-hour runs — one conductor context is a single point of failure even when workers are isolated. If a crash separates a committed checkpoint from its resume document, `checkpoint --render-only` regenerates `RESUME.md` from the committed ledger without reconciling or appending a record.

Rotate the conductor when time, wave count, or context growth crosses the threshold recorded in the plan — at a clean wave boundary only, never during an executing irreversible effect or unresolved integration. The incoming conductor reads `RESUME.md` plus the source issues, runs `takeover`, then re-reconciles before any write; the outgoing conductor's stale epoch fails closed. A checkpoint is never dispatch authority by itself.

## Deferred gates

An external gate that cannot be discharged now (real-provider proof, human-only act) is recorded in `deferredGates` as `open` with the owning slice and description — never overclaimed as passed. Open gates block `assert-complete` until `discharged` with evidence or `authorized` with an approver and evidence.

## Completion

```bash
node <skill>/scripts/orchestrate-run.mjs assert-complete --run <run.json>
```

Completion requires every slice terminal, no unresolved effect/allocation, no open deferred gate, all parent criteria proved, and lane-specific terminal evidence. A blocked or abandoned attempt never satisfies the run.

After completion, release resources, reconcile worktree disposition, apply evidence retention, render the final view, then run `archive` to remove the active locator while retaining the ledger. A stale generated view is never authority; `render` always replaces it from current JSON and prints the source revision/digest.
