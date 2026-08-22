# Reliable mobile release system

Use this reference to design or change the operating contract around mobile releases. It does not authorize a build, upload, submission, OTA, review action, or publication.

## Model the release graph

Define the release graph before writing a workflow. For every transition, name its trigger, source identity, environment, artifact identity, idempotency key, destination, permission owner, retry behavior, and evidence. Keep these states separate:

`development runtime` → `pull-request preview` → `release candidate build` → `internal distribution` → `device acceptance` → `store review` → `public release` → `storefront verification`

Use explicit development, preview, and production identities when the product needs side-by-side installation or isolated auth/backend state. Record app name, scheme, bundle/package identifier, EAS profile, environment, update channel, and store destination for each variant. Never infer production identity from a default.

## CI and version ownership

- Choose one canonical production build origin. CI is usually safer than developer laptops because its operating system, package manager, environment binding, and logs are repeatable.
- Make one file or command authoritative for the user-visible app version. Define whether iOS and Android share it and how native build numbers advance.
- Treat a version as a release train only if the stores and workflow agree. App Store approval can close an iOS version to later submissions, so the next iOS train needs a newer marketing version.
- Count queued and running builds when checking whether an artifact already exists. Looking only for finished builds allows every merge or retry to schedule a duplicate.
- Serialize production reconciliation. A retry must reuse the intended source/version or fail clearly; it must not silently create another candidate.
- A workflow that can commit a version bump needs a dedicated identity, narrow contents permission, and an explicit rule for the branch it may update.

## Native fingerprints and previews

Compare the pull request's merge-result native fingerprint with its base on the same operating system and pinned package manager. Label or summarize platform-specific native drift before merge. This gives release operators a chance to batch native changes and explains when an existing binary cannot carry later JavaScript.

Preview deployment should be opt-in unless the product has accepted its build cost and credential exposure. A fingerprint-aware preview may reuse a compatible native development binary and publish JavaScript, or build a new binary when native inputs changed. State which behavior applies. A preview passing is not production evidence.

## Store build and submission

Use separate provider identities for build service access, App Store Connect submission, Google Play submission, push delivery, and source control when the providers support it. Grant only the needed role and track.

Production CI may build and submit automatically to internal destinations such as TestFlight and Play Internal Testing. Public release remains a separate human judgment unless the user explicitly chooses automation. Record the immutable build ID, source commit, version/build number, native fingerprint, environment, submission ID, and destination track/group.

## OTA is a product decision

Do not add OTA because a reference repository uses it. Decide whether the product can operate, observe, and roll it back safely.

If OTA is enabled:

- use a native-fingerprint runtime policy or an equivalently strict compatibility key;
- compute fingerprints in the same operating system and package-manager environment as the store build;
- publish an update only when a finished production binary for that platform matches the fingerprint;
- report a skipped update when no compatible binary exists;
- define rollback, telemetry, support, and incident ownership before production use.

If OTA is disabled, remove its channels and commands from the release contract. Do not leave a half-configured path that operators may mistake for supported delivery.

## Reference pattern

T3 Code demonstrates this graph at [`pingdotgg/t3code@11f051373e79b38fa16f3ec1af825f5164907c1b`](https://github.com/pingdotgg/t3code/tree/11f051373e79b38fa16f3ec1af825f5164907c1b): opt-in fingerprint-aware pull-request previews, pre-merge native-fingerprint labeling, CI-only production builds, version-based release trains, automatic submission to TestFlight and Play Internal Testing, duplicate-build suppression that includes queued/running builds, and fingerprint-gated production OTA. Inspect its [production reconciliation](https://github.com/pingdotgg/t3code/blob/11f051373e79b38fa16f3ec1af825f5164907c1b/.github/workflows/mobile-eas-production.yml), [preview deployment](https://github.com/pingdotgg/t3code/blob/11f051373e79b38fa16f3ec1af825f5164907c1b/.github/workflows/mobile-eas-preview.yml), [fingerprint check](https://github.com/pingdotgg/t3code/blob/11f051373e79b38fa16f3ec1af825f5164907c1b/.github/workflows/mobile-fingerprint-check.yml), [EAS profiles](https://github.com/pingdotgg/t3code/blob/11f051373e79b38fa16f3ec1af825f5164907c1b/apps/mobile/eas.json), and [release operations](https://github.com/pingdotgg/t3code/blob/11f051373e79b38fa16f3ec1af825f5164907c1b/docs/operations/release.md). Its build-on-every-mobile-merge and OTA policy are product choices, not defaults to copy.

When using any reference implementation, pin the inspected commit, distinguish static implementation evidence from observed runtime proof, preserve the target repository's package manager and provider contracts, and adopt only the parts approved for the target product.
