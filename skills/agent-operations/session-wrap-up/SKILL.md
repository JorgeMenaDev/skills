---
name: session-wrap-up
description: "Wrap up the session and update all documentation. Use when the user says 'wrap up', 'update the documentation', or is ending a work session."
disable-model-invocation: true
version: 1.0.0
mutating: true
writes_to: ["Second Brain vault", "GitHub issues touched this session", "matter records under organization/admin-matters/"]
---

# Session Wrap-Up

End a work session by persisting its outcome in every place that would otherwise go stale. Keep it simple: four update targets, then verify, commit, report.

## Steps

1. **Second Brain.** Append a dated, attributed entry to `vault/daily/YYYY-MM-DD.md` and update the domain note(s) the work touched (e.g. [[Immigration]]), plus any new facts to [[INDEX]]. Same pass, additive, `author: matias` on new notes.
2. **Trackers.** Reconcile every GitHub issue touched: update bodies where state changed, close what's done, post a `## Triage Notes` comment with `### Established` and `### Needs from Jorge` items.
3. **Matter records.** Update `organization/admin-matters/*/README.md` evidence trails and next-action checkboxes for any matter the session advanced.
4. **Verify.** State what changed and check nothing sensitive (passwords, NI numbers, document images) leaked into issues or the vault.
5. **Commit and push.** Prefix commits with the surface: `vault:` for the Second Brain, `matter:` for admin-matter records. Leave the repo clean and pushed.
6. **Report.** Give a 3-line outcome summary: what happened, what's documented where, and what is waiting on Jorge.

## Completion

Every changed surface is committed and pushed, nothing sensitive was written to GitHub or the vault, and the report names the open next actions.
