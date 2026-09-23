---
name: session-wrap-up
description: "End a work session with no loose ends: Second Brain, GitHub and Linear trackers, matter records, pushed repos, removed worktrees, stopped processes, one report."
disable-model-invocation: true
version: 1.1.0
mutating: true
writes_to: ["Second Brain vault", "GitHub issues touched this session", "Linear issues touched this session", "matter records under organization/admin-matters/", "git worktrees and local branches this session created"]
---

# Session Wrap-Up

End a work session by persisting its outcome everywhere it would otherwise go stale, then clearing every trace of the session's own scaffolding. The goal is **no loose ends**: nothing the session learned lives only in chat, and nothing it created is still on disk or running.

## State

List every repo the session touched, including product clones and the skills repo, then run this block. Run it again at the end as the completion check.

```bash
for r in <each repo this session touched>; do
  git -C "$r" fetch -q origin
  echo "REPO: $r"
  echo "DIRTY: $(git -C "$r" status --porcelain | wc -l | tr -d ' ')"
  echo "UNPUSHED: $(git -C "$r" rev-list --count @{u}..HEAD 2>/dev/null || echo no-upstream)"
  git -C "$r" worktree list --porcelain | awk '/^worktree /{print "WORKTREE: "$2}' | sed 1d
done
```

`DIRTY` above 0 can be foreign work. Name it in the report and leave it uncommitted. Each `WORKTREE` line is either one this session created, which step 6 removes, or someone else's, which you leave alone.

## Steps

1. **Second Brain.** Append a dated, attributed entry to `vault/daily/YYYY-MM-DD.md`, update each domain note the work touched, and add new durable facts to [[INDEX]]. Same pass, additive, `author: matias` on new notes.
2. **GitHub trackers.** Reconcile every GitHub issue touched. Update bodies where state changed and close what is done. Post a `## Triage Notes` comment with `### Established`, plus exactly one `### Needs from Jorge` item when the work is blocked.
3. **Linear trackers.** Reconcile every Linear issue touched through the Linear MCP. Confirm the workspace with `get_workspace` before writing; access and account per workspace are in `docs/agents/linear.md`. Set each issue's status to match reality and comment with what changed plus the PR or commit URL.
4. **Matter records.** Update `organization/admin-matters/*/README.md` evidence trails and next-action checkboxes for any matter the session advanced.
5. **Commit and push.** In every touched repo, run `git pull --rebase origin main`, then commit and push. Prefix vault commits with `vault:` and admin-matter commits with `matter:`. Worktree branches get pushed to origin too, with their PRs opened or updated.
6. **Clean up.** Remove what the session created:
   - **Worktrees.** First push the branch, so its work lives on origin. Then run `git worktree remove <path>`, `git worktree prune`, and `git branch -d <branch>`. `-d` refuses unmerged branches; keep those. If the worktree ran a dev server or Convex backend, follow the `using-git-worktrees` LIFECYCLE.md first.
   - **Processes.** Stop dev servers, watchers, and background shells the session started, by the PID captured at spawn.
   - **Scratch files.** Delete temp files and directories the session created outside a repo.
7. **Verify.** Re-run the State block. Check that nothing sensitive (passwords, API keys, ID numbers, document images) reached GitHub, Linear, or the vault.
8. **Report.** In three lines: what happened, where each thing is documented, and what is waiting on Jorge. Name any foreign dirty files left untouched. End with a suggested next action.

**STOP before `git worktree remove --force` or `rm -rf` on a worktree.** When a plain `remove` refuses, the worktree still holds uncommitted or unpushed work. Forcing it deletes that work for good, and this gate exists to prevent that. Commit and push, or hand the worktree back by name in the report.

## Completion

The second State run shows `DIRTY: 0` except for named foreign work, `UNPUSHED: 0`, and no `WORKTREE` line this session created. Every touched GitHub and Linear issue reflects the real state. No process the session spawned is still running. The report names the open next actions.
