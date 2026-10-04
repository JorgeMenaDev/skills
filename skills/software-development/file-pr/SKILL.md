---
name: file-pr
description: Use when opening a pull request, writing or rewriting a PR title or description, or marking a draft PR ready for review.
version: 2.0.0
mutating: true
writes_to: [pull-requests]
metadata:
  credits:
    - idea: "Summary as the smallest visual; one-way or two-way door"
      skill: pr
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/pr"
---

# File PR

A PR has three readers: the person who asked for the change, the reviewer, and whoever ships it to production days later. Write for all three.

Before filing, check whether a PR for this branch already exists, and read the diff against the base branch to confirm it matches the goal you were given. The repo's `AGENTS.md` (or `CLAUDE.md`) names who owns which steps, where secrets live, and how reviews run; where it is silent, use roles ("whoever deploys").

## Title

Titles usually become commit messages, so follow the repo's conventions: read recently merged PRs and the git log for the shape. Say why the change matters, not what you touched.

- BAD: `perf(server): negotiate permessage-deflate on the websocket`
- GOOD: `perf(server): cut websocket frame size by 70% with gzipping`

## Description

1. **Problem**, in the requester's words, then the solution in a sentence or two. An implementation inventory is the failure mode: the reviewer can read the diff, nobody can read your reasoning.
   - BAD: "Removed implicit workspace carry-over from every new-thread entry point. Deleted `buildContextualThreadOptions`."
   - GOOD: "My 'new worktree' default was ignored when starting a thread on an existing worktree. Now your preferences always apply."
2. **Summary**, only when the change has a shape worth seeing: the smallest visual that makes it clear (pseudocode, a call tree, a shallow file tree, a `diff` sketch of that tree, or Mermaid). One visual usually suffices.
3. **Evidence**: before and after. A screenshot for a visual change; otherwise the exact command, test or output that failed before and passes now.
4. **Ship checklist** (below).

**Deleting rules from docs or agent instructions?** For each deleted rule, grep the repo for its key term and say where it now lives, or that it was dropped on purpose. A rule with no other home is a lost guardrail, and "now lives in X" is a claim the reviewer will trust without checking.

## Ship checklist

Every PR body carries this section, because the point is having asked. Merging is not shipping: schema, secrets and data move on their own schedule, and the person deploying later has no memory of this diff.

Read your own diff and check each trigger:

| The diff has | The checklist gets |
| --- | --- |
| a new env var read anywhere | set it in every deploy target, naming where the value lives |
| a schema change or migration | run it: before or after the deploy, and what in-flight traffic sees in the gap |
| a field whose meaning changed for existing rows | a backfill, with the expected row count |
| a new external service, API key, webhook or OAuth app | configure it, naming where the secret lives |
| a feature flag | who flips it, when, and the default until then |
| a cron or scheduled job | register it, naming the scheduler |
| assumed infra: a queue, bucket, index or table | create it |
| a changed cached or CDN-served asset | the invalidation |

Two items are unconditional: one **smoke** step (what to do in production and the result to expect) and the **rollback**, which names the door: _two-way_ (a revert undoes it) or _one-way_ (data deleted, messages sent, a migration without a down-step), with what a one-way door costs. Every item names its owner and its order.

```markdown
## Ship checklist

- [ ] **Before merge — release owner** · set `RESEND_WEBHOOK_SECRET` in production (value in the team's secret store)
- [ ] **After deploy — release owner** · run `migrations:backfillThreadOwner` in production, ~4.2k rows
- [ ] **Smoke — release owner** · open /threads, wake a thread, confirm it settles
- [ ] **Rollback** · two-way door: revert this PR; the migration is additive
```

When the change genuinely ships on merge alone, say so and why. An empty section reads as forgotten; `None: copy change only, no env or data touched` reads as checked.

## Filing

Open a real PR, not a draft, so review bots run. A draft is for a branch still taking commits; it becomes real the moment the work is done.

## Validate, review, then clean up

1. **Validate.** For a UI change, drive it in the running app before review and put what you saw in Evidence.
2. **Review.** Run the repo's `code-review` skill (or its documented review step) with the base branch as the fixed point and the PR's issue or spec as the spec. Fix or answer every finding, then post the result as one PR comment naming the reviewed head SHA. Commits pushed after that are reviewed from that SHA before merge. Address real shortcomings; keep review feedback inside the PR's original goal.
3. **Clean up.** Keep the worktree until the PR merges, pushing at every checkpoint. When it merges or closes, stop any runtime it started and remove the worktree.
