# t3code-local-model

Run a local open-weight model, such as Qwen2.5-Coder 7B, as a provider in [T3 Code](https://github.com/pingdotgg/t3code). No API key, no per-token cost, and no code sent to a model company.

## What you get

A T3 Code thread whose agent is [Pi](https://github.com/badlogic/pi-mono) and whose model runs on your machine through [Ollama](https://ollama.com):

```
T3 Code  ->  Pi (agent)  ->  Ollama (model server)  ->  local model
```

## Before you start

- T3 Code installed, on the machine that runs its server.
- Node.js 22.19 or newer, for Pi.
- At least 16 GB of memory for a 7B model. [references/choosing-a-model.md](references/choosing-a-model.md) covers other sizes.
- About 5 GB of free disk for a 7B model.

Not sure your machine can take it? Run `bash scripts/doctor.sh <model-id>`. It reads your memory now (total, free, swap, pressure), looks up the model's size, and prints `FIT: ok`, `tight` or `no`. You can also ask your agent "can this machine run qwen2.5-coder:7b?" and it answers from the same check without installing anything.

Small local models are much weaker agents than hosted frontier models. Read "Quality" in [references/choosing-a-model.md](references/choosing-a-model.md) before you start.

## Use it

**With an agent:** install the skill and ask your coding agent to set up a local model in T3 Code. The agent runs the doctor script and asks you before it installs or downloads anything.

```bash
npx skills@latest add JorgeMenaDev/skills --skill t3code-local-model
```

**By hand:** follow the six steps in [SKILL.md](SKILL.md). Run `bash scripts/doctor.sh qwen2.5-coder:7b` before you start and after each step. Each line it prints is one link of the chain, and `ok` means that link works.

## Files

| File | Read it when |
| --- | --- |
| [SKILL.md](SKILL.md) | You set it up. Six steps, each with a check. |
| [scripts/doctor.sh](scripts/doctor.sh) | You want to know if a model fits your machine now, or which link is missing. Read-only. |
| [references/how-it-works.md](references/how-it-works.md) | You want the design, the source references, or a route other than Pi (llama.cpp, a local ACP command). |
| [references/choosing-a-model.md](references/choosing-a-model.md) | You pick a model or wonder what it can do. |
| [references/troubleshooting.md](references/troubleshooting.md) | Something does not work. |
