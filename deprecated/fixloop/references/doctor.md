# Doctor — First-Run Stack Discovery

Run only when `DEBUGGING.md` is missing from the host repo root. Output: a populated `DEBUGGING.md` the loop can trust. Everything here is read-only except writing the doc itself.

## Probe Order

1. **Repo instructions first.** `AGENTS.md`, `CLAUDE.md`, `.cursorrules` — existing debugging notes, handles, deploy path, verification commands. Reuse what is already written; do not re-derive it.
2. **Stack detection from repo files.** Examples: `vercel.json` / `.vercel` → Vercel; `convex/` or `convex.json` → Convex; `.sentryclirc` or `@sentry/*` deps → Sentry; lockfile → package manager; `fly.toml`, `Dockerfile`, `supabase/`, etc. as found.
3. **CLI probes** (read-only, never print secrets):
   - `gh auth status`
   - `sentry-cli info` (when Sentry detected)
   - `vercel whoami` (when Vercel detected)
   - the stack's own version/status commands for anything else detected
4. **Ledger detection.** `gh repo view` for GitHub. If no tracker is detectable, ask the user once and record the answer in the doc.

## Write DEBUGGING.md

Sections — omit any that are empty:

- **Handles** — org/project/team/scope/deployment identifiers, production URLs, ledger location, MCP servers if any.
- **Known-Good Commands** — commands verified to work, with required flags and working directories.
- **Avoid** — gotchas: commands that leak secrets, hang, need non-obvious flags, or are unsupported by installed CLI versions.
- **Symptom Routing** — table mapping symptom → first surface → second surface.

## Rules

- Never write secret values. Env var names only.
- Record only verified facts (a probe ran, a file exists). Mark anything inferred as unverified.
- Add a pointer line to the repo's agent instructions file so future sessions find the doc.
- The doc is repo-owned and append-only in spirit: every future loop adds the gotchas and verified commands it discovers.
