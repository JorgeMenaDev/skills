# Choosing a model

## Does it fit?

The model must fit in memory together with its context and the rest of the machine. On Apple Silicon, memory is shared with the GPU. On a PC, the model should fit in GPU memory (VRAM) to run at a usable speed.

Rough sizes for 4-bit models, the Ollama default:

| Model size | Download | Memory while running (32K context) | Machine |
| --- | --- | --- | --- |
| 3B | about 2 GB | about 4 GB | 8 GB |
| 7B–8B | about 5 GB | about 7–8 GB | 16 GB |
| 14B | about 9 GB | about 12–14 GB | 32 GB |
| 32B | about 20 GB | about 24–28 GB | 64 GB |

To check a specific model on a specific machine, use [canirun.ai](https://www.canirun.ai/model/qwen2.5-coder-7b/). The Ollama library page for the model gives the exact download size of each tag.

A bigger context needs more memory. When the model is slow or the machine swaps, lower `OLLAMA_CONTEXT_LENGTH` and the `contextWindow` in Pi's `models.json` together. Do not go below 16384: Pi's system prompt and tool definitions take a large part of it.

## Quality

A coding agent needs **tool calling**: the model must emit correct calls to read, edit and bash, many times in a row. Small models are much weaker at this than at writing code in a chat.

- **7B–8B models:** good for questions about the code, small edits and offline use. Expect broken tool calls and lost track after a few steps.
- **14B–32B models:** usable for single-file tasks with supervision.
- **Hosted frontier models:** still needed for multi-step tickets and delegated work.

Prefer the newest coder model with tool-calling support that fits the machine. Ollama marks those models with a **tools** tag on its library page.

## Cost and privacy

A local model costs nothing per token and sends no code to a model company. It uses the machine's memory and battery while it runs. Ollama unloads an idle model after a few minutes.
