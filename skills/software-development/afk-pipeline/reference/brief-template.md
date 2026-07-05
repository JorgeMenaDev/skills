# Agent Brief template + Pipeline Flags contract

## Issue body skeleton

```md
## Goal
<one paragraph — what exists after the merge that doesn't exist now>

## Constraints
- <hard boundaries: files not to touch, patterns to follow, no new deps, …>

## Acceptance criteria
- [ ] <verifiable in a browser or shell by an agent with no other context>
- [ ] <…>

### Pipeline
verify: full|slim|off — <reason>
recap: on|off — <reason>
review: on|off — <reason>
review-engine: codex|claude — <only when overriding the codex default; omit otherwise>

## Notes
<pointers: relevant files, prior art, known gotchas>
```

Acceptance criteria are the verify phase's script — write each one as something an agent can check and screenshot, not an intention. If a criterion can't be checked without human judgment, it belongs in Notes, not criteria.

## Pipeline Flags parse contract

Each repo's workflow implements this parser; the skill only authors the section.

- Heading: `### Pipeline` (parser may accept `## Pipeline` too). Keys `verify:`, `recap:`, `review:`, `review-engine:`, one per line; the value ends at an optional ` — reason` suffix.
- **Fail-safe:** absent section, unknown key, or unparseable value ⇒ that flag falls back to its default (`verify: full`, `recap: on`, `review: on`, `review-engine: codex`). Parsing can only reduce work when the body explicitly and legibly says so.
- The workflow **echoes the parsed flag set** in its first issue comment; if the echo mismatches intent, fix the body and retrigger — the label re-read picks up the same body.
- `slim` reaches the verify phase as env (`VERIFY_VIEWPORTS`, `VERIFY_LOCALES`) into a single parameterized verify prompt — one prompt template per repo, never per-profile prompt forks.
- `verify: off` skips the verify step entirely and sets a degrade mode consumed by write-pr and the completion comment.
- `review: on` (default) runs an advisory second-model review of the branch diff between implement and verify (vendored `autoreview` skill). Findings trigger a disposition pass that fixes real blockers or rejects with rationale (table committed to the evidence dir). `review: off` for tiny/mechanical diffs where a second model can't beat reading the code.
- `review-engine: codex` (default, everywhere) — the reviewer must be a different vendor than the implement agent. **No silent fallback:** if the runner lacks the requested engine, the review is loudly skipped (`skipped_no_engine` note on the issue), never quietly swapped to another engine. `review-engine: claude` is the only way to run a claude review (autoreview `--safe-mode`) — an explicit, per-task override with a stated reason.
