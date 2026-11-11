---
name: council
description: Trigger this if the user says 'council'.
version: 1.0.0
metadata:
  credits:
    - idea: "Three delegates from three providers review until all are satisfied"
      skill: council
      author: Theo Browne
      url: "https://github.com/t3dotgg/tstack/tree/main/skills/council"
---

# Council

Before an audit, address outstanding PR comments, fix known issues, and run
relevant checks. Give council the updated implementation; do not defer known
fixes until reviews return. If the user wants to discard the implementation
and explore new ideas, skip fixes to code being replaced.

Bring in three delegates to help with the user's request, usually for review
or feedback. Use one strong model from each of three different providers, at
high reasoning effort. If the user's instructions name council members, use
those. Otherwise pick the latest flagship model from each provider, for
example Claude Opus, GPT Sol, and Gemini Pro.

In T3 Code, use `orchestrator_capabilities` to resolve the models, then
`delegate_task` to start one delegate per model in parallel. Elsewhere, use
the harness's subagent tools. If you cannot reach three providers, or a named
member is unavailable, report it instead of substituting.

Give each delegate the request and relevant context. For review or feedback,
keep their work read-only. Collect their responses and summarize the useful
findings, disagreements, and recommended next steps.

For a code review, ask each delegate for a score out of 10.
Count each full review pass as one round.
A fresh review after fixes starts a new round.

If the work ends in a pull request, put the results in the PR description.
Put this section before the model and harness line at the end:

```markdown
## Council review

Rounds: 2

| Delegate | Round 1 | Round 2 |
| --- | --- | --- |
| Claude Opus | 7/10 | 9/10 |
| GPT Sol | 8/10 | 10/10 |
| Gemini Pro | 7/10 | 9/10 |
```

If a delegate gives no score, write `no score`. Do not invent one.
If the PR is open, edit the description. Do not post a comment for this.
If there is no PR, put the same results in the final reply only.

If you agree with their recommendations, make the changes and request a fresh
review after. Continue this process until all delegates are satisfied with the
outcome.

Do not let repeated reviews result in scope creep. It is your job to fight to
keep scope limited.

## Members

Unless the user names others, the council is these three, all at high effort (Jorge, 4 Nov 2026):

- Claude Opus 5.5: `{providerInstanceId: "claudeAgent", model: "claude-opus-5-5", options: {effort: "high"}}`
- GPT-6.1 Sol: `{providerInstanceId: "codex", model: "gpt-6.1-sol", options: {reasoningEffort: "high"}}`. GPT is for review and research only.
- Grok 4.7 through Cursor: `{providerInstanceId: "cursor", model: "grok-4.7", options: {reasoning_effort: "high"}}`. Cursor names this option `reasoning_effort`, not `effort`.

If the Claude Code direct provider is rate-limited, use `claudePool` with the same model and say so.

## Dispatch in T3 Code

`delegate_task`, `mode: async`, `runtimeMode: "full-access"`, role `review` for a review and `research` otherwise. Each delegate gets the same self-contained brief at `/tmp/council/<slug>/brief.md`, writes only under `/tmp/council/<slug>/<model>/`, and is told to verify the facts in the brief. End the turn and let T3 wake the thread; never poll.

## Record

The `## Council review` table goes in the PR description. A decision the user takes on the council's advice goes in the PR's `## Decisions` section. In the Matias repo, also add a line to vault `context/second-opinions.md` with what the council caught.
