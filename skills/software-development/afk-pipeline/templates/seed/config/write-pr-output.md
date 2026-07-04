# OUTPUT

The description MUST follow the repo's PR template
(`.github/pull_request_template.md` — read it) with these rules:

- The related-issues section contains `Closes #{{ISSUE_NUMBER}}` so the PR
  closes the issue on merge.
- The validation section gives the reviewer concrete steps (route to open,
  what to look at, viewport widths that matter for this change).
- The QA-evidence section:
  - Verify Profile `full`/`slim` → point at the evidence directory for this
    issue and summarize the verify-phase verdict in one line.
  - Verify Profile `off` → write exactly the line
    `verify skipped by design: {{VERIFY_REASON}}` and nothing pointing at
    screenshots or an evidence directory.
- Checklist boxes: tick (`[x]`) only what the pipeline actually verified on
  this branch; leave the rest unticked. Never tick what you didn't see proven.

Once you've read everything, emit a single `<output>` block as the **last thing** in your response:

<output>
{
  "prTitle": "feat: short imperative summary",
  "prDescription": "## Summary\n\n...\n\nCloses #{{ISSUE_NUMBER}}\n\n..."
}
</output>

- `prTitle` must be a single line, under 70 characters, conventional-commit style (`feat:`, `fix:`, `refactor:`, `docs:`).
