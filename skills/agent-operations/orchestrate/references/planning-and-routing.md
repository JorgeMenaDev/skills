# Planning and routing

Read this before assigning waves, lanes, or executors.

## Modes and blockers

Default mode presents and records the routing plan plus Wave 1, then each frontier. It pauses only when the active workspace contract exposes a gate. Autopilot records the same decisions and may perform reversible merges under that contract. A blocker halts its slice while independent work continues:

- `human-only`: payment, CAPTCHA, passkey or biometric prompt, 2FA requiring the user's device, ID/liveness verification, or a credential only the user possesses and the system cannot retrieve;
- `judgment`: choosing a new goal, making a material trade-off, making a promise or commitment, or taking a public position for the user;
- `permanent-loss`: permanently losing data, access, or ownership without an already-stated decision authorizing that exact loss;
- `ambiguity`: context cannot make the slice dispatchable without risking the wrong result.

External sends, production actions, credential use, secret rotation, deletion, and account actions are not gates by themselves. The active workspace contract decides whether their specific consequences cross one of the gate classes above.

A task whose start edge is this run's own merge is post-merge work, not a slice in the current run. Record it as an open deferred gate with its tracker reference; discharge or separately authorize it after the merge. `classify --post-merge-work yes` prints this routing hint.

## Five edge types

| Type | Meaning |
|---|---|
| `start` | Target cannot write until source is merged or present in its base. |
| `acceptance` | Target may implement but cannot pass until source evidence/state exists. |
| `integration` | Peers may implement together; source merges before target rebases/merges. |
| `resource` | Target must atomically acquire named capacity or exclusive state. |
| `human_gate` | The named transition crosses a workspace-contract judgment, permanent-loss, or human-only gate. |

Every edge records source, target, gated transition, reason, and clearing evidence. Compute `wave` from `start` edges only. Integration edges create `mergeAfter` without changing waves. Recompute integration order from actual diffs before publication.

## Lanes

- `dev-subagent`: contained code change with conductor review; native agent is the default executor.
- `afk`: substantial registered-repo development through its own pipeline contract.
- `read-only`: research, audit, planning, review, or preparation.
- `computer-use`: shared browser/desktop/provider operation through its own skill.
- `human-gate`: exact action no agent can physically or safely clear.

Repo instructions and installed lane skills own their mechanics. Orchestrate owns selection and gates.

Investigations use the read-only lane, not AFK: AFK ships changes, not answers. Before dispatch, show the AFK brief and flags, record the routing decision, and proceed unless the active workspace contract exposes an unresolved gate.

## Executors

Discover capabilities from the current runtime, installed skills/adapters, and available commands. Schema names do not prove availability. Each candidate records:

- executor id and chair-verified vendor; requested and verified model/effort separately;
- read/write, worktree/commit, network/browser/UI, isolation, and shared-resource needs;
- resumable session id and context-preserving steer support;
- completion signal, cost/latency class, and concurrency limit.

Selection order:

1. Mark each user/override constraint `required` or `preferred`.
2. Satisfy lane capabilities and vendor-independence requirements.
3. Prefer the runtime's native executor when equally capable.
4. Otherwise use the cheapest installed non-native adapter that clears the bar.
5. Record reason and fallback chain before dispatch.

A missing required executor/model/effort fails closed. A preferred choice may use only its recorded fallback. Unknown runtime metadata remains `unknown`; self-report never attests vendor/model.

When model or effort is required, a native surface is eligible only if its runtime metadata proves those fields. Otherwise use an installed adapter whose launch flags are exact, run one bounded capability probe, and retain the launcher or runtime record as `--runtime-proof`; repeated blind spawn attempts are a routing failure.

Examples: Claude may use its native agents or an installed `codex-cli-runtime`; Codex may use native agents or an installed `claude-cli-runtime`; Cursor or Cursor-hosted Grok uses `cursor-subagent`; native xAI Grok (Grok Build CLI headless, default `grok-4.5` effort high, structured output + resumable sessions) uses `grok-cli-runtime`; OpenCode remains unavailable until a real adapter is installed and probed.

Before every new dispatch, inspect `.agents/engine-override.json`. An absent file means off; malformed means off plus a warning. Translate an active override into per-field executor constraints while preserving workspace/runtime carve-outs and their reasons. It never changes an already-active attempt silently.

## Depletable capacity and staging

Implement and review engines, agent slots, disk, and QA identities are budgets, not assumptions:

- Before a long chain, probe engine/review quota and pre-declare a failover ladder per depletable resource (e.g. codex → claude engine → conductor); switch through the ladder instead of improvising mid-gate. An operator-instructed engine switch is a normal, loggable routing decision.
- Declared capacity is not observed availability. A failed spawn against a nominally free slot updates the observation — owner, parent, retry/backoff, cleanup disposition — and gets bounded retry, never repeated blind spawns.
- Check disk headroom in preflight and per wave; reclaim only allowlisted regenerable caches, never active worktrees, sources, dependencies, evidence, or local databases.
- QA actors are scarce, not throwaway fixtures: keep a registry with role/workspace capabilities, reuse before creating, and record a restoration owner.
- Look one wave ahead for external inputs — builds, credentials, fixtures, accounts — and stage them while the current wave executes, recording source SHA so staleness is detectable.

## Plan table

Record: slice, criteria digest, lane, per-field required/preferred executor constraints, verified executor, fallback, base/target SHA, approval, start wave, `mergeAfter`, resources, verification owner, and one-line reason. Same-wave means start-eligible; resource constraints may serialize execution. Build a collision map for schema, generated APIs, auth/context helpers, route registries, migrations, and integration branches before dispatch.

Read-only preparation may inspect a future frontier and write grounded briefs outside product worktrees. Record its source SHA and files; invalidate it when they move.
