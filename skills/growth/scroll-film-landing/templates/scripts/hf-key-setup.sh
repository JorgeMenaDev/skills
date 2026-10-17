#!/usr/bin/env bash
# hf-key-setup.sh saves a Higgsfield API key outside the project and checks it with a free estimate.
# Run it in your own terminal: the key is read hidden and never printed.
set -euo pipefail
env_file="${HF_ENV_FILE:-$HOME/.config/higgsfield/api.env}"
echo "1. Open https://console.higgsfield.ai, sign in to the account with the API balance and create a key."
echo "2. Copy the key. The Console shows it as one string: KEY_ID:SECRET."
command -v open >/dev/null && open "https://console.higgsfield.ai" >/dev/null 2>&1 || true
read -rsp "Paste the whole key (hidden): " key; echo
if [[ "$key" == *:* ]]; then id="${key%%:*}"; secret="${key#*:}"
else id="$key"; read -rsp "No colon found. Paste the secret (hidden): " secret; echo; fi
dir="$(dirname "$env_file")"
[[ -d "$dir" ]] || { mkdir -p "$dir" && chmod 700 "$dir"; }
(umask 077 && printf "HF_API_KEY_ID='%s'\nHF_API_KEY_SECRET='%s'\n" "$id" "$secret" > "$env_file")
echo "Saved to $env_file (mode 600). Checking with a free estimate..."
if r=$(HF_ENV_FILE="$env_file" "$(dirname "$0")/hf-api.sh" POST estimate/higgsfield-ai/soul/cinema '{"prompt":"check","aspect_ratio":"16:9"}' 2>&1); then
  echo "Key works. Sample estimate: $r"
else
  echo "Check failed: $r"; exit 1
fi
