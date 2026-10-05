---
name: mobile-monorepo-ios
description: Build, debug, and release mobile apps across Expo/React Native, native iOS, native Android, or bounded hybrid architectures. Use for development builds, device proof, native-runtime changes, release workflows, EAS, TestFlight, App Store Connect, Google Play, or cross-platform mobile delivery.
version: 1.4.0
license: MIT
mutating: true
writes_to: ["target repository paths authorized by the active task"]
---

# Mobile monorepo release

## Proof Contract

Before editing, record the target actor, starting state, exact scenario, visible and semantic checkpoints, required evidence, source/dirty-state boundary, environment/profile, and authorized mutations. Completion: a reviewer can distinguish local proof, device proof, and every distribution state without inference.

Run this preamble from the target repository. Branch only on its exact tokens:

```sh
git rev-parse --show-toplevel
git status --short
if [ -f bun.lock ] || [ -f bun.lockb ]; then echo "PACKAGE_MANAGER: bun"; elif [ -f pnpm-lock.yaml ]; then echo "PACKAGE_MANAGER: pnpm"; elif [ -f yarn.lock ]; then echo "PACKAGE_MANAGER: yarn"; elif [ -f package-lock.json ]; then echo "PACKAGE_MANAGER: npm"; else echo "PACKAGE_MANAGER: unknown"; fi
if rg -q '"expo"[[:space:]]*:' -g package.json .; then echo "EXPO: yes"; else echo "EXPO: no"; fi
if find . -path '*/node_modules' -prune -o -type d \( -name '*.xcodeproj' -o -name '*.xcworkspace' -o -name ios \) -print -quit | rg -q .; then echo "NATIVE_PROJECT: yes"; else echo "NATIVE_PROJECT: no"; fi
if ! xcodebuild -version >/dev/null 2>&1; then echo "XCODE: unavailable"; elif ! xcodebuild -license check >/dev/null 2>&1; then echo "XCODE: needs-sudo"; else echo "XCODE: ready"; fi
if perl -e 'alarm 20; exec @ARGV' xcrun simctl list runtimes >/dev/null 2>&1; then echo "SIMCTL: ready"; elif ! xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1; then echo "SIMCTL: needs-sudo"; else echo "SIMCTL: unavailable"; fi
if command -v adb >/dev/null 2>&1; then echo "ADB: ready"; else echo "ADB: unavailable"; fi
if [ -x "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}/platform-tools/adb" ]; then echo "ANDROID_SDK: configured"; else echo "ANDROID_SDK: unavailable"; fi
java_major=$(java -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1)
if [ "${java_major:-0}" -ge 17 ]; then echo "JAVA: ready"; else echo "JAVA: unavailable"; fi
```

`XCODE: needs-sudo` (license) or `SIMCTL: needs-sudo` (first-launch setup; `simctl` hangs until it runs) needs the Mac owner's password. Ask them to run `sudo xcodebuild -license accept && sudo xcodebuild -runFirstLaunch` in one message. `JAVA: unavailable` blocks Android builds: Gradle needs JDK 17+ on `JAVA_HOME`.

## Classify

Choose one architecture and one change class before selecting commands:

| Kind | Label | Boundary and consequence |
| --- | --- | --- |
| Architecture | `expo-rn` | Shared TypeScript/product surface; use repo package manager + Expo loop |
| Architecture | `native-ios` | Apple-only/deep platform surface or native performance; use Xcode/Swift loop |
| Architecture | `native-android` | Android-only/deep platform surface or native performance; use Gradle/Android loop |
| Architecture | `hybrid` | Bounded native module/extension inside Expo/RN; prove both sides and bridge |
| Change | `js-only` | JS/TS, styles, navigation, or data flow; reuse compatible binary + Metro |
| Change | `native-runtime` | Native dependency/code, plugin, scheme, entitlement, capability, SDK, icon, or splash; establish ownership and rebuild |
| Change | `shared-contract` | Auth/backend/shared package boundary; prove mobile and server compatibility |
| Change | `distribution-only` | Already-proven source advances through release states; preserve source/environment identity |

Read [references/architecture-choice.md](references/architecture-choice.md) when choosing the architecture, changing the native boundary, handling Bun workspaces/Metro, or deciding whether native directories are generated or owned. Completion: the plan names both labels and why the cheaper class is insufficient.

## Execute

1. Read repository instructions, scripts, lockfile, pinned framework versions, app/native config, auth/backend boundary, and existing verification commands. Resolve version-sensitive behavior from installed types/CLI help and official documentation.
2. Use the detected package manager and repo scripts. If companions already exist, route volatile detail to official Expo skills, Clerk Expo for auth, Callstack for measured React Native performance, or a SwiftUI/native skill for native seams. Companion absence is an unverified gap, not permission to install one.
3. Make the smallest authorized change. In Expo, determine CNG/native-directory ownership before prebuild; let supported Expo versions configure Metro until a reproduced resolution failure proves otherwise.
4. Read [references/local-runtime.md](references/local-runtime.md) for implementation, debugging, Simulator, development-build, or physical-device work. Completion: the acceptance scenario passes again from its defined start state with semantic, visual, and timestamp-correlated log evidence.
5. Read [references/release-system.md](references/release-system.md) when designing or changing variants, previews, versioning, native-fingerprint policy, CI builds, submission, retries, OTA, or public release. Completion: each release transition has one owner, trigger, idempotency rule, authority boundary, and proof method.
6. Read [references/local-build.md](references/local-build.md) before a store build on this machine: build quota spent or scarce (EAS Free: 15 per platform per month), or an app with no build service. Completion: the quota, the lane (`eas build --local` or prebuild plus `xcodebuild` archive and export) and the build number are named before the build starts.
7. Read [references/distribution-proof.md](references/distribution-proof.md) when the request includes archive/cloud build, upload, TestFlight, Play testing tracks, device installation, review, or release. Completion: report only independently proven artifact states.
8. Read [references/tooling.md](references/tooling.md) before enabling or using an agent/MCP/device automation surface. Completion: version, permissions, data path, telemetry, mutation scope, and semantic-target support are known.

## STOP Gates

- **Native-ownership gate:** stop before regeneration when native-directory ownership is unresolved. Overwriting manually owned native work is the failure this gate prevents.
- **Human/device gate:** stop at login, 2FA, passkey, biometric, passcode, trust, Developer Mode, signing-account choice, payment, or identity verification; state the exact postcondition needed to resume. Treating a human-only action as an app defect is the failure this gate prevents.
- **Remote-mutation gate:** obtain task-specific authority before a cloud build, upload/submission, workflow run, capability/signing change, tester assignment, production update, or publication. Tool availability widening authority is the failure this gate prevents.
- **Secret boundary:** client-readable config may contain only publishable values. Exposing credentials in source, app config, logs, screenshots, prompts, or reports is the failure this gate prevents.

## Completion

- Existing repository checks pass in proportion to the touched boundary; create or modify test files only when explicitly requested.
- Native UI inspection uses semantic accessibility targets before coordinates, plus screenshots and logs. Never use Playwright for native UI inspection.
- Simulator and physical-device claims remain separate; device-specific or release risk has device evidence or an explicit gap.
- Shut down any Simulator this task booted (`xcrun simctl shutdown <udid>`) unless the user or another running task is still using it. A booted Simulator holds several GB of memory; left running it pushes the Mac into swap.
- Report statements are labelled `fact`, `inference`, `anecdote`, or `unverified gap`; exact providers/flows are never generalized.
- End with `DONE | DONE_WITH_CONCERNS | BLOCKED` and one evidence line naming source state, runtime/artifact, scenario, and residual gaps.
