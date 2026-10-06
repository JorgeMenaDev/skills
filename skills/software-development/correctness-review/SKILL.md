---
name: correctness-review
description: Hunt behaviour bugs in a diff with one reviewer on a different model from the builder. Use when a pull request changes logic, error handling, stored data, retries, caches, workflows or schema, or the user says "correctness review".
version: 1.0.1
metadata:
  credits:
    - idea: "Rubric lenses, severity scale and lead judgment; the signal comes from model diversity"
      skill: interrogate
      author: Lauren Tan (pstack, MIT)
      url: "https://github.com/cursor/plugins/tree/main/pstack/skills/interrogate"
---

# Correctness review

`code-review` asks whether the change follows the repo's rules and its spec. This skill asks one question: **what makes this change give a wrong result?** Run it after `code-review`, on the head you intend to merge.

## Steps

1. **Pin the diff.** Name the base and the head SHA; the diff is `git diff <base>...<head>`. Done when the diff is non-empty and both are written down.
2. **List the failure paths.** Write the change's intent in one paragraph. Then list every place the diff touches where something can fail: a read that can error or come back empty or partial, a write that can half-apply, a retry, a cache, a queue or workflow step, an external call, and any stored data, schema or step argument that running work still depends on. Done when every changed function that does I/O is on the list or marked pure. A diff with none (docs, copy, styling, a pure rename) ends here: report "no failure paths, review skipped".
3. **Dispatch one reviewer**, read-only, on a different model from the one that wrote the code. The repo's definition of done or agent docs name the lane; in T3 Code it is `delegate_task` with role `review`. With no second model in reach, use one fresh sub-agent that has none of the builder's context, and say so in the report. Give it the intent, the diff command, the failure-path list and [RUBRIC.md](RUBRIC.md), and tell it to look hard for real bugs. Done when its findings are back.
4. **Judge each finding.** Open the code it cites. Keep a finding you can trace to a line or reproduce. Dismiss one only by showing the path cannot happen, and write that reason down. Done when every finding is kept or dismissed with a reason.
5. **Report** in one PR comment naming the reviewed head SHA, under **Must fix**, **Fix or answer** and **Dismissed**. Done when every must-fix finding is fixed and every other kept finding is fixed or answered on the PR. A commit after the reviewed SHA gets a fresh run before merge.

## Severity

The definition decides, never the reviewer's mood or how rare the case is. A review tool with its own labels (critical, high, medium, low) maps by the definition too: its critical and high findings are must fix, and so is a medium one that meets the must-fix definition.

- **Must fix**: the code can give a wrong result, lose or corrupt data, open a security hole, or break work that is already running.
- **Fix or answer**: nothing is wrong today, and the change will cause pain: a missing test for a real path, a fragile assumption, cleanup that never runs.
- **Nit**: style and naming. Leave these to `code-review`.

A real pair from one review:

- BAD: "NON-BLOCKING. A workflow that ran this step before the deploy fails with `Journal entry mismatch`. The window is narrow."
- GOOD: "Must fix. Workflows in flight at deploy fail on replay (`documentIntakeEvidenceWorkflow.ts:416`): the step's arguments changed. Version the workflow and keep the old arguments until existing runs drain."

## Incomplete is never clean

A failed, empty or partial read is retried or marked incomplete. It never becomes "checked, nothing there". This one mistake was six of ten findings in the review that created this skill: an unreadable scan stored as "inspected, no signature", a storage 503 stored as "file not found", a half-read document cached as complete.

## One reviewer

One reviewer per run keeps the cost flat. Depth comes from the failure-path list you hand it: a reviewer told exactly where the change can fail finds more than three reviewers told to look around.
