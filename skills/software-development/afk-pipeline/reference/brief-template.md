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
recap: on|off — <always stamped; `off` unless the requester asked for a recap>
review: on|off — <reason>
recording: on|off — <EXPERIMENTAL; always stamped; `off` unless the requester explicitly asked for recorded proof>
engine: claude|codex|cursor|grok — <always stamped by the dispatcher; use `engine: claude — override ignored: <reason>` when applicable>
review-engine: codex|claude — <only when overriding the cross-vendor default; omit otherwise>

## Notes
<pointers: relevant files, prior art, known gotchas>
```

Acceptance criteria are the verify phase's script — write each one as something an agent can check and screenshot, not an intention. If a criterion can't be checked without human judgment, it belongs in Notes, not criteria.

**The executor sees only the repo's git snapshot.** All three lanes run from a fresh clone: gitignored paths (operator reports/evidence, local env files, `.agents/operator/`), other repos, and the requester's machine state do not exist there. Never write a constraint or STOP clause that keys on such a file — the executor will hit the STOP every time and the run is lost (an acredix run burned on a gate reading an operator report that lives outside the snapshot, 2026-07-08). Resolve external gates yourself before labeling and state the resolved fact in the brief ("pre-condition CONFIRMED <date> by requester: <evidence summary>"); the brief carries conclusions about the outside world, never pointers into it.

## Pipeline Flags parse contract

Each repo's workflow implements this parser; the skill only authors the section.

- Heading: `### Pipeline` (parser may accept `## Pipeline` too). Keys `verify:`, `recap:`, `review:`, `recording:`, `engine:`, `review-engine:`, one per line; the value ends at an optional ` — reason` suffix.
- **Fail-safe:** absent section, unknown key, or unparseable value ⇒ that flag falls back to its default (`verify: full`, `recap: on`, `review: on`, `recording: off`, `engine: claude`, `review-engine: codex`). Parsing can only reduce work when the body explicitly and legibly says so; recording stays opt-in because it can capture sensitive UI.
- **Recap is opt-in at authoring time** (2026-07-10): the dispatcher stamps `recap: off` on every brief unless the requester explicitly asked for a recap. Because the deployed parsers' fail-safe default is still `recap: on`, the line must never be omitted — leaving it out re-enables the recap.
- The workflow **echoes the parsed flag set** in its first issue comment; if the echo mismatches intent, fix the body and retrigger — the label re-read picks up the same body.
- `slim` reaches the verify phase as env (`VERIFY_VIEWPORTS`, `VERIFY_LOCALES`) into a single parameterized verify prompt — one prompt template per repo, never per-profile prompt forks.
- `verify: off` skips the verify step entirely and sets a degrade mode consumed by write-pr and the completion comment.
- `recording: on` is experimental. It records the primary browser flow and publishes a 30-day Actions artifact plus an inline GIF preview. `agent-browser record start` creates a fresh context, so briefs must put visible URL navigation and scrolling after recording begins. V1 supports the cloud and Vercel Sandbox lanes only; it is incompatible with `verify: off`. Stamp `recording: off` unless the requester explicitly asks for video proof; read [experimental-recording.md](experimental-recording.md) before recommending it.
- `review: on` (default) runs an advisory second-model review of the branch diff between implement and verify (vendored `autoreview` skill). Findings trigger a disposition pass that fixes real blockers or rejects with rationale (table committed to the evidence dir). `review: off` for tiny/mechanical diffs where a second model can't beat reading the code.
- `engine: claude` (default) runs the four agent phases on Claude. `engine: codex` runs implement, review-fix, verify, and write-pr on Codex gpt-5.6-luna high with ChatGPT-subscription auth. `engine: cursor` runs implement only on Cursor Agent CLI, then keeps review-fix, verify, and write-pr on Claude because Cursor sessions are non-resumable and structured-output retry needs resume. Cursor v1 is cloud-lane only (`agent:implement`), requires the repo secret `CURSOR_API_KEY`, defaults to model `grok-4.5-xhigh`, and honors a `CURSOR_MODEL` env override. `engine: grok` (v2.12.0) runs implement only on the Grok Build CLI headless (native xAI; model `grok-4.5` / effort `high` defaults, `GROK_MODEL`/`GROK_EFFORT` Actions-var overrides), then keeps review-fix, verify, and write-pr on Claude; Grok sessions are resumable (`-s`/`-r`), so all-four-phases parity is a permitted later expansion. Grok v1 is cloud-lane only (`agent:implement`) and requires the repo secret `GROK_AUTH_B64` (base64 of the dispatch host's `~/.grok/auth.json`, re-cut at dispatch like `CODEX_AUTH_B64`); consumers still on a pre-2.12.0 parser fail-safe a grok stamp back to claude — regen first. Recap remains Claude. New briefs always stamp `engine:`; if the override is ignored, stamp `engine: claude — override ignored: <reason>` so the durable brief records the decision.
- `review-engine` defaults cross-vendor: default `engine: claude` pairs with `review-engine: codex`; `engine: cursor` and `engine: grok` follow that same default; `engine: codex` plus absent/default `review-engine` resolves to `review-engine: claude`. Key this resolution on `review_engine_status == default`, not the value, because old briefs may explicitly carry `review-engine: codex`. **No silent fallback:** if the runner lacks the requested engine, the review is loudly skipped (`skipped_no_engine` note on the issue), never quietly swapped to another engine.
- Codex-stamped briefs never overflow to a codex-incapable lane, Cursor-stamped briefs never overflow to docker or sandbox lanes, and Grok-stamped briefs never overflow to docker or sandbox lanes (cloud-only in v1). Queue them, or re-cut the brief as `engine: claude — override ignored: <reason>` before labeling.
