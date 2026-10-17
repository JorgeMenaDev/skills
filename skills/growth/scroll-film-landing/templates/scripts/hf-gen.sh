#!/usr/bin/env bash
# hf-gen.sh ENDPOINT BODY.json OUT_PREFIX
# Estimates, submits, waits for and downloads one generation. HF_DRY=1 stops after the estimate;
# HF_CAP_USD=7 refuses any job that would take committed spend past 7 dollars.
# Every job is logged to media/jobs.jsonl: one line with its estimate at submit, one with its final status.
# scripts/spend.sh sums what was charged.
set -euo pipefail
cd "$(dirname "$0")/.."
endpoint="$1"; body="$(cat "$2")"; out="$3"
mkdir -p "$(dirname "$out")" media
usd=$(scripts/hf-api.sh POST "estimate/$endpoint" "$body" | jq -r '.usd')
echo "estimate $endpoint: \$$usd"
[[ "${HF_DRY:-}" == 1 ]] && exit 0
# HF_CAP_USD: refuse to submit if charged spend + open jobs' estimates + this estimate would cross the cap.
# Open jobs count as spent, so start parallel jobs a few seconds apart and each sees the ones before it.
if [[ -n "${HF_CAP_USD:-}" ]]; then
  committed=$(scripts/spend.sh | jq -r '.charged_usd + .open_usd')
  if jq -en --argjson c "$committed" --argjson e "$usd" --argjson cap "$HF_CAP_USD" '$c + $e > $cap' >/dev/null; then
    echo "STOP: committed \$$committed + estimate \$$usd > cap \$$HF_CAP_USD"; exit 3
  fi
  echo "committed \$$committed + estimate \$$usd <= cap \$$HF_CAP_USD"
fi
sub=$(HF_IDEMPOTENCY_KEY="$(basename "$out")-$(shasum <<<"$body" | cut -c1-12)" scripts/hf-api.sh POST "$endpoint" "$body")
id=$(jq -r '.request_id' <<<"$sub")
jq -cn --arg id "$id" --arg ep "$endpoint" --arg out "$out" --arg usd "$usd" --arg t "$(date -u +%FT%TZ)" \
  '{t:$t,id:$id,endpoint:$ep,out:$out,est_usd:$usd}' >> media/jobs.jsonl
echo "submitted $id"
while :; do
  st=$(scripts/hf-api.sh GET "requests/$id/status")
  case "$(jq -r '.status' <<<"$st")" in
    completed) jq -cn --arg id "$id" '{id:$id,status:"completed"}' >> media/jobs.jsonl; break ;;
    failed|nsfw|canceled)
      jq -cn --arg id "$id" --arg s "$(jq -r .status <<<"$st")" '{id:$id,status:$s}' >> media/jobs.jsonl
      echo "ended (not charged): $(jq -c '{status,error}' <<<"$st")"; exit 1 ;;
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
