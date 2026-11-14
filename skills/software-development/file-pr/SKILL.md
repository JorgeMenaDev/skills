---
name: file-pr
description: Use when opening a pull request, writing or rewriting a PR title or description, or marking a draft PR ready for review.
version: 3.0.6
mutating: true
writes_to: [pull-requests]
metadata:
  credits:
    - idea: "Summary as the smallest visual; one-way or two-way door"
      skill: pr
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/pr"
    - idea: "The loop this PR sits in: full-stop, full-send, sol-loop, babysit-pr"
      skill: tstack
      author: Theo Browne
      url: "https://github.com/t3dotgg/tstack"
---

# File PR

A PR has three readers: the person who asked for the change, the reviewer, and whoever ships it to production days later. Write for all three.

Before filing, check whether a PR for this branch already exists, and read the diff against the base branch to confirm it matches the goal you were given. The repo's `AGENTS.md` (or `CLAUDE.md`) names who owns which steps, where secrets live, and where questions go; where it is silent, use roles ("whoever deploys").

## Title

Titles usually become commit messages, so follow the repo's conventions: read recently merged PRs and the git log for the shape. Say why the change matters, not what you touched.

- BAD: `perf(server): negotiate permessage-deflate on the websocket`
- GOOD: `perf(server): cut websocket frame size by 70% with gzipping`

## Description

1. **Problem**, in the requester's words, then the solution in a sentence or two. An implementation inventory is the failure mode: the reviewer can read the diff, nobody can read your reasoning.
   - BAD: "Removed implicit workspace carry-over from every new-thread entry point. Deleted `buildContextualThreadOptions`."
   - GOOD: "My 'new worktree' default was ignored when starting a thread on an existing worktree. Now your preferences always apply."
2. **Summary**, only when the change has a shape worth seeing: the smallest visual that makes it clear (pseudocode, a call tree, a shallow file tree, a `diff` sketch of that tree, or Mermaid). One visual usually suffices.
3. **Evidence**: before and after. A visible change needs screenshots (a GIF for motion), uploaded with the `upload-file` skill: required, not "when they help". Otherwise the exact command, test or output that failed before and passes now. Never put secrets, login links or real people's data in a screenshot.
4. **Decisions**, only when the work settled a real choice: a product rule, a trade-off the requester approved, or something ruled out. One bullet each, with who decided and when. Leave the section out when nothing was decided. A tracker may copy these bullets into a knowledge base, so each must read on its own.
   ```markdown
   ## Decisions
   - Uploaded documents go to the AI as before 7 Oct, with no clinical barrier or masking (Jorge, 11 Oct).
   ```
5. **Ship checklist** (below).

**Deleting rules from docs or agent instructions?** For each deleted rule, grep the repo for its key term and say where it now lives, or that it was dropped on purpose. A rule with no other home is a lost guardrail, and "now lives in X" is a claim the reviewer will trust without checking.

## Ship checklist

Every PR body carries this section, because the point is having asked. First find out whether merging deploys: read where the repo records it (a fleet registry such as `STACK.md`, or the push-to-main workflows and the host's production deployments). When merging deploys, the merge is the release: the PR says so, the smoke step runs right after the merge, and the requester hears it before they merge. Otherwise schema, secrets and data move on their own schedule, and the person deploying later has no memory of this diff.

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
| client code that needs backend code from this same diff, where the two deploy separately | split the PR: backend additions first, the client second, removals last. The client can go live first |

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

## The loop around this PR

This skill writes and files the PR. The loop around it is tstack's `full-stop` (or `full-send`): finish, prove, `sol-loop`, file, babysit. Read those skills. These rules win where they differ:

1. **Prove it locally.** Run the app from the branch and look at the change. Use the PR preview only when the change depends on how it is deployed (env vars, domains, auth realm, the backend deploy) or a person needs a URL.
2. **The review is `sol-loop`, before filing.** Run no other review skill. Work started by `implement-spec` skips that skill's last `code-review` step. The `Reviewed with sol-loop` line goes in the body.
3. **A fresh session verifies, after filing.** An agent that did not write the code (the same model is fine) checks the change with the repo's QA skill and posts one PR comment: `PASS`, `PASS+NOTES`, `FAIL` or `BLOCKED` for the head SHA, with screenshots. Match the check to the diff: a docs- or config-only PR gets a fresh read of the diff, not an app walk. A push that changes behaviour voids the verdict. Only `PASS` or `PASS+NOTES` for the current head, or for an earlier head with the same `git patch-id` (a clean rebase), makes the PR ready. The verdict joins the merge gate in `full-send` (which `full-stop` uses for "Ready to merge"): green checks, finished review bots and a mergeable branch still apply.
4. **The thread that owns the PR runs the loop.** A delegated child (a T3 `delegate_task` child) builds, proves, runs each `sol-loop` round with `delegate_task` `mode: wait`, files, hands back the PR URL and head SHA, and stops: it never babysits, watches a PR or merges. A native subagent has no `delegate_task`, so it cannot be the builder. The parent dispatches the verifier, babysits until both the merge gate and the verdict pass, and merges only under rule 5. Outside T3 Code, babysit with `pr-wait --until green` unless the repo runs Greptile or Macroscope: the default `ready` waits for one of those review bots and never ends without it.
5. **Full stop unless told otherwise.** Merge only when the owner of the work said `full send`, or the repo's `AGENTS.md` grants it. A clean loop never authorizes a deploy. Right before merging, prove the branch holds the base's tip: `git fetch origin && git merge-base --is-ancestor origin/<base> <head SHA>`. If it does not, update the branch and wait for green checks again. Where branch protection is off (a private repo on GitHub's free plan), GitHub calls a branch that is behind `CLEAN`, so two PRs that are each green alone can break the base together.
6. **Questions** go where the repo's `AGENTS.md` says, not only into chat.

**Clean up.** Keep the worktree until the PR merges, pushing at every checkpoint. When it merges or closes, stop any runtime it started and remove the worktree.
