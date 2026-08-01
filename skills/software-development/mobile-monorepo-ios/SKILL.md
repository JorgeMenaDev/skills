---
name: mobile-monorepo-ios
description: Build, debug, and ship iOS apps across Expo/React Native, native Swift/SwiftUI, or bounded hybrid architectures. Use when work involves an Expo development build, React Native in a monorepo, iOS Simulator or physical-device proof, native-runtime changes, EAS/App Store Connect/TestFlight distribution, or when another stack skill needs the mobile execution and proof loop.
version: 1.0.0
license: MIT
mutating: true
writes_to: ["target repository paths authorized by the active task"]
---

# Mobile Monorepo iOS

## Proof Contract

Before editing, record the target actor, starting state, exact scenario, visible and semantic checkpoints, required evidence, source/dirty-state boundary, environment/profile, and authorized mutations. Completion: a reviewer can distinguish local proof, device proof, and every distribution state without inference.

Run this preamble from the target repository. Branch only on its exact tokens:

```sh
git rev-parse --show-toplevel
git status --short
if [ -f bun.lock ] || [ -f bun.lockb ]; then echo "PACKAGE_MANAGER: bun"; elif [ -f pnpm-lock.yaml ]; then echo "PACKAGE_MANAGER: pnpm"; elif [ -f yarn.lock ]; then echo "PACKAGE_MANAGER: yarn"; elif [ -f package-lock.json ]; then echo "PACKAGE_MANAGER: npm"; else echo "PACKAGE_MANAGER: unknown"; fi
if rg -q '"expo"[[:space:]]*:' -g package.json .; then echo "EXPO: yes"; else echo "EXPO: no"; fi
if find . -path '*/node_modules' -prune -o -type d \( -name '*.xcodeproj' -o -name '*.xcworkspace' -o -name ios \) -print -quit | rg -q .; then echo "NATIVE_PROJECT: yes"; else echo "NATIVE_PROJECT: no"; fi
if command -v xcodebuild >/dev/null && xcodebuild -version >/dev/null 2>&1; then echo "XCODE: ready"; else echo "XCODE: unavailable"; fi
if xcrun --find simctl >/dev/null 2>&1; then echo "SIMCTL: ready"; else echo "SIMCTL: unavailable"; fi
```

## Classify

Choose one architecture and one change class before selecting commands:

| Kind | Label | Boundary and consequence |
| --- | --- | --- |
| Architecture | `expo-rn` | Shared TypeScript/product surface; use repo package manager + Expo loop |
| Architecture | `native-ios` | Apple-only/deep platform surface or native performance; use Xcode/Swift loop |
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
5. Read [references/distribution-proof.md](references/distribution-proof.md) only when the request includes archive/cloud build, upload, TestFlight, device installation, or release. Completion: report only independently proven artifact states.
6. Read [references/tooling.md](references/tooling.md) before enabling or using an agent/MCP/device automation surface. Completion: version, permissions, data path, telemetry, mutation scope, and semantic-target support are known.

## STOP Gates

- **Native-ownership gate:** stop before regeneration when native-directory ownership is unresolved. Overwriting manually owned native work is the failure this gate prevents.
- **Human/device gate:** stop at login, 2FA, passkey, biometric, passcode, trust, Developer Mode, signing-account choice, payment, or identity verification; state the exact postcondition needed to resume. Treating a human-only action as an app defect is the failure this gate prevents.
- **Remote-mutation gate:** obtain task-specific authority before a cloud build, upload/submission, workflow run, capability/signing change, tester assignment, production update, or publication. Tool availability widening authority is the failure this gate prevents.
- **Secret boundary:** client-readable config may contain only publishable values. Exposing credentials in source, app config, logs, screenshots, prompts, or reports is the failure this gate prevents.

## Completion

- Existing repository checks pass in proportion to the touched boundary; create or modify test files only when explicitly requested.
- Native UI inspection uses semantic accessibility targets before coordinates, plus screenshots and logs. Never use Playwright for native UI inspection.
- Simulator and physical-device claims remain separate; device-specific or release risk has device evidence or an explicit gap.
- Report statements are labelled `fact`, `inference`, `anecdote`, or `unverified gap`; exact providers/flows are never generalized.
- End with `DONE | DONE_WITH_CONCERNS | BLOCKED` and one evidence line naming source state, runtime/artifact, scenario, and residual gaps.
