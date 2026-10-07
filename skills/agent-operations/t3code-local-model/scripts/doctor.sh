#!/usr/bin/env bash
# Checks each link of the T3 Code -> Pi -> Ollama -> model chain.
# Usage: doctor.sh [ollama-model-id]   (default: qwen2.5-coder:7b)
# Prints one "KEY: status detail" line per link. Read-only.
set -u

MODEL="${1:-qwen2.5-coder:7b}"
PI_MIN="0.80.5"
OLLAMA_URL="${OLLAMA_HOST:-http://localhost:11434}"
case "$OLLAMA_URL" in http*) ;; *) OLLAMA_URL="http://$OLLAMA_URL" ;; esac
PI_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"

# Memory decides which models fit.
if [ "$(uname)" = "Darwin" ]; then
  mem_bytes=$(sysctl -n hw.memsize)
else
  mem_bytes=$(( $(awk '/MemTotal/ {print $2}' /proc/meminfo) * 1024 ))
fi
echo "MEMORY_GB: ok $(( mem_bytes / 1073741824 ))"

# Pi: installed and new enough for T3 Code.
if command -v pi >/dev/null 2>&1; then
  pi_version=$(pi --version 2>/dev/null | head -1 | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  lowest=$(printf '%s\n%s\n' "$PI_MIN" "$pi_version" | sort -V | head -1)
  if [ -n "$pi_version" ] && [ "$lowest" = "$PI_MIN" ]; then
    echo "PI: ok $pi_version"
  else
    echo "PI: old ${pi_version:-unknown} (T3 Code needs $PI_MIN or later)"
  fi
else
  echo "PI: missing"
fi

# Ollama: binary, then server.
if command -v ollama >/dev/null 2>&1; then
  echo "OLLAMA: ok $(ollama --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
else
  echo "OLLAMA: missing"
fi

if tags=$(curl -sf --max-time 3 "$OLLAMA_URL/api/tags"); then
  echo "OLLAMA_SERVER: ok $OLLAMA_URL"
  if printf '%s' "$tags" | grep -q "\"name\":\"$MODEL\""; then
    echo "MODEL: ok $MODEL"
  else
    echo "MODEL: missing $MODEL (run: ollama pull $MODEL)"
  fi
else
  echo "OLLAMA_SERVER: down $OLLAMA_URL"
  echo "MODEL: unknown (server down)"
fi

# Pi config: the model is registered in models.json.
if [ -f "$PI_DIR/models.json" ] && grep -q "\"$MODEL\"" "$PI_DIR/models.json"; then
  echo "PI_CONFIG: ok $PI_DIR/models.json"
else
  echo "PI_CONFIG: missing $MODEL in $PI_DIR/models.json"
fi
