# Ledger — Durable Incident Record

Default: GitHub issues via `gh`, on the repo from `git remote -v`. If the handles doc names another tracker, adapt these templates to it — the sections are the contract, not the CLI.

## Search Before Creating

```bash
gh issue list --repo <owner>/<repo> --state all --search "<alert-short-id> OR <numeric-id> OR <culprit>"
```

- Open match → add an evidence comment.
- Closed match with a newer event after the close/fix time → reopen with a regression comment.
- No match → create.
- One issue per alert grouping, unless evidence proves independent root causes share a grouping — then split and cross-link.
- Several groupings, one user journey or root cause → one issue listing every alert ID; do not open near-duplicate issues per grouping.

The issue body uses the latest-event data captured during alert inspection; the evidence pass adds a comment afterward — do not wait for the evidence pass to create the issue.

## Create

```bash
gh issue create --repo <owner>/<repo> --title "[<alerting-surface>] <short symptom>" --body-file <body.md> --label bug
```

Body sections:

- Alert ID and URL
- First seen / last seen, event count
- Environment and release
- Affected route, function, or component
- Impact assessment
- Latest event evidence

## Evidence Comment

After the evidence pass:

- Evidence summary
- Timeline with absolute timestamps
- Root cause assessment with confidence
- Ruled-out hypotheses
- Recommended actions
- Commands run (sanitized)

## Regression Comment

On reopen:

- New event timestamp, release, environment
- Why it is the same root cause as the original
- If the root cause differs despite the same grouping → new issue, cross-link both.

## Close Comment

After a fix:

- Root cause
- Fix commit hash
- Verification commands and results
- Deploy status
- Alert resolution reference

Do-not-fix branch: root cause, why no repo action is needed (stale on current code, noise, operational), the evidence basis, and the alert resolution reference. Omit fix/deploy fields.

## Alert Side

- Resolve the alert after the fix ships — in the deployed release when release tracking is trustworthy; otherwise after push/deploy, noting that recurrence detection depends on the alerting surface regressing the grouping plus this ledger.
- When the alerting CLI lacks a resolve subcommand, fall back to the API. Sentry example (token from the handles doc, never echoed):

  ```bash
  curl -X PUT -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    "https://sentry.io/api/0/organizations/<org>/issues/<numeric-id>/" \
    -d '{"status":"resolved"}'   # or "resolvedInNextRelease", "ignored"
  ```
- Ignore only intentional, non-actionable noise — and document why in the ledger before closing.
- Always put alert IDs in the ledger body, and the ledger URL on the alert when the CLI/API supports notes; otherwise record the resolution command in the ledger.
