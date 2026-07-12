# Canon template (v0 Design Systems 2.0 shape)

The shape mirrors how v0 encodes an imported design system — rules the agent follows, references it reads to verify every build — adapted from a hosted skill to repo-owned docs so every agent and human gets them for free.

```
DESIGN.md            # the rules — ≤100 lines, the only file an agent MUST read
design/
  foundations.md     # tokens: colors, type, radius, spacing, dark mode — each sourced
  components.md      # primitive index: path + one-line purpose + key variants
  patterns.md        # page/shell/form/empty-state patterns, each with exemplar paths
  drift.md           # living backlog: legacy surfaces + violations found during builds
```

## DESIGN.md skeleton

```md
# <Repo> Design Canon
<North-star sentence: the named canonical language and its signature.>

## Rules
- <Rule> — source: <path>            # color, type, radius, motion, copy rules
- Verify against source: before using any component/token/icon, Read its
  source in <components dir>; never invent props, tokens, or icon names.
- Compose from primitives indexed in design/components.md; a new hand-rolled
  pattern is drift — extend a primitive or log it in design/drift.md.

## Legacy (do not copy from)
- <surface/dir> — <language name>, migration tracked in design/drift.md
```

Rules carry their *why* only when it changes behavior. If a DESIGN.md already exists, merge into its structure — keep its voice, add missing sources, move sprawl into `design/`.

## drift.md skeleton

```md
# Drift backlog
| Surface | Language found | Canon target | Effort | Impact |
|---|---|---|---|---|

## Build-time violations (append-only)
- <date> <path> — <one-line violation>
```

## Wiring line (AGENTS.md / CLAUDE.md)

> UI work: read `DESIGN.md` first; verify components/tokens/icons against their source files; log violations to `design/drift.md`.
