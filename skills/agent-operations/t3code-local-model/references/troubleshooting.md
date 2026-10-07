# Troubleshooting

Run `scripts/doctor.sh <model-id>` first. Fix the first line that is not `ok`.

## Context

Symptom: the model ignores instructions, repeats itself, or stops calling tools after the first turn. Cause: Ollama cuts the prompt to its context length.

Make `OLLAMA_CONTEXT_LENGTH` permanent:

- **Ollama macOS app:** run `launchctl setenv OLLAMA_CONTEXT_LENGTH 32768`, then quit and reopen Ollama. Recent versions also have a context length setting in the app.
- **Homebrew service:** stop it (`brew services stop ollama`) and run `OLLAMA_CONTEXT_LENGTH=32768 ollama serve` from a login script, or use the app.
- **Linux systemd:** run `sudo systemctl edit ollama`, add `Environment="OLLAMA_CONTEXT_LENGTH=32768"` under `[Service]`, then `sudo systemctl restart ollama`.

Check: `ollama ps` shows the loaded model and its context size.

## The model is not in the T3 Code picker

1. Run `pi --list-models <name>`. When Pi does not list it, fix `models.json` (Step 5) first.
2. In **Settings → Providers**, choose **Refresh provider** on Pi.
3. When Pi lists it but T3 Code still does not, set Pi's **Launch arguments** to `--provider ollama --model <model-id>`.
4. When discovery fails, T3 Code shows only `Pi default`. Start a thread anyway. Pi uses its saved default model.

## Pi shows "Pi unavailable"

The **Binary path** must point to a `pi` that runs on the T3 Code server machine. Run `which pi` in a server terminal and paste that path. A Node version manager can put `pi` on your shell `PATH` but not on the server's.

## Connection refused

Ollama is not running, or it listens on another address. Check `curl http://localhost:11434/api/tags`. When Ollama runs on another machine, set `baseUrl` in `models.json` to that machine and start Ollama there with `OLLAMA_HOST=0.0.0.0`. Only do this on a trusted network: Ollama has no authentication.

## It is very slow

The model does not fit in memory and the machine swaps. Pick a smaller model or a smaller context. On a PC, check that Ollama uses the GPU with `ollama ps`.

## Thread titles or commit messages fail

T3 Code generates these with a separate text-generation provider. Leave that on a hosted provider. A small local model writes poor titles and can time out.
