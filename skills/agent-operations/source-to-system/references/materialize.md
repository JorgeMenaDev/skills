# Materialize an Approved Improvement

Read the workspace instructions again before mutating anything; they define repositories, trackers, knowledge locations, execution lanes, branches, approvals, and verification.

1. **Choose the smallest coordination artifact.** Prefer amending an existing owner. Otherwise use the workspace's configured issue, brief, pull request, decision record, knowledge note, or operational record. Finish when the artifact has one outcome, owner, scope, non-goals, risks, dependencies, and observable acceptance criteria.
2. **Route execution.** Send each slice to the system that owns its state, using the workspace's normal lane. Link dependent artifacts to the coordination artifact when the system supports backlinks; otherwise record their stable locators in the coordination artifact. Finish when every slice has exactly one owner and dependency order is explicit.
3. **Verify.** Require evidence appropriate to the claim: inspected source, isolated execution, existing checks, visible UI state, provider state, measured outcome, or an authoritative record. Finish when every acceptance criterion points to observed evidence.
4. **Close.** Update the coordination artifact with results and remaining uncertainty. Close or merge only when the criteria are proven; otherwise keep the owning work open with one next action.

A post-approval run is complete when every approved change has one authoritative owner, every dependent artifact is connected by a backlink or recorded stable locator, every acceptance criterion has observed evidence, and duplicate state has not been created.
