# GitHub autopilot

Read this reference in full only when the invocation contains both `autopilot` and a GitHub issue URL for the implementation spec. This branch preserves the normal conductor contract except for the ticket executor's explicitly allowed GitHub actions below.

## Intake preamble

Run this preamble with the exact spec URL from the invocation. Branch only on its named tokens; do not infer state from prose or memory.

```bash
SPEC_URL='<exact GitHub issue URL from the invocation>'
if [[ "$SPEC_URL" =~ ^https://github\.com/([^/]+)/([^/]+)/issues/([0-9]+)$ ]]; then
  REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"; SPEC_NUMBER="${BASH_REMATCH[3]}"
else
  echo 'SPEC_STATE: invalid_url'; exit 0
fi
if ! gh auth status >/dev/null 2>&1 || ! SPEC_JSON="$(gh issue view "$SPEC_NUMBER" -R "$REPO" --json url,title,body)"; then
  echo 'SPEC_STATE: unavailable'; exit 0
fi
DEFAULT_BRANCH="$(gh repo view "$REPO" --json defaultBranchRef -q .defaultBranchRef.name)"
TITLE="$(jq -r .title <<<"$SPEC_JSON")"; BODY="$(jq -r .body <<<"$SPEC_JSON")"
CANDIDATES="$(awk '/^## Integration branch[[:space:]]*$/{inside=1; next} /^## /{inside=0} inside{print}' <<<"$BODY" | sed -nE -e 's/^[[:space:]]*The canonical integration branch is `([^`]+)`\.[[:space:]]*$/\1/p' -e 's/^[[:space:]]*Canonical integration branch:[[:space:]]*`([^`]+)`\.?[[:space:]]*$/\1/p' -e 's/^[[:space:]]*`([^`]+)`\.?[[:space:]]*$/\1/p' | sort -u)"
CANDIDATE_COUNT="$(sed '/^$/d' <<<"$CANDIDATES" | wc -l | tr -d ' ')"
if [[ "$CANDIDATE_COUNT" -gt 1 ]]; then INTEGRATION_STATE=ambiguous; INTEGRATION_REF_STATE=unknown
else
  if [[ "$CANDIDATE_COUNT" == 0 ]]; then
    SLUG="$(tr '[:upper:]' '[:lower:]' <<<"$TITLE" | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-$//' | cut -c1-48 | sed 's/-$//')"
    INTEGRATION_BRANCH="feature/$SPEC_NUMBER-${SLUG:-spec}"; INTEGRATION_SOURCE=derived
  else
    INTEGRATION_BRANCH="$CANDIDATES"; INTEGRATION_SOURCE=declared
  fi
  if ! git check-ref-format --branch "$INTEGRATION_BRANCH" >/dev/null 2>&1; then INTEGRATION_STATE=ambiguous; INTEGRATION_REF_STATE=unknown
  else
    INTEGRATION_STATE="$INTEGRATION_SOURCE:$INTEGRATION_BRANCH"
    if ! REF_JSON="$(gh api graphql -f query='query($owner:String!,$name:String!,$ref:String!){repository(owner:$owner,name:$name){ref(qualifiedName:$ref){name}}}' -f owner="${REPO%%/*}" -f name="${REPO#*/}" -f ref="refs/heads/$INTEGRATION_BRANCH")"; then INTEGRATION_REF_STATE=unavailable
    elif [[ "$(jq -r '.data.repository.ref != null' <<<"$REF_JSON")" == true ]]; then INTEGRATION_REF_STATE=exists
    else INTEGRATION_REF_STATE=missing
    fi
  fi
fi
OVERRIDE=.agents/engine-override.json
if [[ ! -e "$OVERRIDE" ]]; then OVERRIDE_STATE=absent
elif jq -e 'type == "object" and (.harness | type == "string") and (.runtimeSkill | type == "string") and (.model | type == "string")' "$OVERRIDE" >/dev/null 2>&1; then OVERRIDE_STATE=active
else OVERRIDE_STATE=malformed
fi
printf 'SPEC_STATE: valid:%s#%s\nDEFAULT_STATE: current:%s\nINTEGRATION_STATE: %s\nINTEGRATION_REF_STATE: %s\nOVERRIDE_STATE: %s\n' "$REPO" "$SPEC_NUMBER" "$DEFAULT_BRANCH" "$INTEGRATION_STATE" "$INTEGRATION_REF_STATE" "$OVERRIDE_STATE"
```

STOP unless `SPEC_STATE` is `valid:<owner>/<repo>#<number>`. **Inventing or operating on an unverified spec is the failure mode.** STOP when `INTEGRATION_STATE` is `ambiguous` or the remote-ref query failed; repair the spec declaration or state query before proceeding. **Splitting one spec across competing integration branches is the failure mode.** A malformed override is off plus a warning, as in the core skill.

## Ticket set and frontier

The implementation ticket set is exact: query repository issues and include an issue only when its `## Parent` section contains the canonical spec URL, either literally or as the exact target of a Markdown link. A title match, `#N`, backlink, mention elsewhere, or sub-issue relationship does not establish membership. Recompute this set at intake and before each frontier dispatch.

Native GitHub `blockedBy` relationships are the sole dependency authority. A member is on the frontier only when every native blocker is closed and its accepted code is present on the integration branch. No native blockers means dependency-eligible. Body prose cannot add or clear an edge. Native sub-issues are a consistency check only: record missing or extra relationships as tracker drift, but never use them to add members, remove members, or decide eligibility.

STOP before dispatch when membership or native dependency state cannot be read live. **Fuzzy membership and guessed edges are the failure modes.**

## Integration branch and waves

Use the branch emitted by `INTEGRATION_STATE`: the one distinct canonical declaration in `## Integration branch`, or the deterministic `feature/<spec-number>-<short-title-slug>` default when there is no canonical declaration. Explanatory lines and bullets do not declare another branch; more than one distinct canonical declaration is ambiguous. If `INTEGRATION_REF_STATE` is `exists`, fetch it, compare it with the live default branch, and resume its ticket PRs and evidence. If it is `missing`, create it from the current default SHA and record the exact branch on the spec before dispatch. One spec has one integration branch. Every ticket PR targets it.

Dispatch every currently eligible member as a frontier wave, subject to collision and shared-resource serialization. Recompute exact membership, native blockers, integration ancestry, open ticket PRs, and claimed work before every dispatch. A wave is only a reporting view; dispatch the next ticket as soon as its blockers are accepted and merged into integration.

## Capability-aware routing

Classify each ticket before selecting a route. Read the spec and ticket acceptance criteria, every `Verifies` reference, linked Gherkin scenarios, pipeline metadata, and required evidence. Set `vision: true` when acceptance requires interpreting rendered pixels, images, video, visual comparison, layout, or taste. Set `computerUse: true` when proof requires an interactive browser or desktop flow. Gherkin alone does not imply vision: its steps and evidence contract decide the capabilities.

Each primary or fallback route in an active override may declare `capabilities: { "vision": true|false, "computerUse": true|false }`. A required capability is satisfied only by literal `true`; `false` or a missing key is a pre-launch `capability_mismatch`. Record the candidate, requirement, and mismatch, then evaluate the next ordered fallback without launching the incapable route. If no declared override route is capable, report `BLOCKED` with the unmet criterion and required capability; preserve the original evidence bar rather than substituting weaker proof. When `OVERRIDE_STATE` is `absent` or `malformed`, use normal native capability routing; missing override metadata does not itself block work.

The conductor/orchestrator route and final browser or desktop verification lanes remain override carve-outs. Select those through the workspace's normal routing contract, outside per-ticket override fallbacks.

## Executor and conductor contracts

The conductor creates or assigns the isolated ticket branch/worktree and stamps the brief with required capabilities, selected route, ticket PR base, allowed GitHub actions, and conductor-reserved actions. The executor may edit only its owned scope, commit and push only its assigned branch, and open or update exactly one ticket PR whose base is the integration branch. It runs relevant existing checks and the predefined ticket-scoped Gherkin; browser or visual Gherkin runs only on a route with the required capabilities. It adds the ticket's verification recap and returns the PR identity plus exact head SHA in its report.

The executor never runs `autoreview`, the full Gherkin suite, or accumulated integration UI checks. It never reviews or merges a PR, mutates issue relationships/state/labels, updates the integration or final PR, deletes branches/worktrees, or performs a final gate. The conductor binds its diff/evidence verdict to the exact ticket PR head SHA. Failure retains the worktree and returns one consolidated correction note to the same executor. Acceptance defaults to squash merge unless the repo or spec declares another strategy; then the conductor explicitly closes the child ticket, confirms the merged code is present, and performs cleanup before unblocking dependents.

Keep tracker progress conductor-owned and singular. Update the existing spec progress surface after membership reconciliation, dispatch, PR creation, acceptance/merge, blocked state, and evidence invalidation; record ticket, route, PR, integration SHA, proof, and next frontier without creating duplicate status surfaces.

## Convergence, cleanup, and handoff

After every member ticket is accepted and merged, run one final convergence phase on the integration branch. Reconcile every spec criterion, run full-branch iterative `autoreview`, address its findings, and repeat until it reports no accepted or actionable findings. Then run the complete linked Gherkin set and all accumulated UI checks through their required lanes. Any code change invalidates all prior convergence evidence: restart full-branch `autoreview` to the same zero-finding gate, then rerun the complete Gherkin and accumulated UI pass before handoff.

After each accepted merge, stop the owned runtime and browser sessions, remove only the ticket worktree, and delete only branches proven merged and no longer needed. Preserve the integration branch and final evidence through review. Follow `integration-traps.md` for all cleanup and multi-branch integration.

Keep the parent spec open throughout ticket execution. Only after convergence, open one final PR from the integration branch to the live default branch with `Closes #<spec-number>` in its body; on resume, reconcile a pre-existing final PR before continuing. Mark it ready only when convergence evidence is current, and hand it off with exact spec membership, ticket PRs/SHAs, review results, full evidence matrix, gaps, and explicit next owner. GitHub autopilot never merges that final PR and never deploys, pays, or performs a production mutation.

STOP before final handoff if any member, criterion, review finding, current evidence, cleanup ownership, or final PR field is unresolved. **A ready PR backed by stale or incomplete convergence is the failure mode.**
