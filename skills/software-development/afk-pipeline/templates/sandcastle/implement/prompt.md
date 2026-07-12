# TASK

Implement issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

You are on branch `{{BRANCH}}`, already created from `{{BASE_BRANCH}}`.
The approved Agent Brief is injected below; it is the complete contract for this
run. Do not use GitHub credentials or fetch issue comments.

# AGENT BRIEF

{{ISSUE_BODY}}

# CONTEXT

{{ORIENTATION_MD}}

# EXECUTION

Your job is to translate the Agent Brief into code. VERIFICATION IS NOT
YOUR JOB — a separate Verify phase (fresh session, after you) measures the
acceptance criteria in a real browser and produces the evidence.

- Keep the change minimal and consistent with the surrounding code's style.
- Your gate before committing is a single `{{IMPLEMENT_GATE}}`{{IMPLEMENT_GATE_NOTE}}.
  Make it pass once; do not re-run it after a no-code-change step.
- Browser use: only as a development aid while building (e.g. look at the
  element you're changing, one viewport). Do NOT measure acceptance criteria,
  do NOT take screenshots, do NOT touch the evidence directory — all of that
  duplicates the Verify phase. Kill any dev server you start.

{{CONVEX_RULES}}

{{RETRY_CONTEXT}}

# COMMIT

Make one or more git commits on `{{BRANCH}}`. Use conventional-commit
messages (`feat:`, `fix:`, `refactor:`, `docs:`).

Do not close the issue. Do not push.
