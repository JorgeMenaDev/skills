# Crew for T3 Code

Dispatch visible worker threads across the providers you already use in T3 Code. Each worker gets a brief, a model and a working directory. It writes a local report and notifies the parent, which verifies the result before settling the thread.

```bash
npx skills@latest add JorgeMenaDev/skills --skill crew
```

Invoke `/crew` in a T3-hosted agent session and give it a task. For example:

> Use Crew to investigate the parser bug and independently review the proposed fix. Use my configured providers, keep both workers read-only until the diagnosis is clear, and show me the reproduction.

See [setup](references/setup.md), [model routing](references/routing.md) and [lifecycle](references/lifecycle.md). The skill bundles its complete dispatcher. It replaces the older `crew-dispatch` package, which depended on workspace-local helpers; remove that old skill when switching.

## Requirements and compatibility

- T3 Code running locally with authenticated provider instances.
- Bash, Python 3, Bun, curl, sqlite3 and the T3 CLI on PATH.
- macOS for the included recovery installer. Other Unix systems need their own scheduler; Windows is unsupported.

The implementation was checked against T3 Code `0.0.43-nightly.20260926.2282`. It uses T3's evolving orchestration API, provider RPCs and local identity logs, so compatibility with every version or provider is not guaranteed. Run `doctor` and inspect the catalog before dispatch. Identity resolution supports the session variables exported by Codex, Claude Code, Cursor and OpenCode; unsupported hosts stop before dispatch.

This is an independent community workflow, not T3's native Orchestrator feature. It needs no T3 source changes. Models, subscription eligibility and permission behavior come from your own provider setup.

## Privacy

The package contains source and documentation only. It ships no credentials, account configuration, conversation history, databases or runtime records. It uses short-lived local T3 authentication and reads quota through T3, without inspecting provider credential files or browser cookies.

Runtime briefs and reports belong to you and remain in `~/.local/state/t3-crew` by default. Keep that directory private. Public examples use placeholders; the only author identity in the package is its repository link and MIT copyright notice.

## Verification

Release checks cover a fresh skills.sh installation, catalog lookup, syntax and static checks, paths containing spaces and apostrophes, permission preservation, private state permissions and a scan for credentials or personal workspace references. Live checks on the verified T3 version completed worker hand-backs through Codex and Grok, a Codex follow-up round, acknowledgement and settlement. Exhausted-provider gates were also exercised. These are smoke checks, not an assertion that every model or provider combination works.

MIT licensed. See [LICENSE](LICENSE).
