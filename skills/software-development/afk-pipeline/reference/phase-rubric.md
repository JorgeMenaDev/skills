# Phase rubric — predicted diff shape → Pipeline Flags

## Verify Profile definitions

- **full** — the repo's complete viewport/locale sweep (its verify prompt's default).
- **slim** — two viewports (desktop 1440×900 + mobile 390×844 unless the repo's registry row overrides) and only the locales the diff touches. QA Evidence still committed by a fresh-session agent.
- **off** — no browser run at all; the implement phase's lint+build gate is the entire check. Allowed **only** when nothing renders. The PR then carries no QA Evidence, and write-pr must degrade honestly: "verify skipped by design: <reason>" — never reference evidence that doesn't exist.

## Review flag definitions

- **on** (default) — advisory second-model review of the branch diff after implement, before verify; findings get a fix-or-justify disposition pass committed to the branch. Advisory: never fails the run.
- **off** — skip the review + disposition steps. For tiny/mechanical diffs (dep bumps, copy tweaks, one-liner fixes) where reviewing costs more than reading the diff.
- **Engine:** codex, always, on every repo and lane — the review's value is a *different vendor* than the implementer. Override to `review-engine: claude` only when codex genuinely can't run the task (runner without codex and the review still matters more than vendor diversity) — name the reason in the flag line. A runner missing the engine skips the review loudly; that's preferable to a silent same-vendor review.

## The table

| Predicted diff shape | verify | recap |
|---|---|---|
| Zero runtime surface: docs, comments, non-rendered config | off | off |
| Renders somewhere, trivial: copy swap with unchanged markup, single-component styling tweak | slim | off if the raw diff is readable in one screen, else on |
| Layout, locale structure, navigation, state, anything responsive | full | on |
| New feature, multi-file change, schema/API change | full | on |

## Rules

- **Renders anywhere ⇒ at least slim.** No exceptions — if it's worth a screenshot, it's worth slim.
- `verify: off ⇒ recap: off` as the starting suggestion (overridable).
- `review: off` pairs naturally with `recap: off` — both mean "the raw diff is the best review surface". A diff big enough for a recap is big enough to review.
- Recap defaults **on** — it is the primary review surface for real features. Turn it off only when a recap can't beat reading the raw diff (a few lines).
- **The frame trap: task framing lies.** Worked example — a task framed "replace the hero logo strip copy" actually required responsive layout decisions across four viewports and locale-file restructuring; "copy-only → skip verify" would have shipped unverified mobile layout. Predict the diff, don't parse the title. When in doubt, escalate one level.
- The flag decision is a **recommendation the user confirms**, never an auto-decision; its reason ships in the brief where the PR reviewer can see it.
