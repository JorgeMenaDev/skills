# Phase rubric — predicted diff shape → Pipeline Flags

## Verify Profile definitions

- **full** — the repo's complete viewport/locale sweep (its verify prompt's default).
- **slim** — two viewports (desktop 1440×900 + mobile 390×844 unless the repo's registry row overrides) and only the locales the diff touches. QA Evidence still committed by a fresh-session agent.
- **off** — no browser run at all; the implement phase's lint+build gate is the entire check. Allowed **only** when nothing renders. The PR then carries no QA Evidence, and write-pr must degrade honestly: "verify skipped by design: <reason>" — never reference evidence that doesn't exist.

## Review flag definitions

- **on** (default) — advisory second-model review of the branch diff after implement, before verify; findings get a fix-or-justify disposition pass committed to the branch. Advisory: never fails the run.
- **off** — skip the review + disposition steps. For tiny/mechanical diffs (dep bumps, copy tweaks, one-liner fixes) where reviewing costs more than reading the diff.
- **Implementation engine:** `engine: claude` by default. Stamp `engine: codex` only when the dispatcher has confirmed the chosen lane can run Codex; stamp `engine: cursor` only for the cloud lane with `CURSOR_API_KEY` configured. Cursor v1 runs implement only on Cursor Agent CLI (`grok-4.5-xhigh` by default, `CURSOR_MODEL` override), then leaves review-fix / verify / write-pr on Claude because Cursor sessions are non-resumable. Stamp `engine: grok` (Grok Build CLI, `grok-4.5` high, implement-only, v2.12.0) only for the cloud lane on a consumer regenerated to ≥2.12.0 with `GROK_AUTH_B64` set — older parsers fail-safe it to claude. Otherwise stamp `engine: claude — override ignored: <reason>`.
- **Review engine:** opposite vendor by default. Claude implementation pairs with Codex review; Cursor and Grok follow the Claude default; Codex implementation pairs with Claude review when `review-engine` is absent/default. Override only with a stated reason. A runner missing the requested engine skips loudly; that's preferable to a silent same-vendor review.

## The table

| Predicted diff shape | verify | recap |
|---|---|---|
| Zero runtime surface: docs, comments, non-rendered config | off | off |
| Renders somewhere, trivial: copy swap with unchanged markup, single-component styling tweak | slim | off |
| Layout, locale structure, navigation, state, anything responsive | full | off (on only if requested) |
| New feature, multi-file change, schema/API change | full | off (on only if requested) |

## Rules

- **The Convex integrity gate is not a flag.** On repos with `convexDir` configured it always runs (real codegen + anonymous schema validation, fail-the-run on `_generated` divergence) — no brief line can turn it off, and briefs never need to ask for it.
- **Renders anywhere ⇒ at least slim.** No exceptions — if it's worth a screenshot, it's worth slim.
- **Recap is opt-in** (2026-07-10, Jorge's ruling): stamp `recap: off` on every brief unless the requester explicitly asked for a recap on that task. The deployed parsers' fail-safe default is still `recap: on`, so the explicit `recap: off` line must never be omitted — an absent flag turns the recap back on.
- **Recording is experimental and opt-in:** stamp `recording: off` unless the requester explicitly asks for video proof. `recording: on` requires browser verify and, in v1, a hosted cloud or Vercel Sandbox lane. Read [experimental-recording.md](experimental-recording.md) before recommending it.
- When the requester does ask for a recap, stamp `recap: on — requested` and move on; no rubric judgment needed.
- **The frame trap: task framing lies.** Worked example — a task framed "replace the hero logo strip copy" actually required responsive layout decisions across four viewports and locale-file restructuring; "copy-only → skip verify" would have shipped unverified mobile layout. Predict the diff, don't parse the title. When in doubt, escalate one level.
- The flag decision is a **recommendation the user confirms**, never an auto-decision; its reason ships in the brief where the PR reviewer can see it.
