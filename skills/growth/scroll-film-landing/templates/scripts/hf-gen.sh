#!/usr/bin/env bash
# hf-gen.sh ENDPOINT BODY.json OUT_PREFIX
# Estimates, submits, waits for and downloads one generation. HF_DRY=1 stops after the estimate.
# Every submitted job is logged to media/jobs.jsonl with its estimated cost.
set -euo pipefail
cd "$(dirname "$0")/.."
endpoint="$1"; body="$(cat "$2")"; out="$3"
mkdir -p "$(dirname "$out")" media
usd=$(scripts/hf-api.sh POST "estimate/$endpoint" "$body" | jq -r '.usd')
echo "estimate $endpoint: \$$usd"
[[ "${HF_DRY:-}" == 1 ]] && exit 0
sub=$(HF_IDEMPOTENCY_KEY="$(basename "$out")-$(shasum <<<"$body" | cut -c1-12)" scripts/hf-api.sh POST "$endpoint" "$body")
id=$(jq -r '.request_id' <<<"$sub")
jq -cn --arg id "$id" --arg ep "$endpoint" --arg out "$out" --arg usd "$usd" --arg t "$(date -u +%FT%TZ)" \
  '{t:$t,id:$id,endpoint:$ep,out:$out,est_usd:$usd}' >> media/jobs.jsonl
echo "submitted $id"
while :; do
  st=$(scripts/hf-api.sh GET "requests/$id/status")
  case "$(jq -r '.status' <<<"$st")" in
    completed) break ;;
    failed|nsfw|canceled) echo "ended: $(jq -c '{status,error}' <<<"$st")"; exit 1 ;;
    *) sleep 5 ;;
  esac
done
echo "$st" > "$out.json"
count=$(jq '(.images // []) | length' <<<"$st"); i=0
for url in $(jq -r '(.images // [])[].url, (.video.url // empty)' <<<"$st"); do
  ext="${url##*.}"; ext="${ext%%\?*}"
  f="$out"; (( count > 1 )) && f="$out-$((++i))"
  curl -sfL "$url" -o "$f.$ext" && echo "saved $f.$ext"
done
