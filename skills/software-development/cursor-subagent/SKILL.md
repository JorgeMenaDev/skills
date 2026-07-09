---
name: cursor-subagent
description: "Spawn Cursor Agent CLI as an external sidecar subagent from Codex, Claude, or another terminal-based agent. Use when the user explicitly asks for a Cursor subagent, Grok 4.5 pass, Cursor/Grok implementation, or an independent Cursor CLI exploration/review of code. Supports read-only exploration by default and write-capable implementation only in an isolated workspace."
---

# Cursor Subagent

## Overview

Use Cursor Agent CLI as a sidecar process when the user wants Cursor/Grok to inspect, review, or implement a bounded task from another agent session.

This is not a native runtime subagent. It is an external `cursor-agent --print` process with its own Cursor session id, auth, tools, and workspace. Treat its output like another agent's report or patch: review it before trusting or integrating it.

## Workflow

1. **Classify the task.**
   - Exploration/review/advice: use read-only mode.
   - Implementation: create or use an isolated branch/worktree/scratch workspace first.
   - Secrets, production changes, external sends, payments, account creation, or destructive operations: do not delegate unless the user explicitly approves that exact side effect.

2. **Preflight.**
   - Run `cursor-agent status` or `cursor-agent models`.
   - Confirm the intended model id exists. Default Grok id: `grok-4.5-xhigh`.
   - Do not assume UI display names are CLI ids. The UI label "Cursor Grok 4.5" maps to `grok-4.5-xhigh`.

3. **Launch through the wrapper.**
   - Prefer `scripts/run-cursor-subagent.sh` from this skill.
   - Keep read-only tasks in `ask` or `plan` mode.
   - Use `agent` mode only for implementation, and only after isolating the write scope.

4. **Capture the session.**
   - Preserve the JSON output path and `session_id`.
   - Resume with Cursor only when the follow-up depends on that Cursor context; otherwise start fresh.

5. **Review and integrate.**
   - For exploration, cite concrete findings and verify critical claims yourself.
   - For implementation, inspect the diff, run the repo's normal checks/UI validation, then commit through the parent session's repo rules.

## Wrapper

Run from the target repo or pass an explicit workspace:

```bash
/path/to/cursor-subagent/scripts/run-cursor-subagent.sh \
  --workspace /path/to/repo \
  --model grok-4.5-xhigh \
  --mode ask \
  -- "Explore how auth middleware is wired. Do not edit files."
```

Useful modes:

```text
ask   Read-only Q&A/exploration. Default.
plan  Read-only planning.
agent Write-capable Cursor agent mode. Use only in an isolated workspace.
```

Implementation example:

```bash
git switch -c cursor/grok-auth-spike
/path/to/cursor-subagent/scripts/run-cursor-subagent.sh \
  --workspace "$PWD" \
  --mode agent \
  --force \
  -- "Implement only the auth middleware change described in docs/plan.md. Do not touch tests."
```

Use `--force` only when you intentionally want Cursor to run commands without interactive approval prompts. Avoid it for exploratory tasks.

## Prompt Contract

Give Cursor a bounded, explicit brief:

```text
You are a Cursor CLI sidecar launched by another agent.
Task: <specific exploration or implementation>.
Scope: <files/directories allowed>.
Do not: <forbidden actions>.
Return: <exact report or changed files expected>.
```

For code edits, tell Cursor:

- it is not alone in the codebase;
- it must not revert unrelated changes;
- it must list changed files and validation commands;
- it must stop before production/external side effects.

## Model Notes

Default to `grok-4.5-xhigh` for Cursor Grok 4.5. Confirm current ids with:

```bash
cursor-agent models | grep -i 'grok-4.5'
```

Known mapping observed 2026-07-09:

```text
grok-4.5-xhigh       Cursor Grok 4.5
grok-4.5-high        Cursor Grok 4.5 Medium
grok-4.5-medium      Cursor Grok 4.5 Low
```

Prefer the wrapper's live model preflight over hardcoded memory when accuracy matters.
