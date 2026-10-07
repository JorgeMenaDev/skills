---
name: t3code-local-model
description: Run a local open-weight model (Qwen, Llama, DeepSeek and others) as a T3 Code provider through Pi and Ollama. Use when someone wants a local, offline or free model inside T3 Code, asks whether their machine can run one, or a local model in T3 Code stops answering.
version: 1.1.0
mutating: true
writes_to: [system packages (Ollama), model files under ~/.ollama, <pi-agent-dir>/models.json, T3 Code provider settings]
---

# Local model in T3 Code

T3 Code runs **agents**, not models. A local model reaches T3 Code through a chain: T3 Code → Pi (the agent) → Ollama (the model server) → the model. Each link has one check. Fix links left to right. Why Pi and not a custom ACP command: [references/how-it-works.md](references/how-it-works.md). The worked example is `qwen2.5-coder:7b`. For another model, replace that ID everywhere.

## Preamble

Run `bash scripts/doctor.sh <model-id>` from this skill's folder. It reads this machine's memory now (`MEMORY_TOTAL_GB`, `MEMORY_AVAILABLE_GB`, `SWAP_USED_GB`, `MEMORY_PRESSURE`), the model's size, and a `FIT` verdict. Then it prints one line per link: `PI`, `OLLAMA`, `OLLAMA_SERVER`, `MODEL`, `PI_CONFIG`. Start at the first step whose line is not `ok`. Run the doctor again after each step. A step is done when its line reads `ok`.

**Question only?** When the human asks whether a model can run, or how the machine is doing, answer from the doctor's memory and `FIT` lines plus "Quality" in [references/choosing-a-model.md](references/choosing-a-model.md). Give the numbers and a verdict. Install nothing.

## Steps

### 1. Challenge the model choice (`FIT`)

Run the doctor with the model the human wants. Act on `FIT`:

- `ok`: go on.
- `tight`: **STOP.** Give the human the numbers: what the model needs, what is free now, and the swap already in use. Offer a smaller model, or closing apps first. Go on only on an explicit yes. This prevents a frozen machine.
- `no`: **STOP.** The model cannot run here. Propose the largest model that gets `ok` or `tight`, using [references/choosing-a-model.md](references/choosing-a-model.md).
- `unknown`: find the size on the model's Ollama library page, then apply the rules above by hand.

Also challenge a model that fits but is too small for the job. Models under 7B cannot use tools. Done when the human has agreed to one model ID and you know its size.

### 2. Install Pi (`PI`)

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Pi needs Node.js 22.19 or newer. T3 Code supports Pi 0.80.5 and later. Install Pi on the machine that runs the T3 Code server, not on the phone or browser that connects to it.

### 3. Install and start Ollama (`OLLAMA`, `OLLAMA_SERVER`)

**STOP before installing.** Tell the human what will be installed and get a yes. This prevents surprise system changes.

- macOS: `brew install ollama`, or the app from ollama.com.
- Linux: the install script from ollama.com/download.

Start the server with a larger context. Agents send long prompts, and Ollama's default context is too small for them: the model drops instructions and makes bad tool calls.

```bash
OLLAMA_CONTEXT_LENGTH=32768 ollama serve   # permanent: "Context" in references/troubleshooting.md
```

### 4. Download the model (`MODEL`)

**STOP before downloading.** Tell the human the download size and get a yes. This prevents filling a small disk. Done when `ollama run` replies.

```bash
ollama pull qwen2.5-coder:7b
ollama run qwen2.5-coder:7b "Reply with OK"
```

### 5. Register the model with Pi (`PI_CONFIG`)

Add the model to `<pi-agent-dir>/models.json`. The default `<pi-agent-dir>` is `~/.pi/agent`, and `PI_CODING_AGENT_DIR` overrides it. When the file already exists, merge the `ollama` provider into it. Keep the other providers.

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [{ "id": "qwen2.5-coder:7b", "contextWindow": 32768 }]
    }
  }
}
```

Ollama ignores the `apiKey`, but Pi shows a model only when it has a key. Keep `contextWindow` equal to `OLLAMA_CONTEXT_LENGTH`. Done when Pi prints a reply below. T3 Code shows only what Pi can run, so fix Pi first.

```bash
pi -p --provider ollama --model qwen2.5-coder:7b "Reply with OK"
```

### 6. Turn on Pi in T3 Code

The human does this in the app:

1. Open **Settings → Providers**.
2. Turn on **Pi**, then choose **Refresh provider**.
3. Start a new thread. Choose **Pi** and the model `qwen2.5-coder:7b` in the model picker.
4. Send "List the files in this project".

Done when the model replies in the thread and its tool calls show in the work log. T3 Code's model ID is `ollama/qwen2.5-coder:7b`: Pi's provider name, a slash, then the Ollama ID. When the model is not in the picker, set **Launch arguments** to `--provider ollama --model qwen2.5-coder:7b`. T3 Code needs both flags together.

## After setup

Tell the human what to expect from the model they picked, using "Quality" in [references/choosing-a-model.md](references/choosing-a-model.md). Recommend a hosted provider for delegated work, thread titles and commit messages. When something breaks later, read [references/troubleshooting.md](references/troubleshooting.md).
