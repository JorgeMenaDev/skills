---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

<target-repo>

Resolve the target BEFORE the first domain-modeling action — question, fact-lookup, or write; not merely before the first doc write.

Target = the current repo, unless an **explicit signal** names another repo. Signals (detecting them requires no registry read):

1. The user names a repo by slug or path.
2. The **primary artifact under work** — the issue, PR, plan doc, or wayfinder map being grilled — belongs to a visible owner/repo that is not the current repo. A repo merely *mentioned* in conversation is NOT a signal. If several artifacts are in play, the one the user's latest instruction acts on is primary.
3. A wayfinder map's `## Notes` names a target repo.

Only after a signal fires, resolve the local clone: the AFK registry (`.agents/afk-pipeline/REGISTRY.md`) if present, else known checkout roots (`~/dev/code/<repo>`), else **ask**. Never silently fall back to the current repo when a signal named a repo you can't resolve.

Safe default in orchestration dirs: if the session sits in a profile/orchestration workspace rather than the artifact's own repo and no signal has fired, ask for the target instead of assuming the current repo — a profile dir is almost never where domain docs belong. Exception: when the domain doc under work is the profile's own glossary, the profile IS the target.

Announce the resolution before the first question ("Maintaining the domain model for `<repo>` at `<path>`" / "…for the current repo") and treat it as a confirmation point — proceed only if the human doesn't contradict it.

When the target is NOT the current repo, this resolution re-orients the whole session:

- For the remainder of the session, ALL codebase exploration, fact-lookup, and cross-referencing — including questions a `/grilling` session answers by exploring — happens against the TARGET's clone and docs.
- ALL documentation writes — `CONTEXT.md`, `docs/adr/` — go to the target repo. Never write domain docs to the repo the session merely sits in.
- Nothing needs installing in the target: `CONTEXT.md` and `docs/adr/` are plain files; create them lazily as usual.
- Commit the doc updates in the target repo (following its conventions) as the session ends.

</target-repo>

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `CONTEXT.md` for vocabulary is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
