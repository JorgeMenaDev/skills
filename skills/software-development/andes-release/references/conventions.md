# Conventions

## Tag grammar

`<line>-v<major>.<minor>.<patch>[-build.<n>]`

- `line` is `mobile` or `web`. A repo with only one surface still uses the prefix, so a second line can be added later without renaming history.
- `mobile-v1.0.1-build.24` is a **prerelease**: TestFlight build 24 of version 1.0.1. `<n>` is the store build number EAS assigned, so the tag and the phone agree.
- `mobile-v1.0.1` is a **release**: the App Store version Apple approved. It sits on the same commit as the last `-build.<n>` prerelease of that version.
- `web-v1.2.0` is a **release**: the batch of web PRs deployed to production from that commit.
- Any other suffix (`-rc.1`, `-alpha.2`) is a prerelease. Plain `X.Y.Z` is the only release shape.

## What each line follows

| Line | Version source | Prerelease trigger | Release trigger | Commit |
| --- | --- | --- | --- | --- |
| mobile | `apps/mobile/app.json` `expo.version` | EAS production build `FINISHED` | App Store version `READY_FOR_SALE` | the `main` sha the EAS run built |
| web | the tag itself | none | a named batch of merged PRs, weekly at most | the sha Vercel production serves |

The web line starts at `web-v1.0.0` on the first tag, whatever `package.json` says; `package.json` versions on Andes web apps are cosmetic and are not bumped by releases.

## GitHub Release fields

- Title: `<Product> <version>` for releases, `<Product> <version> (<n>) · TestFlight` for prereleases, `<Product> web <version>` for web.
- Notes: `gh release create <tag> --generate-notes --notes-start-tag <previous tag on the same line>`. The start tag is the previous tag of the same line and shape (prerelease compares to the previous prerelease or release of that line, release compares to the previous release of that line), so a mobile note never lists web PRs.
- `--prerelease` whenever the tag carries a suffix. `--latest` is left to GitHub's default (the newest non-prerelease across both lines); nothing forces it.
- Assets: none. Binaries live in EAS and the stores; web lives on Vercel.

## Why this shape

It is T3 Code's release model with the parts Andes does not need removed. They tag `vX.Y.Z`, one workflow builds artifacts and publishes one GitHub Release with generated notes pinned to the previous tag in the same channel, suffixed tags become prereleases, and the hosted web deploys only after the release exists. Their mobile app has no GitHub Release; the store is its record. Removed here: nightlies (no nightly audience), the finalize job that commits package versions back, hosted channel routing, and desktop artifacts. Added: the line prefix, because one Andes repo ships web and mobile on different rhythms, and the TestFlight prerelease, because for a store app the build is the thing users test.
