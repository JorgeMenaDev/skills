# Planning and routing

Read this before assigning waves, lanes, or executors.

## Modes and blockers

Default mode asks once for the routing plan plus Wave 1, then at each frontier. Autopilot records the same decisions and may perform reversible merges. A blocker halts its slice while independent work continues:

- `human-only`: 2FA on the user's device, captcha, ID/liveness capture;
- `irreversible`: external send, purchase, deletion, force-push, production secret rotation;
- `ambiguity`: context cannot make the slice dispatchable without risking the wrong result.

## Five edge types

| Type | Meaning |
|---|---|
| `start` | Target cannot write until source is merged or present in its base. |
| `acceptance` | Target may implement but cannot pass until source evidence/state exists. |
| `integration` | Peers may implement together; source merges before target rebases/merges. |
| `resource` | Target must atomically acquire named capacity or exclusive state. |
| `human_gate` | The named transition needs explicit authority or a human-only act. |

Every edge records source, target, gated transition, reason, and clearing evidence. Compute `wave` from `start` edges only. Integration edges create `mergeAfter` without changing waves. Recompute integration order from actual diffs before publication.

## Lanes

- `dev-subagent`: contained code change with conductor review; native agent is the default executor.
- `afk`: substantial registered-repo development through its own pipeline contract.
- `read-only`: research, audit, planning, review, or preparation.
- `computer-use`: shared browser/desktop/provider operation through its own skill.
- `human-gate`: exact action no agent can physically or safely clear.

Repo instructions and installed lane skills own their mechanics. Orchestrate owns selection and gates.

Investigations use the read-only lane, not AFK: AFK ships changes, not answers. In default mode, paid AFK work requires the user to see its brief and flags before batch approval. Autopilot invocation preauthorizes eligible AFK dispatch and reversible merges, subject to the AFK skill's own hard gates.

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

Examples: Claude may use its native agents or an installed `codex-cli-runtime`; Codex may use native agents or an installed `claude-cli-runtime`; Cursor/Grok uses `cursor-subagent`; OpenCode remains unavailable until a real adapter is installed and probed.

Before every new dispatch, inspect `.agents/engine-override.json`. An absent file means off; malformed means off plus a warning. Translate an active override into per-field executor constraints while preserving workspace/runtime carve-outs and their reasons. It never changes an already-active attempt silently.

## Plan table

Record: slice, criteria digest, lane, per-field required/preferred executor constraints, verified executor, fallback, base/target SHA, approval, start wave, `mergeAfter`, resources, verification owner, and one-line reason. Same-wave means start-eligible; resource constraints may serialize execution. Build a collision map for schema, generated APIs, auth/context helpers, route registries, migrations, and integration branches before dispatch.

Read-only preparation may inspect a future frontier and write grounded briefs outside product worktrees. Record its source SHA and files; invalidate it when they move.
