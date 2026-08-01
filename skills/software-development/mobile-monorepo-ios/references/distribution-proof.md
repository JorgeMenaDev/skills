# Distribution Proof

Distribution is an artifact state machine. Prove each transition independently:

`source fixed` → `local build passed` → `cloud/archive build produced` → `upload accepted` → `Apple processing complete` → `build assigned to intended tester group` → `tester can install` → `exact build installed` → `fresh-state acceptance flow passed` → `release approved/published`

Never collapse adjacent states into “shipped.” A successful archive does not prove upload, processing, assignment, installability, installation, launch, or the product flow.

## Evidence Ledger

For every claimed transition, capture the available immutable identity:

- source commit and dirty state;
- build service/project/build identifier or archive identity;
- app/bundle identifier, version, build number, runtime version/channel;
- environment, build configuration/profile, and relevant non-secret configuration;
- upload/submission identifier and Apple processing state;
- tester group and install availability without exposing tester personal data;
- device/OS, installed About/build marker, timestamps, scenario screenshots, and correlated logs.

Name the exact provider, auth method, actor/role, and fresh/returning state tested. One provider or role passing is not evidence for another.

## Risk-Based Device Acceptance

Final release acceptance strongly warrants a physical device and Release/distribution artifact. Require it for hardware, biometric/passcode, real network transitions, device-only entitlements, background scheduling, force-quit behavior, real notification states, and material release performance. A compatible Simulator may prove intermediate routing, semantics, and selected push paths; report that as Simulator proof.

If the physical device is unavailable, preserve earlier evidence and report the exact missing transition as an `unverified gap`.

## Mutation Boundary

Cloud/archive builds, uploads, submissions, workflow runs, capability synchronization, signing/credential repair, tester assignment/invitation, production updates, external review, release, and publication are separate mutations. Obtain authority for the exact action before crossing its transition. Read-only status inspection does not authorize the next mutation.

Stop at authentication, 2FA, passkey, biometric, passcode, trust, Developer Mode, signing-account selection, certificate/key ownership, payment, or identity verification. Preserve completed states and hand off the precise postcondition needed to resume.
