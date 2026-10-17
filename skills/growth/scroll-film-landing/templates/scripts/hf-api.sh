#!/usr/bin/env bash
# hf-api.sh METHOD PATH [JSON] calls api.higgsfield.ai with the saved key.
# The auth header goes through stdin so the secret never shows in ps or logs.
set -euo pipefail
set -a
# shellcheck disable=SC1090
source "${HF_ENV_FILE:-$HOME/.config/higgsfield/api.env}"
set +a
method="$1"; path="$2"; body="${3:-}"
args=(--silent --show-error --fail-with-body -X "$method" -H @- -H 'Content-Type: application/json')
[[ -n "$body" ]] && args+=(--data "$body")
[[ -n "${HF_IDEMPOTENCY_KEY:-}" ]] && args+=(-H "Idempotency-Key: $HF_IDEMPOTENCY_KEY")
printf 'Authorization: Key %s:%s\n' "$HF_API_KEY_ID" "$HF_API_KEY_SECRET" |
  curl "${args[@]}" "https://api.higgsfield.ai/${path#/}"
