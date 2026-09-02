# Installing releases in a repo

Done once per repo, as one PR. Completion: a pushed test tag produces a GitHub Release, and the two real releases the repo already shipped exist as tags.

## 1. The release workflow

Add `.github/workflows/release.yml`. It runs on tag push, refuses shas that are not on `main`, runs the repo's checks, and publishes the release with generated notes from the previous tag of the same line.

```yaml
name: Release
on:
  push:
    tags: ["mobile-v*", "web-v*"]
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
      - uses: oven-sh/setup-bun@v2
        with: { bun-version-file: package.json }
      - run: bun install --frozen-lockfile
      - run: bun run check
      - name: Publish
        env: { GH_TOKEN: "${{ github.token }}" }
        run: |
          tag="${GITHUB_REF_NAME}"
          line="${tag%%-v*}"
          shape="release"; [[ "$tag" == *-* && "${tag#*-v}" == *-* ]] && shape="prerelease"
          if [[ "$shape" == prerelease ]]; then
            prev="$(git tag -l "${line}-v*" --sort=-v:refname | grep -v "^${tag}$" | head -1)"
          else
            prev="$(git tag -l "${line}-v*" --sort=-v:refname | grep -E "^${line}-v[0-9]+(\.[0-9]+){1,2}$" | grep -v "^${tag}$" | head -1)"
          fi
          args=(--generate-notes)
          [[ -n "$prev" ]] && args+=(--notes-start-tag "$prev")
          [[ "$shape" == prerelease ]] && args+=(--prerelease)
          gh release create "$tag" --title "$tag" "${args[@]}"
```

Adjust `bun run check` to the repo's real check script and the bun version pin to what the repo's other workflows use. The title can be prettified per repo (`Andy Partner 1.0.1 (24) · TestFlight`); the tag stays the contract.

## 2. Tagging from the EAS workflow

The mobile prerelease tag should be cut by the workflow that built the binary, so no one has to remember it. In the EAS production workflow, after `eas build` (drop `--no-wait`, or add a wait step that polls `eas build:view --json` until `FINISHED`), read `appVersion` and `appBuildVersion` from the finished build and push the tag:

```bash
tag="mobile-v${APP_VERSION}-build.${BUILD_NUMBER}"
git tag "$tag" "$GITHUB_SHA" && git push origin "$tag"
```

The push needs a token that can trigger workflows; the default `GITHUB_TOKEN` does not start `release.yml` from a tag it pushes. Use the repo's release app token or a fine-grained PAT stored as a secret, the same one the repo already uses for automation commits.

The App Store release tag (`mobile-v<version>`) stays manual: it is cut the day Apple's approval goes live, by whoever released it, using branch **Apple approved** in `SKILL.md`.

## 3. Backfill

Create the tags for releases that already happened, oldest first, so generated notes have a start tag:

```bash
git tag mobile-v1.0 <sha of the approved 1.0 build> && git push origin mobile-v1.0
```

Tag only what really shipped: App Store versions and the current TestFlight build. Old TestFlight builds nobody can install are history, not releases.

## 4. Document

`docs/releases.md` in the repo: three sentences on the two lines and a pointer to this skill. Register the convention in the fleet `STACK.md` row for the product.
