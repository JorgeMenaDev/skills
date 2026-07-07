# Salvage push — preserve committed work on failure/cancel (v2.4.0 contract).
# Extracted from the workflow's inline step (v2.5.0); runs host-side on every
# lane (v2.6.0 — the vercel lane's sync-out lands completed phases' commits on
# the host checkout, which is what there is to save).
# Env: BRANCH (required), GITHUB_RUN_ID, GITHUB_OUTPUT (optional).
set -euo pipefail
git rev-parse --verify HEAD >/dev/null 2>&1 || { echo "no HEAD — nothing to salvage"; exit 0; }
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "wip(salvage): uncommitted state at run failure (run ${GITHUB_RUN_ID:-unknown})" || true
fi
base=$(git rev-parse "origin/{{BASE_BRANCH}}")
head=$(git rev-parse HEAD)
if [ "$head" = "$base" ]; then
  echo "no commits beyond {{BASE_BRANCH}} — nothing to salvage"
  exit 0
fi
git push --force origin "HEAD:refs/heads/${BRANCH}"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "salvaged=true" >> "$GITHUB_OUTPUT"
fi
echo "Salvaged $(git rev-list --count "$base".."$head") commit(s) to $BRANCH"
