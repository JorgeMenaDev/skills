---
name: andes-release
description: Tag and publish GitHub Releases for Andes products so the repo's release history matches the stores and production. Separate iOS and Android version lines plus web. Use when a production build finishes, Apple or Play confirms a version live, a batch of web PRs is worth naming, a repo has no release workflow yet, or someone asks which version is live.
version: 1.0.3
license: MIT
mutating: true
writes_to: ["git tags", "GitHub Releases", ".github/workflows/release.yml in the target repo", "docs/releases.md in the target repo"]
---

# Andes release

A GitHub Release records the tag the release workflow published. Build, submission, and store-live are separate evidence states: a `FINISHED` binary is never a store receipt, an internal-track submission (TestFlight, Play Internal) is never public-live, and that state lives in the production run summary and the ticket — never in the release title. A tag never declares store truth; only the stores (App Store Connect, Play Console) say what is live.

iOS follows the App Store, Android follows Google Play, web is named on demand. Tag grammar and rules: [references/conventions.md](references/conventions.md). Installing the workflow in a repo: [references/install.md](references/install.md).

Each repo has its own release grammar and workflow. Inspect it before tagging: never assume another repo works like Andy, never silently migrate one, and never add a compatibility fallback that cuts old-grammar tags.

## Preamble

Run this first, from the repo root. Branch only on what it prints.

```bash
git fetch -q origin --tags
echo "IOS_LAST=$(git tag -l 'mobile-ios-v*' --sort=-v:refname | head -1)"
echo "IOS_LAST_RELEASE=$(git tag -l 'mobile-ios-v*' --sort=-v:refname | grep -E '^mobile-ios-v[0-9]+(\.[0-9]+){1,2}$' | head -1)"
echo "ANDROID_LAST=$(git tag -l 'mobile-android-v*' --sort=-v:refname | head -1)"
echo "ANDROID_LAST_RELEASE=$(git tag -l 'mobile-android-v*' --sort=-v:refname | grep -E '^mobile-android-v[0-9]+(\.[0-9]+){1,2}$' | head -1)"
echo "WEB_LAST=$(git tag -l 'web-v*' --sort=-v:refname | head -1)"
echo "APP_VERSION=$(jq -r .expo.version apps/mobile/app.json 2>/dev/null || jq -r .expo.version apps/mobile/app.config.json 2>/dev/null)"
echo "WORKFLOW=$(test -f .github/workflows/release.yml && echo present || echo missing)"
echo "MAIN=$(git rev-parse --short origin/main)"
```

`APP_VERSION` is supporting evidence only: read it from the repo's dynamic app config (`app.json`, `app.config.*`, or finished-build metadata) — whichever the repo uses. A missing `app.json` says nothing about what is live.

`WORKFLOW=missing` → go to [references/install.md](references/install.md) before any tag; a tag with no workflow publishes nothing.

## Branches

**A production build finished.** The production workflow cuts the platform prerelease tag itself — `mobile-ios-v<version>-build.<n>` or `mobile-android-v<version>-build.<n>` — at the exact `main` sha it built, and pushes it; the release workflow publishes the prerelease. Do not cut it by hand and do not duplicate it. If the tag is missing after a `FINISHED` build, inspect the run's build/submission/metadata/tag evidence and recover there. Done when `gh release view <tag>` shows `isPrerelease: true`, the sha matches the built sha, and the notes start at the previous tag on the same platform line.

**Apple confirmed the iOS version live.** Input: the confirmed public store-live state (`READY_FOR_SALE` / confirmed public listing — a submission or review state is not this). Tag `mobile-ios-v<version>` by hand at the exact sha of the build Apple approved (the same sha as its `-build.<n>` prerelease). Done when `gh release view mobile-ios-v<version>` shows `isPrerelease: false` and the tag sits on the same commit as the last prerelease of that version.

**Play confirmed the Android version live.** Same shape on the Android line: `mobile-android-v<version>` by hand at the exact sha of its approved `-build.<n>` prerelease, only on confirmed public store-live state. An Internal-track rollout is never this trigger.

**A batch of web PRs is worth naming.** Input: the sha currently serving production (the Vercel production deployment of `main`). Choose the next `web-v<semver>` from `WEB_LAST` by the biggest change in the batch. Tag at that sha and push. Done when `gh release view web-v<semver>` lists the merged PR titles since `WEB_LAST`.

**Someone asks which version is live.** Answer per platform from the preamble and the stores, never from memory: `IOS_LAST_RELEASE` is what the App Store serves, `IOS_LAST` is the newest iOS build recorded, `ANDROID_LAST_RELEASE` / `ANDROID_LAST` the same for Play, `WEB_LAST` is the last named web release, and `MAIN` may be ahead of all of them. Never infer actual store state from the latest tag, the app config, or the branch tip.

## STOP gates

- The sha is not on `origin/main` (`git merge-base --is-ancestor <sha> origin/main` fails) → STOP. A release must be reproducible from `main`; tagging a branch sha records a build nobody can rebuild.
- The build is not `FINISHED`, or the store version is not confirmed public-live → STOP. The tag would claim users have something they do not.
- The tag already exists on another sha → STOP and report. Never move a tag; cut the next build or patch version instead. The same tag on the same sha is already done (idempotent) — report it, do not re-push blindly.
- A binary tag the production workflow owns (`mobile-ios-v*-build.*`, `mobile-android-v*-build.*`) → STOP, do not hand-cut it. The workflow handles binary tags; inspect its run on failure.
- The only provenance is the app config version or the default-branch tip → STOP. Provenance is finished-build metadata and store receipts, never config or tip.
- Old-grammar tags (`mobile-v1.0.1`, `mobile-v1.0.1-build.24`) → never move, repurpose, or re-cut them. They are the immutable historical boundary for the first iOS notes.
- A release note mentions plans, prices, or purchases for an iOS line → STOP. App Review has our on-record statement that the iOS app sells nothing; the repo's App Review tracker holds the wording limits.

## Record

The GitHub Release is the record. Link it from the release tracker issue of that version in one line, same pass. Record the exact provenance alongside it in the run summary and the ticket: build IDs, artifact URL, fingerprint hash, submission IDs, and store receipt links. Nothing is copied into a vault or a doc.

## Anti-patterns

- Equating a build or a tag with live store delivery. `FINISHED`, submitted, and live are three different states with three different pieces of evidence.
- Tagging every push to `main` as a web release. Continuous deploy stays; the tag names a batch worth telling someone about.
- One shared version for mobile and web, or one shared mobile line for iOS and Android. The App Store number must never wait for a web batch or a Play rollout.
- Inferring what is live from the latest tag. Tags record; the stores declare.
- Hand-written changelogs. Notes are generated from merged PR titles since the previous tag on the same line, so the PR title is the changelog entry; the `file-pr` skill owns that title.
- Marking a prerelease as latest. Latest is a store release or a web release only.
- Migrating another product repo to this grammar by tagging. Grammar changes go through a deliberate install migration first ([references/install.md](references/install.md)).
