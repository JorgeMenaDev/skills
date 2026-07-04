# TASK

Write the title and description for a pull request that closes issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}.

The implementation AND its e2e verification are already done — commits sit
on branch `{{BRANCH}}`. You are NOT implementing anything. You are NOT
running tests. You are summarising work that already exists.

# CONTEXT

Read the issue:

```
gh issue view {{ISSUE_NUMBER}} --json title,body,comments
```

Read what changed on the branch:

```
git log {{BASE_BRANCH}}..{{BRANCH}} --reverse
git diff {{BASE_BRANCH}}..{{BRANCH}} --stat
git diff {{BASE_BRANCH}}..{{BRANCH}}
```

If the diff is large, focus on the commit messages and the `--stat`
summary; only `git diff` specific files when a commit message is unclear.

# VERIFY PROFILE

The Verify Profile for this run is `{{VERIFY_MODE}}`.

- If it is `full` or `slim`: the verify phase ran and committed QA Evidence.
  Read `{{EVIDENCE_DIR}}/issue-{{ISSUE_NUMBER}}/report.md`
  (committed on the branch) — the description must tell the reviewer it
  exists and what it shows.
- If it is `off`: **verify was skipped by design** (reason:
  "{{VERIFY_REASON}}"). There is NO QA Evidence directory for this run — do not
  read it, do not reference screenshots, and do not claim any browser
  verification happened.

{{WRITE_PR_OUTPUT_MD}}
