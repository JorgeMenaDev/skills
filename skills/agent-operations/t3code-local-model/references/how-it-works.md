# How a local model reaches T3 Code

Read this to understand the design, or to choose a route other than Pi.

## T3 Code runs agents, not models

Every T3 Code provider is an **agent**: Codex, Claude, OpenCode, Pi, or an ACP command. The agent owns the model, its tools (read, edit, bash) and its sign-in. T3 Code owns projects, threads, checkpoints, permission modes and delegated tasks. T3 Code has no setting for a model server URL. A local model must therefore sit behind an agent that can call it:

```
T3 Code  --RPC-->  Pi  --OpenAI-compatible HTTP-->  Ollama  -->  model weights
```

## Route 1: Pi (recommended)

- T3 Code starts Pi as `pi --mode rpc` and asks it for its models with `get_available_models`. The picker shows exactly what Pi can run. Source: `apps/server/src/orchestration-v2/Adapters/PiAdapterV2.ts` in [pingdotgg/t3code](https://github.com/pingdotgg/t3code).
- Pi reads custom endpoints from `models.json` in its agent directory. Any server that speaks the OpenAI chat-completions API works: Ollama, LM Studio, vLLM, SGLang. Pi's own docs use `qwen2.5-coder:7b` on Ollama as their example. Source: `packages/coding-agent/docs/models.md` in [badlogic/pi-mono](https://github.com/badlogic/pi-mono).
- T3 Code's Pi settings are **Binary path** and **Launch arguments**. T3 Code rejects launch arguments that change Pi's mode or session, and `--provider` must come with `--model`. Source: `PiSettings` in `packages/contracts/src/settings.ts` and `docs/user/providers-pi.md`.
- Permission modes work through Pi's tool hook: Supervised, Auto-accept edits and Full access. Pi has no **Auto** mode.

Why Pi first: it is one config file, it is supported in T3 Code without extra code, and T3 Code keeps Pi's sessions, rollback and forks.

## Route 2: Pi with llama.cpp instead of Ollama

Pi has a built-in llama.cpp router provider: `/login llama.cpp`, then `/llama` to load GGUF files. This skips Ollama but needs a llama.cpp build with router support. Source: `packages/coding-agent/docs/llama-cpp.md` in pi-mono.

## Route 3: a local ACP command

**Settings → Providers → Add provider → Local ACP command** runs any executable that speaks ACP (Agent Client Protocol) over stdio. You give the executable and one argument per row. Source: `docs/user/providers-acp.md` and `AcpRegistrySettings` (`source: "local"`, `commandPath`, `commandArgs`) in t3code.

Ollama and llama.cpp do not speak ACP. This route works only when you already have an ACP agent that can call a local model, for example an agent from the [ACP Registry](https://agentclientprotocol.com/get-started/registry) configured for a local endpoint. Limits compared with Pi:

- ACP agents cannot rewind their conversation. After a checkpoint rollback, the next turn starts a fresh agent session.
- T3 Code does not use ACP instances for thread titles, commit messages or PR descriptions.

## Other routes

OpenCode is also a T3 Code provider and can call OpenAI-compatible endpoints from its own config. Use it when the human already uses OpenCode. Setup lives in OpenCode's docs, not here.

## Verified against

t3code `611132c1` and pi-mono `b30a6dd`. When a step in `SKILL.md` disagrees with the current docs of either repo, trust the repo and update this skill.
