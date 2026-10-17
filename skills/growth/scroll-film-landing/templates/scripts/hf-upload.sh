#!/usr/bin/env bash
# hf-upload.sh FILE uploads to Higgsfield storage and prints the public URL.
# The URL is public and unauthenticated: upload only material the owner may share.
set -euo pipefail
f="$1"
case "$f" in *.png) ct=image/png ;; *.jpg|*.jpeg) ct=image/jpeg ;; *.webp) ct=image/webp ;; *) echo "unsupported type: $f" >&2; exit 1 ;; esac
up=$("$(dirname "$0")/hf-api.sh" POST files/generate-upload-url "{\"content_type\":\"$ct\"}")
hdrs=(); while IFS=$'\t' read -r k v; do hdrs+=(-H "$k: $v"); done < <(jq -r '.upload_headers | to_entries[] | "\(.key)\t\(.value)"' <<<"$up")
curl -sSf -X PUT "${hdrs[@]}" --upload-file "$f" "$(jq -r .upload_url <<<"$up")" >/dev/null
jq -r .public_url <<<"$up"
