# Conventions

## Tag grammar

`<line>-v<major>.<minor>.<patch>[-build.<n>]`

- `line` is `mobile-ios`, `mobile-android`, or `web`. A repo with only one surface still uses the prefix, so a second line can be added later without renaming history.
- `mobile-ios-v1.0.1-build.24` is a **prerelease**: FINISHED iOS production build 24 of version 1.0.1. `<n>` is the store build number from the finished build's metadata, so the tag and the phone agree.
- `mobile-ios-v1.0.1` is a **release**: the iOS version Apple confirmed live. It sits on the same commit as the approved `-build.<n>` prerelease of that version, even if a newer build exists, and it is cut only after confirmed public store-live state at the exact built sha.
- `mobile-android-v<version>[-build.<n>]` mirrors iOS against Google Play: prereleases are FINISHED Android production builds (each submitted to the Play Internal track only), releases are versions Play confirmed live.
- `web-v1.2.0` is a **release**: the batch of web PRs deployed to production from that commit.
- Any other suffix (`-rc.1`, `-alpha.2`) is a prerelease. Plain `X.Y.Z` is the only release shape.
- Bare `mobile-v*` (no platform) is the pre-platform grammar. Those tags are immutable history — never move, repurpose, or re-cut them. They survive only as explicit notes boundaries for the first iOS releases (below).

## What each line follows

| Line | Version source | Prerelease trigger | Release trigger | Commit |
| --- | --- | --- | --- | --- |
| mobile-ios | finished iOS build metadata (`appVersion`; dynamic app config is supporting evidence only) | production workflow after a `FINISHED` build, automatic | Apple confirms the version live | the `main` sha the run built |
| mobile-android | finished Android build metadata (`appVersion`; dynamic app config is supporting evidence only) | production workflow after a `FINISHED` build, automatic | Play confirms the version live | the `main` sha the run built |
| web | the tag itself | none | a named batch of merged PRs, weekly at most | the sha Vercel production serves |

The web line starts at `web-v1.0.0` on the first tag, whatever `package.json` says; `package.json` versions on Andes web apps are cosmetic and are not bumped by releases.

The app version is read from the repo's dynamic app config (`app.json`, `app.config.*`, or finished-build metadata) — never inferred live from a missing `app.json`.

## Build vs submission vs store-live

Three separate evidence states, three separate pieces of evidence:

1. **Build**: the production run built a `FINISHED` binary for the exact source sha (build ID, artifact URL, fingerprint hash).
2. **Submission**: the binary reached its internal destination (TestFlight, Play Internal track; submission IDs).
3. **Store-live**: the store confirmed the version public (App Store `READY_FOR_SALE` / confirmed listing, Play confirmed live; receipt links).

A finished build is never a store receipt and an internal submission is never public-live. The published tag records the tag the workflow cut; it never declares store truth. Never infer actual store state from the latest tag, the app config, or the branch tip.

## GitHub Release fields

- Title: `<Product> iOS <version>` / `<Product> Android <version>` for releases, `<Product> iOS <version> (<n>)` / `<Product> Android <version> (<n>)` for prereleases, `<Product> web <version>` for web.
- Notes: `gh release create <tag> --verify-tag --generate-notes --notes-start-tag <previous tag on the same line>`. The start tag is the previous tag of the same platform line and shape (prerelease compares to the previous prerelease or release of that line, release compares to the previous release of that line), so an iOS note never lists Android or web PRs.
- First-line boundaries: configure repo-owned legacy anchors only when they exist and resolve to commits; defaults are empty. Andy alone uses `mobile-v1.0.1` for first iOS stable notes and `mobile-v1.0.1-build.24` for first iOS build notes. With no history or anchor, first iOS and Android build/stable releases use explicit initial provenance notes. Web retains generated notes, including its first release. Subsequent releases use their own platform line; GitHub latest is never an implicit boundary.
- `--prerelease` whenever the tag carries a suffix. `--latest` is left to GitHub's default (the newest non-prerelease across all lines); nothing forces it.
- Assets: none. Binaries live in EAS and the stores; web lives on Vercel.

## Why this shape

It is T3 Code's release model with the parts Andes does not need removed. They tag `vX.Y.Z`, one workflow builds artifacts and publishes one GitHub Release with generated notes pinned to the previous tag in the same channel, suffixed tags become prereleases, and the hosted web deploys only after the release exists. Their mobile app has no GitHub Release; the store is its record. Removed here: nightlies (no nightly audience), the finalize job that commits package versions back, hosted channel routing, and desktop artifacts. Added: the platform line prefix, because one Andes repo ships iOS, Android, and web on different rhythms, and the per-platform build prereleases, because for a store app the finished binary is the thing users test — while only the store can say it is live.
