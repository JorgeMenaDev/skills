---
name: andes-release
description: Tag and publish GitHub Releases for Andes products so the repo's release history matches the stores and production. Two independent version lines per repo, mobile and web. Use when a TestFlight build finishes, Apple approves a version, a batch of web PRs is worth naming, a repo has no release workflow yet, or someone asks which version is live.
version: 1.0.2
license: MIT
mutating: true
writes_to: ["git tags", "GitHub Releases", ".github/workflows/release.yml in the target repo", "docs/releases.md in the target repo"]
---

# Andes release

A GitHub Release is the record that a specific `main` commit reached users. Mobile follows the store: every TestFlight build is a prerelease, every App Store approval is a release. Web is released on demand, not on every push. Everything else about versioning, deploying, and the store lives elsewhere: `mobile-monorepo-ios` for EAS and App Store Connect, the repo's own workflows for deploys. Tag grammar and rules: [references/conventions.md](references/conventions.md). Installing the workflow in a repo: [references/install.md](references/install.md).

## Preamble

Run this first, from the repo root. Branch only on what it prints.

```bash
git fetch -q origin --tags
echo "MOBILE_LAST=$(git tag -l 'mobile-v*' --sort=-v:refname | head -1)"
echo "MOBILE_LAST_RELEASE=$(git tag -l 'mobile-v*' --sort=-v:refname | grep -E '^mobile-v[0-9]+(\.[0-9]+){1,2}$' | head -1)"
echo "WEB_LAST=$(git tag -l 'web-v*' --sort=-v:refname | head -1)"
echo "APP_VERSION=$(jq -r .expo.version apps/mobile/app.json 2>/dev/null)"
echo "WORKFLOW=$(test -f .github/workflows/release.yml && echo present || echo missing)"
echo "MAIN=$(git rev-parse --short origin/main)"
```

`WORKFLOW=missing` → go to [references/install.md](references/install.md) before any tag; a tag with no workflow publishes nothing.

## Branches

**A TestFlight build finished.** Inputs: the app version and build number from the FINISHED EAS build, and the `main` sha it was built from (the EAS run's head sha). Tag `mobile-v<version>-build.<n>` at that sha and push it. The workflow publishes the prerelease. Done when `gh release view mobile-v<version>-build.<n>` shows `isPrerelease: true`, the sha matches, and the notes start at the previous mobile tag.

**Apple approved and the version is live.** Input: the App Store version state `READY_FOR_SALE`. Tag `mobile-v<version>` at the sha of the build Apple approved (the same sha as its `-build.<n>` prerelease). Done when `gh release view mobile-v<version>` shows `isPrerelease: false` and the tag sits on the same commit as the last prerelease of that version.

**A batch of web PRs is worth naming.** Input: the sha currently serving production (the Vercel production deployment of `main`). Choose the next `web-v<semver>` from `WEB_LAST` by the biggest change in the batch. Tag at that sha and push. Done when `gh release view web-v<semver>` lists the merged PR titles since `WEB_LAST`.

**Someone asks which version is live.** Answer from the preamble and the stores, never from memory: `MOBILE_LAST_RELEASE` is what the App Store serves, `MOBILE_LAST` is what TestFlight has, `WEB_LAST` is the last named web release, and `MAIN` may be ahead of all three.

## STOP gates

- The sha is not on `origin/main` (`git merge-base --is-ancestor <sha> origin/main` fails) → STOP. A release must be reproducible from `main`; tagging a branch sha records a build nobody can rebuild.
- The EAS build is not `FINISHED`, or the App Store version is not `READY_FOR_SALE` → STOP. The tag would claim users have something they do not.
- The tag already exists on another sha → STOP and report. Never move a tag; cut the next build or patch version instead.
- A release note mentions plans, prices, or purchases for an iOS line → STOP. App Review has our on-record statement that the iOS app sells nothing; the repo's App Review tracker holds the wording limits.

## Record

The GitHub Release is the record. Link it from the release tracker issue of that version in one line, same pass. Nothing is copied into a vault or a doc.

## Anti-patterns

- Tagging every push to `main` as a web release. Continuous deploy stays; the tag names a batch worth telling someone about.
- One shared version for web and mobile. The App Store number must never wait for a web batch.
- Hand-written changelogs. Notes are generated from merged PR titles since the previous tag on the same line, so the PR title is the changelog entry; the `file-pr` skill owns that title.
- Marking a TestFlight prerelease as latest. Latest is a store release or a web release only.
