---
name: design-system-keeper
description: Extract, encode, and enforce a repo's real design system as an agent-readable canon (v0 Design Systems 2.0 shape). Use when the user wants agents to learn or import their design system, asks why pages look inconsistent or like different design systems mixed together, wants a design consolidation or cleanup, or when building UI in a repo that has a canon (`design/` + DESIGN.md).
version: 0.2.2
license: MIT
mutating: true
writes_to: [DESIGN.md, design/, AGENTS.md, CLAUDE.md]
---

# Design System Keeper

> **🚧 In progress — capture reusable feedback.** When a run reveals an improvement to this skill, record it in the run's handoff. Contribute that improvement to the upstream repository only when the user explicitly authorizes external repository changes in the current task.

A repo's **canon** is its design system encoded for agents: rules that cite real source files, an index of the repo's real primitives, and a verify-against-source discipline. UIs rot when each contributor (human or agent) builds from memory — three design systems end up mixed on one site. The keeper extracts the canon once, keeps it true, and makes every build compose from it.

## Contract

1. **Every canon rule cites a real file.** A rule without a `path:line`-level source is a guess — source it or delete it.
2. **Verify against source.** Before using any component, token, or icon: Read its source — the prop exists, the token resolves, the icon is exported. Composing a lookalike from memory is the exact failure this skill exists to prevent.
3. **One canon.** If design docs already exist (DESIGN.md, brand guides), upgrade them in place. Writing a second, competing document destroys the single source of truth.
4. **Cleanup is a backlog, not a bulk edit.** Setup produces `design/drift.md`; refactors run later as scoped passes the user picks.

## State

```bash
[ -f DESIGN.md ] && echo "CANON_DOC: yes" || echo "CANON_DOC: no"
[ -d design ] && ls design/*.md >/dev/null 2>&1 && echo "CANON_REFS: yes" || echo "CANON_REFS: no"
git rev-parse --show-toplevel 2>/dev/null && echo "REPO: yes" || echo "REPO: no"
```

- `CANON_REFS: yes` and the task is building or reviewing UI → **Build**.
- `CANON_REFS: yes` and the user asks to audit, consolidate, or update the system → **Re-sync**.
- `CANON_REFS: no` → **Setup**. (`CANON_DOC: yes` means docs exist to adopt — Contract §3.)

## Setup

1. **Extract.** Fan out read-only subagents per [references/extraction.md](references/extraction.md): tokens/theming, component inventory, page patterns, and surface census (which routes/pages use which visual language). Completion: every UI surface in the repo is attributed to a named visual language, with file paths — including the ugly ones.
2. **Interview.** Where extraction found more than one visual language, ask the user which is canonical (show concrete route/file examples of each). Ask only what extraction could not decide: canonical language, surfaces exempt from the canon (e.g. legacy embeds), naming. Completion: every non-canonical language is marked *legacy* by the user, not by you.
3. **Encode.** Write the canon in the v0 shape using [references/canon-template.md](references/canon-template.md): `DESIGN.md` (the rules, ≤100 lines) + `design/foundations.md`, `design/components.md`, `design/patterns.md`, `design/drift.md`. Upgrade existing docs in place (Contract §3). Completion: every rule and every indexed primitive carries a real path, spot-checked by Reading 3 cited files.
4. **Wire.** Point the repo's agent entrypoints (AGENTS.md / CLAUDE.md) at the canon: one line — read `DESIGN.md` before UI work, verify against source. Completion: a fresh agent session in this repo would load the canon without being told.
5. **Report drift.** `design/drift.md`: each legacy surface, its language, effort to migrate, ordered by user-facing impact. STOP — do not start migrating. Mass-refactoring on setup enthusiasm, before the user has picked a slice, is the failure this gate prevents. Hand the backlog to the user.

## Build

1. Read `DESIGN.md` and the `design/` reference that covers the surface you're changing.
2. Compose from the indexed primitives; verify each against source (Contract §2) before first use in this change.
3. New pattern with no primitive? Extend the nearest primitive or flag it — a one-off hand-roll is new drift.
4. Before finishing: anything you touched that contradicts the canon goes into `design/drift.md` (append, one line each).

## Re-sync

Re-run the extraction subagents; diff findings against the canon. Update references where source moved; append new drift; report rules whose cited files no longer exist. Completion: every canon citation resolves again.

## Output format

End every run with: `DONE | DONE_WITH_CONCERNS | BLOCKED` + one line of evidence (Setup: canon files written + drift count · Build: primitives verified + drift appended · Re-sync: citations fixed/broken).
