# Local Runtime And Device Loop

Use the least expensive proof surface that can establish the requested behavior, then escalate by risk.

## Select The Surface

| Surface | Suitable proof | Does not establish |
| --- | --- | --- |
| Expo Go | Compatible JS-only prototype behavior | Custom native modules/config, stable callback schemes, production native behavior |
| Development build + Metro | Daily Expo/RN iteration against a known native runtime | A newer native-runtime change or distribution artifact |
| Simulator | Layout, navigation, semantic accessibility, deep links, JS/native integration, and supported simulated push paths | Exact device performance and every hardware/OS behavior |
| Physical iPhone | Device-only, release, hardware, biometric, trust, real-network, notification/background, and installed-artifact behavior | Unobserved providers, roles, or scenarios |

Simulator can cover some current push paths. Final proof remains risk-based: real notification experience, release behavior, background scheduling, force-quit behavior, and device-only capabilities warrant a physical device.

## Reproducible Loop

1. Record source SHA/dirty state, package manager, tool versions, runtime/profile/environment, app identifier/scheme, target model/OS, and starting auth/data state.
2. Use repository scripts and the pinned toolchain. Examples for capability discovery:

```sh
xcrun simctl list devices available -j
xcodebuild -list
```

For Expo, inspect public config and dependency health through the repository's selected package manager. Use the existing development build for `js-only`; rebuild it after `native-runtime` changes. Keep Expo Go, development build, Simulator build, preview/release build, and TestFlight build as distinct targets.

3. Build/launch the exact scheme, profile, or runtime. Capture the first causal build/runtime error rather than only the final summary.
4. Query the semantic accessibility tree. Locate controls by identifier, label, role, or stable text; use coordinates only when no semantic target exists and confirm the visible target first.
5. Interact one meaningful step at a time and refresh semantic state after transitions. Capture screenshots at named loading, empty, error, and success checkpoints relevant to the scenario.
6. Inspect Metro/native console, build issues, crash/device logs, and accessibility findings. Correlate timestamps with interactions and redact private data.
7. Re-run from the defined fresh or returning start state. Hot refresh alone is not completion evidence.

For material accessibility work, keep automated audit, semantic tree, screenshots, VoiceOver, and Dynamic Type as distinct evidence classes; one does not imply the others.

## Physical Device And Mirroring

Use iPhone Mirroring/approved Computer Use only when the host, region, account, proximity, and device meet platform prerequisites. The visible phone is the proof surface. Record exact build, device/OS, app state, environment/backend, actor/role when safely visible, scenario, and observed checkpoints.

Mirroring cannot replace camera, microphone, Face ID, passcode, trust, or other hidden physical interactions. Pause for the human to complete those steps and resume from the observable postcondition. Keep account creation, purchases, destructive device changes, security/privacy setting changes, production data submission, and notification/message sends behind explicit authority.
