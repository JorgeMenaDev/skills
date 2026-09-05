# Installing releases in a repo

Done once per repo, as one PR. Completion: a pushed test tag produces a GitHub Release, and the real releases the repo already shipped exist as tags.

Before touching a repo that already cuts releases, inspect its release grammar and workflow first. A repo on a different grammar gets a deliberate install migration — new workflow, backfill, docs — before any new tag. Never silently migrate by tagging, and never add a compatibility fallback that cuts old-grammar tags.

## 1. The release workflow

Add `.github/workflows/release.yml`. It runs on tag push, refuses shas that are not on `main`, and publishes the release with generated notes from the previous tag of the same platform line. It runs no checks of its own: a sha on `main` already passed the repo's PR CI, and a release job that re-runs a wider gate than PR CI fails on tags for reasons unrelated to the release.

```yaml
name: Release
on:
  push:
    tags: ["mobile-ios-v*", "mobile-android-v*", "web-v*"]
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - name: Refuse tags off main
        run: git merge-base --is-ancestor "$GITHUB_SHA" origin/main
      - name: Publish
        env: { GH_TOKEN: "${{ github.token }}" }
        run: |
          set -euo pipefail
          tag="$GITHUB_REF_NAME"
          line="${tag%%-v*}"
          version="${tag#*-v}"
          shape="release"; [[ "$version" == *-* ]] && shape="prerelease"
          case "$line" in
            mobile-ios|mobile-android|web) ;;
            *) echo "unknown release line: $line" >&2; exit 1 ;;
          esac
          if [[ "$shape" == prerelease ]]; then
            prev="$(git tag -l "${line}-v*" --sort=-v:refname | grep -v "^${tag}$" | head -1 || true)"
          else
            prev="$(git tag -l "${line}-v*" --sort=-v:refname | grep -E "^${line}-v[0-9]+(\.[0-9]+){1,2}$" | grep -v "^${tag}$" | head -1 || true)"
          fi
          if [[ -z "$prev" && "$line" == mobile-ios ]]; then
            prev=mobile-v1.0.1
            [[ "$shape" == prerelease ]] && prev=mobile-v1.0.1-build.24
          fi
          args=(--title "$tag")
          if [[ -z "$prev" && "$line" == mobile-android ]]; then
            args+=(--notes "Initial Android release. Source: $GITHUB_SHA. Build and submission evidence is recorded in the production run; store receipt remains manually verified.")
          else
            args+=(--generate-notes)
          fi
          [[ -n "$prev" ]] && args+=(--notes-start-tag "$prev")
          [[ "$shape" == prerelease ]] && args+=(--prerelease)
          gh release create "$tag" "${args[@]}"
```

The title can be prettified per repo (`Andy Partner iOS 1.0.1 (24)`); the tag stays the contract. The published tag records the tag the workflow cut — build vs submission vs store-live state lives in the production run summary and the ticket, never in the release title. The `mobile-v*` fallbacks above are the historical first-iOS boundary, not a second grammar: nothing in this file may create a bare `mobile-v*` tag.

## 2. Tagging from the production workflow

The mobile prerelease tags are cut by the workflow that built the binary, so no one has to remember them — and this section alone is what makes that true. `release.yml` by itself publishes whatever tag is pushed; without a production workflow installed, no build tag appears automatically.

Call the repo's production workflow (manual dispatch, per platform) and specify these requirements; do not copy a repo-specific build implementation into this generic skill:

- It builds from a sha already on `origin/main` and refuses anything else before mutating.
- After each `FINISHED` build it verifies build identity (project, platform, package identifier, production profile, exact source sha) and reads `appVersion` / `appBuildVersion` from the finished build's metadata — never from the app config or the branch tip.
- It pushes `mobile-<platform>-v<version>-build.<n>` at that exact source sha. Same tag on the same sha is idempotent; a tag already on another sha stops the run.
- The push uses a token that can trigger workflows; the default `GITHUB_TOKEN` does not start `release.yml` from a tag it pushes. Use the repo's release app token or a fine-grained PAT stored as a secret — the same automation credential the repo already uses. Never embed a secret in the skill or assume one exists.
- On any failure it stops and leaves build/submission/metadata/tag evidence in the run for inspection. Never manually duplicate a binary tag the workflow owns; inspect and recover in the workflow.

The stable tags (`mobile-ios-v<version>`, `mobile-android-v<version>`) stay manual: they are cut the day the store confirms the version live, by whoever released it, at the exact sha of the approved build, using the store-live branches in `SKILL.md`.

## 3. Backfill

Create the tags for releases that already happened, oldest first, so generated notes have a start tag:

```bash
# SHA = sha of the approved 1.0 build
git tag mobile-ios-v1.0 "$SHA" && git push origin mobile-ios-v1.0
```

Tag only what really shipped: store-live versions and the current build of each platform. Old builds nobody can install are history, not releases. Never move or re-cut the pre-platform `mobile-v*` tags; the first iOS notes start explicitly at them, and the first Android notes are explicit initial-release notes.

A backfill tag never triggers `release.yml`: GitHub runs the workflow file that exists **at the tagged commit**, and those commits predate it. Create each backfill release directly, oldest first, with the same flags the workflow would use:

```bash
gh release create mobile-ios-v1.0.1 --title "<Product> iOS 1.0.1" --generate-notes --notes-start-tag mobile-v1.0.1
gh release create mobile-ios-v1.0.1-build.25 --title "<Product> iOS 1.0.1 (25)" --prerelease --generate-notes --notes-start-tag mobile-v1.0.1-build.24
```

The first tag at or after the commit that added the workflow is the one that proves it end to end.

## 4. Document

`docs/releases.md` in the repo: one sentence per line (iOS follows the App Store, Android follows Google Play, web is named on demand), the build-vs-submission-vs-live distinction, and a pointer to this skill. Register the convention in the fleet `STACK.md` row for the product.
