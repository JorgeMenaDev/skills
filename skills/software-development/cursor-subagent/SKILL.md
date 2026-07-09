---
name: cursor-subagent
description: "Cursor sidecar delegation. Use when the user explicitly asks to spawn a Cursor subagent, run a Grok 4.5 pass, delegate exploration/review to Cursor Agent CLI, or use Cursor/Grok for an isolated implementation."
metadata:
  mutating: true
  writes_to: ["target workspace when run with --mode agent"]
  triggers: ["cursor-agent"]
---

# Cursor Subagent

## Contract

- Cursor is a **sidecar**: an external `cursor-agent --print` process with its own session id, tools, auth, and workspace.
- Read-only is default: use `ask` for exploration/review and `plan` for planning.
- Implementation uses `agent` mode only in an isolated branch, worktree, or scratch workspace.
- Parent agent reviews all reports or diffs before integration.
- Cursor never receives secrets, production mutations, external sends, payments, account creation, destructive operations, or final-click authority without explicit user approval.

## Preamble

Set `SKILL_DIR` to this skill directory, then run:

```bash
MODE="${MODE:-ask}"
WORKSPACE="${WORKSPACE:-$PWD}"
MODEL="${MODEL:-grok-4.5-xhigh}"
WRAPPER="$SKILL_DIR/scripts/run-cursor-subagent.sh"
[ -x "$WRAPPER" ] && echo "WRAPPER: ok" || echo "WRAPPER: missing"
command -v cursor-agent >/dev/null 2>&1 && echo "CURSOR_AGENT: ok" || echo "CURSOR_AGENT: missing"
echo "MODE: $MODE"
echo "WORKSPACE: $WORKSPACE"
echo "MODEL: $MODEL"
if [ "$MODE" = agent ] && git -C "$WORKSPACE" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  dirty=$(git -C "$WORKSPACE" status --short)
  branch=$(git -C "$WORKSPACE" branch --show-current)
  [ -z "$dirty" ] && echo "GIT_STATE: clean:$branch" || echo "GIT_STATE: dirty:$branch"
elif [ "$MODE" = agent ]; then
  echo "GIT_STATE: no-git"
else
  echo "GIT_STATE: not-needed"
fi
```

Branch only on those tokens:

- `WRAPPER: missing` or `CURSOR_AGENT: missing` -> stop and report the missing dependency.
- `MODE: agent` plus `GIT_STATE: dirty:*` or `GIT_STATE: no-git` -> STOP. Launching a write-capable external agent into an unisolated or dirty workspace is the failure this gate prevents. Create a clean branch/worktree/scratch workspace or get explicit user approval for the risk.
- `MODE: ask|plan` -> proceed read-only.

The wrapper performs the live Cursor auth/model preflight and fails before launch if the model is unavailable.

## Launch

Read-only exploration:

```bash
"$WRAPPER" --workspace "$WORKSPACE" --mode ask --model "$MODEL" -- \
  "You are a Cursor CLI sidecar launched by another agent. Explore <scope>. Do not edit files. Return findings with file paths."
```

Write-capable implementation:

```bash
"$WRAPPER" --workspace "$WORKSPACE" --mode agent --force --model "$MODEL" -- \
  "You are a Cursor CLI sidecar launched by another agent. Implement <bounded change>. Scope: <files>. Do not revert unrelated changes. Stop before external side effects. Return changed files and validation."
```

Use `--force` only for intentional write-capable runs. The wrapper refuses `--mode agent` without it.

## Output Format

End with:

```text
STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED
CURSOR_SESSION: <session_id or none>
OUTPUT: <json output path>
SUMMARY: <one line>
CHANGED_FILES: <none or paths>
VALIDATION: <commands/evidence or not run>
```

## Anti-Patterns

- Treating Cursor's report as verified truth: verify critical claims locally.
- Running `agent` mode on the user's dirty checkout: use an isolated workspace.
- Hardcoding UI labels as model ids: use `grok-4.5-xhigh` by default and let the wrapper confirm it with `cursor-agent models`.
- Resuming by habit: resume only when the follow-up depends on Cursor's prior context.
