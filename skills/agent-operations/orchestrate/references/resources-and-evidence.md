# Resources, effects, and evidence

## Resource authority

Observation is not acquisition. Before dispatch, classify and atomically acquire the resource:

| Resource | Authority |
|---|---|
| AFK capacity | lane/global service if atomic; otherwise host slots plus live queued/in-progress counts |
| Computer Use desktop | host mutex registry |
| Install-heavy host phase | host mutex registry |
| Integration-branch writer | host mutex plus exact remote-head reconciliation |
| Port | retained OS socket or allocator-returned identity |
| Git branch/worktree | atomic Git ref/worktree creation |
| Browser/QA session | runtime allocator's unique identity; otherwise host mutex |

Use `probe --action acquire` for host mutexes and retain ownership through the slice's terminal transition; release afterward before run completion. Every resource effect carries the exact resource ID. `release` requires matching run, conductor, owning slice, and a terminal owner. Ambiguous/dead ownership becomes `UNKNOWN` and needs reconciliation plus explicit recovery. This is a small local registry, not a distributed lease service: no daemon, heartbeat, TTL, or fencing token.

External effects use the ledger lifecycle `prepared -> executing -> observed | unknown | cancelled`. The ledger lock protects facts, not the external call. Hold a local execution mutex where practical; otherwise require provider idempotency or exact fail-closed reconciliation.

## Evidence manifest

Every acceptance criterion records:

- command or UI flow and observed result;
- durable artifact or exact replay instructions;
- storage class: committed, ignored scratchpad, PR comment, or sensitive evidence store;
- sensitivity: public, internal, PII, or credential-adjacent;
- masking, retention, independent verifier, and probe-removal condition.

Raw browser captures are internal by default. Inspect for credentials, auth codes, private PII, and session material before persistence. Store no credential value in ledgers, prompts, reports, commits, or knowledge bases.

A temporary probe may be removed only after evidence is durable and the independent reviewer confirms reproducibility or records a justified privacy/safety exception. Losing the only reproducible proof blocks acceptance.

## Lane terminal proof

| Lane | Ready requires | Terminal means |
|---|---|---|
| dev-subagent | clean committed handoff, self-checks, evidence | merged and post-merge verified, or explicitly accepted local commit |
| afk | pipeline handoff plus review/QA disposition | merge bar cleared and merged |
| read-only | report covers every criterion/source | conductor accepted report |
| computer-use | report plus sensitivity-safe evidence | operation verified or exact human-only blocker |

Human gates and irreversible effects remain uncleared until the exact authorization/evidence is written to the ledger.
