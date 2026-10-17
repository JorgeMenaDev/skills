#!/usr/bin/env bash
# spend.sh sums media/jobs.jsonl: charged = completed jobs, refunded = failed/moderated/cancelled,
# open = submitted without a final status yet. `spend.sh --sync` asks the API for each open job's status
# first and logs the final ones (use it after a killed run or on a log from an older hf-gen.sh).
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" == --sync ]]; then
  for id in $(jq -rs '(map(select(.status)) | map(.id)) as $done | map(select(.est_usd and ((.id) as $i | $done | index($i) | not))) | .[].id' media/jobs.jsonl); do
    st=$(scripts/hf-api.sh GET "requests/$id/status" | jq -r .status)
    case "$st" in completed|failed|nsfw|canceled) jq -cn --arg id "$id" --arg s "$st" '{id:$id,status:$s}' >> media/jobs.jsonl ;; esac
  done
fi
jq -s '
  (map(select(.status)) | map({(.id): .status}) | add // {}) as $st
  | map(select(.est_usd)) as $jobs
  | {
      charged_usd:  ($jobs | map(select($st[.id] == "completed") | .est_usd | tonumber) | add // 0),
      refunded_usd: ($jobs | map(select($st[.id] and $st[.id] != "completed") | .est_usd | tonumber) | add // 0),
      open_usd:     ($jobs | map(select($st[.id] | not) | .est_usd | tonumber) | add // 0),
      open_jobs:    ($jobs | map(select($st[.id] | not) | .id))
    }' media/jobs.jsonl
