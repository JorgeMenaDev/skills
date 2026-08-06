#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  run-cursor-subagent.sh [options] -- <prompt>

Options:
  --workspace <path>      Workspace for Cursor Agent (default: current directory)
  --model <id>            Cursor model id (default: cursor-grok-4.5-high)
  --mode <ask|plan|agent> ask/plan are read-only; agent is write-capable (default: ask)
  --output <path>         JSON output path (default: /tmp/cursor-subagent-<timestamp>.json)
  --resume <chatId>       Resume a Cursor chat id
  --continue              Continue the previous Cursor session
  --force                 Pass --force to Cursor Agent for write-capable runs
  -h, --help              Show this help

Examples:
  run-cursor-subagent.sh --mode ask -- "Summarize the router structure. Do not edit files."
  run-cursor-subagent.sh --workspace "$PWD" --mode agent --force -- "Implement the bounded change."
USAGE
}

workspace=$PWD
model=${CURSOR_SUBAGENT_MODEL:-cursor-grok-4.5-high}
mode=ask
output=""
resume_id=""
continue_session=false
force=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      workspace=${2:?missing value for --workspace}
      shift 2
      ;;
    --model)
      model=${2:?missing value for --model}
      shift 2
      ;;
    --mode)
      mode=${2:?missing value for --mode}
      shift 2
      ;;
    --output)
      output=${2:?missing value for --output}
      shift 2
      ;;
    --resume)
      resume_id=${2:?missing value for --resume}
      shift 2
      ;;
    --continue)
      continue_session=true
      shift
      ;;
    --force)
      force=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

prompt="$*"
if [[ -z "$prompt" ]]; then
  usage >&2
  exit 2
fi

case "$mode" in
  ask|plan|agent) ;;
  *)
    echo "Unsupported --mode '$mode'. Use ask, plan, or agent." >&2
    exit 2
    ;;
esac

if [[ ! -d "$workspace" ]]; then
  echo "Workspace does not exist: $workspace" >&2
  exit 2
fi

agent_bin=""
if command -v cursor-agent >/dev/null 2>&1; then
  agent_bin=cursor-agent
elif command -v agent >/dev/null 2>&1; then
  agent_bin=agent
else
  echo "Cursor Agent CLI not found. Install Cursor CLI or ensure cursor-agent is on PATH." >&2
  exit 127
fi

if [[ "$mode" == "agent" && "$force" == false ]]; then
  cat >&2 <<'WARN'
Refusing write-capable agent mode without --force.
Use --mode ask or --mode plan for read-only work, or rerun with --mode agent --force in an isolated workspace.
WARN
  exit 2
fi

models_file=$(mktemp "${TMPDIR:-/tmp}/cursor-subagent-models.XXXXXX")
models_err=$(mktemp "${TMPDIR:-/tmp}/cursor-subagent-models-err.XXXXXX")
trap 'rm -f "$models_file" "$models_err"' EXIT

if ! "$agent_bin" models >"$models_file" 2>"$models_err"; then
  cat "$models_err" >&2 || true
  echo "Cursor Agent model preflight failed. Check Cursor login or CURSOR_API_KEY." >&2
  exit 1
fi

if ! grep -F "$model" "$models_file" >/dev/null; then
  echo "Cursor model '$model' was not listed by '$agent_bin models'." >&2
  echo "Matching Grok models:" >&2
  grep -i 'grok-4.5' "$models_file" >&2 || true
  exit 1
fi

if [[ -z "$output" ]]; then
  output="/tmp/cursor-subagent-$(date -u +%Y%m%dT%H%M%SZ).json"
fi

args=(--print --trust --sandbox disabled --workspace "$workspace" --model "$model" --output-format json)
if [[ "$mode" == "ask" || "$mode" == "plan" ]]; then
  args+=(--mode "$mode")
fi
if [[ -n "$resume_id" ]]; then
  args+=(--resume "$resume_id")
fi
if [[ "$continue_session" == true ]]; then
  args+=(--continue)
fi
if [[ "$force" == true ]]; then
  args+=(--force)
fi

echo "Cursor subagent: $agent_bin model=$model mode=$mode workspace=$workspace" >&2
echo "Output: $output" >&2

if ! "$agent_bin" "${args[@]}" "$prompt" > "$output"; then
  echo "Cursor subagent failed. Partial output, if any: $output" >&2
  exit 1
fi

cat "$output"

session_id=$(sed -n 's/.*"session_id":"\([^"]*\)".*/\1/p' "$output" | head -1)
if [[ -n "$session_id" ]]; then
  echo "Cursor session_id: $session_id" >&2
fi
