# Gates

Use this reference when deciding whether a phase or final PR can move forward.

## Phase Gate

Follow the target repo's `AGENTS.md` and local docs first. Default baseline:

- TypeScript checks.
- Lint.
- Convex strict TypeScript checks when Convex exists.

Do not invent broad test suites unless the repo requires them. Record exact commands, results, branch, commit, PR, and safety statement in the child issue before merging the phase PR.

Command discovery priority:

1. `.shiploop/config.yaml`
2. `AGENTS.md` and repo docs
3. package scripts
4. known Bun and Convex defaults
5. ask the human if ambiguous

Creating or editing `.shiploop/config.yaml` is a repo mutation. Before kickoff approval, only draft the intended config in the run plan. After approval, create or update it on the train branch unless the human explicitly requests no config file. Record whether it was committed in the parent issue timeline.

## Final Gate

Open the final PR as draft. Repo-local `autoreview` is mandatory.

If repo-local `autoreview` is missing, install it automatically:

```sh
npx skills add https://github.com/steipete/clawdis --skill autoreview
```

After installation, record the command, resulting files, and whether they are committed to the train branch.

Run `autoreview`, fix accepted findings on the train branch, and rerun until clean or blocked. Then mark the PR ready and label the parent issue `shiploop-human-review`.

## Evidence Template

```md
Shiploop gate passed.

Evidence:
- Scope: phase | final
- Branch: <branch>
- Commit: <sha>
- PR: #<number>
- Commands: <exact commands and result>
- Review gate: <command and result>
- Safety: no external sends, no production mutation, no secrets exposed

Next:
- <next step>
```
