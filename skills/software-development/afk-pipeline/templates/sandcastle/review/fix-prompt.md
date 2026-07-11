# TASK

A second-model code review of branch `{{BRANCH}}` (issue #{{ISSUE_NUMBER}}) produced
findings. Triage every finding, then either FIX it or REJECT it with a rationale.
Findings are advisory input, not orders — a reviewer can be wrong about scale,
intent, or repo conventions.

# FINDINGS

{{FINDINGS}}

# RULES

- For each finding, decide: **fix** (blocker/major correctness, security, or
  reliability issues that are real) or **reject** (false positive, out of scope
  for the brief, or not meaningful at this repo's scale — one-line rationale).
- Fixes must stay surgical and inside the brief's scope. Never widen the diff
  to satisfy style opinions.
- Re-read the approved Agent Brief injected below — a finding that contradicts
  an explicit brief constraint is rejected; the brief wins. Do not use GitHub
  credentials or fetch issue comments.
- After any fix, your gate is `{{IMPLEMENT_GATE}}` — make it pass once.

# AGENT BRIEF

{{ISSUE_BODY}}

# RECORD DISPOSITIONS

Write `{{EVIDENCE_DIR}}/issue-{{ISSUE_NUMBER}}/review.md` (create dirs as
needed) with one row per finding:

| # | Finding (one line) | Severity | Disposition | Why |
|---|---|---|---|---|

# COMMIT

Commit code fixes and the dispositions file on `{{BRANCH}}` (conventional
message, e.g. `fix: address second-model review findings (#{{ISSUE_NUMBER}})`).
If every finding is rejected, commit only the dispositions file. Do not push.
