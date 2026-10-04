# Local Store Builds

Use this reference when a store build (TestFlight, Play testing) should run on this machine instead of a cloud build service: the build quota is spent or scarce, or the app never used a build service. A local build is still a remote mutation once it uploads. The same authority gates apply.

## Choose the lane

1. **Read the quota first.** On EAS, `eas account:usage <account> --non-interactive --json` prints each platform's `used`, `limit` and the billing period end. The Free plan allows 15 builds per platform per month and resets at the start of the billing period. Spending quota is fine when there is plenty left. A repository's cloud workflow usually owns release tags, evidence and OTA gates, so keep it as the default lane while quota remains.
2. **The app has an EAS build profile** → `eas build -p ios -e <profile> --local --non-interactive --output <path>.ipa`. It runs the same profile on this machine and uses no build quota. `eas submit --path <path>.ipa` uses no build quota on any plan.
3. **The app has no build service** (CNG prebuild plus Xcode only) → `expo prebuild --platform ios --clean`, then `xcodebuild … archive`, then `xcodebuild -exportArchive` with an `app-store-connect` export options plist, then upload with `xcrun altool --upload-app` or Transporter.

## Traps

- **Build from a clean tree.** eas-cli archives the git tree, and prebuild reads the working copy. Use a detached worktree at the release commit when the main clone has other sessions' edits.
- **Secrets differ.** A local EAS build does not receive environment variables with Secret visibility. Export each one the build needs (for example a crash-reporting upload token) before building, and never write it to a file in the repository.
- **Build numbers.** With `appVersionSource: remote`, EAS still assigns the number, and a failed build still uses one. Without a build service, read the highest build number in App Store Connect and pass the next one into the native config before prebuild. Xcode's `CURRENT_PROJECT_VERSION` does not reach `Info.plist` when app config sets the build number.
- **Signing.** Automatic signing with an App Store Connect API key needs `-allowProvisioningUpdates -authenticationKeyPath -authenticationKeyID -authenticationKeyIssuerID` on both `archive` and `-exportArchive`. A missing Apple WWDR G3 intermediate in the login keychain makes distribution signing fail late.
- **Shell arrays.** Keep those flags in a shell array (`"${AUTH[@]}"`). zsh does not split an unquoted string variable into words, so xcodebuild rejects the whole string as one option.
- **Disk and time.** Expect 5 to 10 GiB of temporary files and 10 to 60 minutes. Run the build in the background and wait for it to exit.
- **Submission queues.** An EAS submission on the Free plan can wait in its queue for over an hour. Uploading the same `.ipa` directly with the same key is safe. Apple rejects the later duplicate build number.
- **OTA.** Local builds do not appear in `eas build:list`. A fingerprint-gated OTA must find the local binary some other way, such as a release tag on its source commit, or it will never publish to that binary.

## Proof

A local build proves only `archive build produced`. Prove upload, processing (`VALID`), beta state and installation separately, as [distribution-proof.md](distribution-proof.md) says. Record "local build" with the source commit and build number wherever the repository records releases.
