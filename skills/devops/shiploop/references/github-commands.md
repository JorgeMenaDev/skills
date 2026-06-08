# GitHub Commands

Use these as command patterns, not a substitute for reading current GitHub state. Prefer idempotent commands and record issue/PR URLs in the ledger.

## Labels

```sh
gh label create shiploop --repo OWNER/REPO --color 0969da --description "Shiploop-managed run" || true
gh label create shiploop-ready --repo OWNER/REPO --color 2da44e --description "Shiploop phase ready to run" || true
gh label create shiploop-blocked --repo OWNER/REPO --color cf222e --description "Shiploop blocked" || true
gh label create shiploop-human-review --repo OWNER/REPO --color bf8700 --description "Shiploop awaiting human review" || true
```

## Issues

```sh
gh issue create --repo OWNER/REPO --title "<parent title>" --body-file <parent-body.md> --label shiploop
gh issue create --repo OWNER/REPO --title "<phase title>" --body-file <phase-body.md> --label shiploop
gh issue edit <phase-number> --repo OWNER/REPO --add-label shiploop-ready
gh issue comment <issue-number> --repo OWNER/REPO --body-file <comment.md>
gh issue edit <issue-number> --repo OWNER/REPO --remove-label shiploop-ready --add-label shiploop-blocked
gh issue close <phase-number> --repo OWNER/REPO --comment "Shiploop phase complete. Evidence is recorded above."
```

## Branches And PRs

```sh
git switch -c shiploop/<run-slug>
git push -u origin shiploop/<run-slug>
git switch -c shiploop/<run-slug>-phase-<n>
git push -u origin shiploop/<run-slug>-phase-<n>

gh pr create --repo OWNER/REPO --base shiploop/<run-slug> --head shiploop/<run-slug>-phase-<n> --title "<phase title>" --body-file <phase-pr.md>
gh pr checks <phase-pr-number> --repo OWNER/REPO --watch
gh pr merge <phase-pr-number> --repo OWNER/REPO --squash --delete-branch

gh pr create --repo OWNER/REPO --base main --head shiploop/<run-slug> --draft --title "<final title>" --body-file <final-pr.md>
gh pr ready <final-pr-number> --repo OWNER/REPO
gh issue edit <parent-issue-number> --repo OWNER/REPO --add-label shiploop-human-review
```

Only run merge commands after the gate rules permit it. Never merge the final PR into `main`; that is human-owned.
