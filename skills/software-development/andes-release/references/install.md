# Installing releases in a repo

Done once per repo, as one PR. Completion: a pushed test tag produces a GitHub Release, and the real releases the repo already shipped exist as tags.

Before touching a repo that already cuts releases, inspect its release grammar and workflow first. A repo on a different grammar gets a deliberate install migration — new workflow, backfill, docs — before any new tag. Identify repo-owned legacy notes anchors (or confirm none exist) before generating the workflow. This migration preserves historical tags and duplicates no recorded versions; a deliberately requested different migration needs its own explicit plan. Never silently migrate by tagging, and never add a compatibility fallback that cuts old-grammar tags.

## 1. The release workflow

Add `.github/workflows/release.yml`. It runs on tag push, refuses shas that are not on `main`, and publishes the release with generated notes from the previous tag of the same platform line. It runs no checks of its own: a sha on `main` already passed the repo's PR CI, and a release job that re-runs a wider gate than PR CI fails on tags for reasons unrelated to the release.

```yaml
name: Release
on:
  push:
    tags: ["mobile-ios-v*", "mobile-android-v*", "web-v*"]
concurrency:
  group: release-${{ github.ref_name }}
  cancel-in-progress: false
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
        env:
          GH_TOKEN: "${{ github.token }}"
          # Repo-owned migration anchors; empty for repos with no legacy history.
          IOS_ANCHOR: ""
          IOS_BUILD_ANCHOR: ""
          ANDROID_ANCHOR: ""
          ANDROID_BUILD_ANCHOR: ""
        run: |
          set -euo pipefail
          # Validate all configured anchors before publication, even if not used today.
          for anchor in "$IOS_ANCHOR" "$IOS_BUILD_ANCHOR" "$ANDROID_ANCHOR" "$ANDROID_BUILD_ANCHOR"; do
            if [[ -n "$anchor" ]]; then
              git rev-parse --verify "refs/tags/$anchor^{commit}" >/dev/null || {
                echo "Missing or non-commit configured anchor: $anchor" >&2; exit 1;
              }
            fi
          done
          tag="$GITHUB_REF_NAME"
          source="$(git rev-parse --verify "$GITHUB_SHA^{commit}")"
          [[ "$(git rev-parse --verify "refs/tags/$tag^{commit}")" == "$source" ]] || {
            echo "Tag source mismatch: $tag" >&2; exit 1;
          }
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
          if [[ -z "$prev" ]]; then
            case "$line/$shape" in
              mobile-ios/release) prev="$IOS_ANCHOR" ;;
              mobile-ios/prerelease) prev="$IOS_BUILD_ANCHOR" ;;
              mobile-android/release) prev="$ANDROID_ANCHOR" ;;
              mobile-android/prerelease) prev="$ANDROID_BUILD_ANCHOR" ;;
            esac
          fi
          args=(--title "$tag")
          if [[ -z "$prev" && "$line" == mobile-* ]]; then
            args+=(--notes "Initial $line release. Source: $source. Build and submission evidence is recorded in the production run; store receipt remains manually verified.")
          else
            args+=(--generate-notes)
          fi
          [[ -n "$prev" ]] && args+=(--notes-start-tag "$prev")
          [[ "$shape" == prerelease ]] && args+=(--prerelease)
          if published_shape="$(gh release view "$tag" --json isPrerelease --jq .isPrerelease)"; then
            expected=false; [[ "$shape" == prerelease ]] && expected=true
            [[ "$published_shape" == "$expected" ]] || {
              echo "Existing release shape mismatch: $tag" >&2; exit 1;
            }
            echo "Already published: $tag"; exit 0
          fi
          # --verify-tag refuses a missing remote tag; it never invents one at main.
          gh release create "$tag" --verify-tag "${args[@]}"
```

The title can be prettified per repo (`Andy Partner iOS 1.0.1 (24)`); the tag stays the contract. The published tag records the tag the workflow cut — build vs submission vs store-live state lives in the production run summary and the ticket, never in the release title. For Andy only, configure `IOS_ANCHOR=mobile-v1.0.1` and `IOS_BUILD_ANCHOR=mobile-v1.0.1-build.24`; these existing legacy tags are notes boundaries, never new tags. Other repos supply their own anchors or leave them empty. Validate every configured anchor with `git rev-parse --verify "refs/tags/$anchor^{commit}"` before any tag mutation. First mobile releases without history get explicit provenance notes; web keeps generated notes even without a previous tag.

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

Backfill only genuinely unrecorded shipped versions: check all historical grammars first. A version already recorded under `mobile-v*` stays there and supplies a notes boundary; do not relabel it under `mobile-ios-v*`. Andy therefore backfills no historical mobile tags in this migration. Old tags are never moved or duplicated. For an unrecorded stable version, verify its public store receipt and exact approved build metadata first; a newer build is irrelevant.

Example for a repo whose iOS 1.2.0 shipped but has no stable tag under any grammar. Set `APPROVED_SHA` from that approved build's metadata, and validate configured anchors before running:

```bash
set -euo pipefail
TAG=mobile-ios-v1.2.0
SHA="$(git rev-parse --verify "${APPROVED_SHA:?approved build source required}^{commit}")"
git fetch origin --tags
git merge-base --is-ancestor "$SHA" origin/main
if git show-ref --verify --quiet "refs/tags/$TAG"; then
  [[ "$(git rev-parse "refs/tags/$TAG^{commit}")" == "$SHA" ]] || exit 1
else
  git tag "$TAG" "$SHA"
  git push origin "refs/tags/$TAG"
fi
```

Binary tags remain production-workflow owned: recover the exact FINISHED build there, never hand-cut a duplicate. Both backfill and recovery distinguish tag identity from publication:

1. Inspect `git cat-file -e "$SHA:.github/workflows/release.yml"` to establish workflow presence at the tagged commit. Presence alone proves neither triggering nor success; a commit predating the workflow cannot run that absent workflow.
2. Check `gh release view "$TAG"` and the actual release workflow runs for this tag/source (`gh run list --workflow release.yml`, then `gh run view <run-id>`). Wait for queued/in-progress publishers; inspect failures and prefer rerunning the failed publication job. Do not race a workflow with manual publication. An authentication/network error is not proof the Release is absent.
3. Only after confirming the Release is missing and no publisher is active or pending, recover publication using the exact **Publish** Bash body above (including its anchor environment), preceded by the off-main guard. Set `GITHUB_REF_NAME="$TAG"` and `GITHUB_SHA="$SHA"` from verified provenance, not the branch tip. It verifies the existing local tag's exact source, checks existing publication/shape, and uses `gh release create "$tag" --verify-tag` with the same notes/shape flags. A missing remote tag refuses publication; recover tag creation in its owning flow first. Never move an existing tag to repair publication.

A successful actual run plus the matching GitHub Release proves the workflow end to end. Record both links; workflow presence or a same-SHA tag alone does not.

## 4. Document

`docs/releases.md` in the repo: one sentence per line (iOS follows the App Store, Android follows Google Play, web is named on demand), the build-vs-submission-vs-live distinction, and a pointer to this skill. Register the convention in the fleet `STACK.md` row for the product.
