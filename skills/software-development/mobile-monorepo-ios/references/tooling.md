# Optional Agents And Tooling

Tool availability never broadens task authority. Add a tool only for a named evidence gap.

## Precedence

1. Repository scripts, pinned package manager, official Xcode/Apple CLI surfaces, and existing build/runtime logs.
2. First-party Xcode or Expo documentation/status tools when already enabled and authorized.
3. A reviewed, pinned third-party semantic Simulator/log tool for a capability missing above.
4. Broader device automation only for a named gap, preferably on a dedicated test device.
5. Screenshot/coordinate interaction only when no semantic target exists.

Prefer official Expo, Clerk Expo, Callstack React Native performance, and SwiftUI/native companion skills when already present. Route volatile APIs to them; do not auto-install, auto-upgrade, or copy their catalogs.

## Adoption Checklist

Before enabling or invoking an agent, MCP server, remote Simulator, or device tool, establish:

- exact source and pinned/reviewed version;
- maintainer and update provenance;
- authentication and local/remote data path;
- telemetry defaults and approved configuration;
- requested commands, filesystem/network/device scope, and whether a dedicated device is appropriate;
- semantic accessibility support, screenshot/log capability, and physical-device limits;
- which calls are read-only and which build, cancel, submit, edit workflows, alter signing/capabilities, install, or mutate a device/provider.

Use minimum permissions and make mutation targets/arguments visible. Beta or third-party behavior is optional acceleration, never a durable prerequisite or proof by itself.

## Evidence Contract

Agent narration is an `inference` until independently observed. A green build, semantic snapshot, screenshot, log, and physical-device run prove different properties. Bind every tool result to source state, tool version, target runtime/device, environment, timestamp, and scenario; label any missing link an `unverified gap`.
