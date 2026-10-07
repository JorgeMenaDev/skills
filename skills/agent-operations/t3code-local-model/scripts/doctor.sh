#!/usr/bin/env bash
# Checks whether a model fits this machine right now, then each link of the
# T3 Code -> Pi -> Ollama -> model chain.
# Usage: doctor.sh [ollama-model-id]   (default: qwen2.5-coder:7b)
# Prints one "KEY: status detail" line per check. Read-only; the only network
# call reads the model's size from the Ollama registry.
set -u

MODEL="${1:-qwen2.5-coder:7b}"
PI_MIN="0.80.5"
HEADROOM_GB=4 # memory the OS and everyday apps keep for themselves
OLLAMA_URL="${OLLAMA_HOST:-http://localhost:11434}"
case "$OLLAMA_URL" in http*) ;; *) OLLAMA_URL="http://$OLLAMA_URL" ;; esac
PI_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"

gb() { awk -v b="$1" 'BEGIN { printf "%.1f", b / 1073741824 }'; }

# --- Memory: what the machine has, and what is free right now ---
if [ "$(uname)" = "Darwin" ]; then
  total=$(sysctl -n hw.memsize)
  page=$(sysctl -n hw.pagesize)
  # Free + inactive + speculative + purgeable pages can be handed to a new process.
  avail=$(vm_stat | awk -v p="$page" '
    /Pages free|Pages inactive|Pages speculative|Pages purgeable/ { gsub("\\.", "", $NF); s += $NF }
    END { printf "%.0f", s * p }')
  swap_used=$(sysctl -n vm.swapusage | awk '{ for (i = 1; i <= NF; i++) if ($i == "used") { v = $(i + 2); sub("M", "", v); printf "%.0f", v * 1048576 } }')
  case "$(sysctl -n kern.memorystatus_vm_pressure_level 2>/dev/null)" in
    1) pressure=normal ;; 2) pressure=warn ;; 4) pressure=critical ;; *) pressure=unknown ;;
  esac
else
  total=$(awk '/MemTotal/ { print $2 * 1024 }' /proc/meminfo)
  avail=$(awk '/MemAvailable/ { print $2 * 1024 }' /proc/meminfo)
  swap_used=$(awk '/SwapTotal/ { t = $2 } /SwapFree/ { f = $2 } END { print (t - f) * 1024 }' /proc/meminfo)
  pct=$(( avail * 100 / total ))
  if [ "$pct" -lt 10 ]; then pressure=critical; elif [ "$pct" -lt 20 ]; then pressure=warn; else pressure=normal; fi
fi
echo "MEMORY_TOTAL_GB: ok $(gb "$total")"
echo "MEMORY_AVAILABLE_GB: ok $(gb "$avail")"
echo "SWAP_USED_GB: ok $(gb "${swap_used:-0}")"
echo "MEMORY_PRESSURE: $pressure"
if command -v nvidia-smi >/dev/null 2>&1; then
  echo "GPU_VRAM_GB: ok $(nvidia-smi --query-gpu=memory.total,memory.free --format=csv,noheader,nounits | head -1 | awk -F', ' '{ printf "total %.1f free %.1f", $1 / 1024, $2 / 1024 }')"
fi

# --- Fit: model size from the registry, memory estimate at a 32K context ---
name="${MODEL%%:*}"; tag="latest"
case "$MODEL" in *:*) tag="${MODEL#*:}" ;; esac
case "$name" in */*) ;; *) name="library/$name" ;; esac
size=$(curl -sf --max-time 10 -H 'Accept: application/vnd.docker.distribution.manifest.v2+json' \
  "https://registry.ollama.ai/v2/$name/manifests/$tag" \
  | grep -Eo '"size":[0-9]+' | awk -F: '{ s += $2 } END { if (s) print s }')
if [ -n "$size" ]; then
  # Weights plus context cache and runtime: about 1.4x the download plus 0.3 GB.
  needs=$(awk -v s="$size" 'BEGIN { printf "%.0f", s * 1.4 + 322122547 }')
  echo "MODEL_SIZE_GB: ok $(gb "$size") download"
  echo "MODEL_NEEDS_GB: ok $(gb "$needs") while loaded (estimate, 32K context)"
  limit=$(awk -v t="$total" -v h="$HEADROOM_GB" 'BEGIN { printf "%.0f", t - h * 1073741824 }')
  if [ "$needs" -gt "$limit" ]; then
    echo "FIT: no (needs $(gb "$needs") GB; this machine can give a model at most $(gb "$limit") GB)"
  elif [ "$needs" -gt "$avail" ]; then
    echo "FIT: tight (fits this machine, but not in the $(gb "$avail") GB free now; loading it pushes open apps into swap)"
  elif [ "$pressure" != normal ]; then
    echo "FIT: tight (fits in the $(gb "$avail") GB free now, but memory pressure is already $pressure)"
  else
    echo "FIT: ok"
  fi
else
  echo "MODEL_SIZE_GB: unknown ($MODEL not found in the Ollama registry, or offline)"
  echo "FIT: unknown"
fi

# --- Chain: Pi, Ollama, the model, Pi's config ---
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

if [ -f "$PI_DIR/models.json" ] && grep -q "\"$MODEL\"" "$PI_DIR/models.json"; then
  echo "PI_CONFIG: ok $PI_DIR/models.json"
else
  echo "PI_CONFIG: missing $MODEL in $PI_DIR/models.json"
fi
