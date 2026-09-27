# Setup

Install with:

```bash
npx skills@latest add JorgeMenaDev/skills --skill crew
```

Run Crew from an agent session inside T3 Code. Start T3 and authenticate your providers through its normal setup. The bundled scripts need Bash, a working Python 3, Bun, curl, sqlite3 and the `t3` CLI on PATH. No package dependencies or API keys are bundled.

The dispatcher uses T3's local orchestration API and provider catalog. Its CLI and running server must support `t3 auth session issue --json`, thread creation/turn/settlement commands and provider RPCs. These are evolving T3 interfaces; see the package README for the verified version and limitations.

## Local state and authentication

`T3_DISPATCH_HOME` defaults to `~/.local/state/t3-crew`. `T3_DISPATCH_BASE_DIR` defaults to `~/.t3`; set it to the data directory of the T3 instance you are using when different. Use absolute paths. Each dispatch stores its brief, metadata, reports and round state under the crew home with owner-only permissions.

The scripts issue short-lived authentication sessions through the user's local T3 CLI and revoke them after use. Tokens stay in process memory or pipes. Provider credentials remain managed by T3 and the provider tools. The quota reader uses T3 snapshots and does not read provider credential files or browser cookies.

Runtime records can contain your source code, prompts and local paths. Keep the crew home out of public repositories. To share a result, inspect the report and copy only the intended deliverable.

## Recovery

Children notify the parent directly. A periodic `sweep` retries lost deliveries, detects blocked or idle workers and settles acknowledged results. Configure recovery before unattended work.

On macOS, inspect the job and install it from a stable skill location:

```bash
bash "$CREW_SKILL/scripts/t3-dispatch.sh" install --dry-run
bash "$CREW_SKILL/scripts/t3-dispatch.sh" install
bash "$CREW_SKILL/scripts/t3-dispatch.sh" doctor
```

The user LaunchAgent `dev.t3-crew.recovery` runs every 60 seconds. One job serves the selected crew home and T3 instance. Re-run install after moving the skill or changing PATH/state roots. `RECOVERY: FRESH` means a sweep succeeded within three minutes. Installation is optional for attended work with explicit reconciliation.

On other Unix systems, run `bash "$CREW_SKILL/scripts/t3-dispatch.sh" sweep` through your existing scheduler with the same PATH and state-root variables. Automatic installation and end-to-end verification currently cover macOS. Windows is unsupported because the state helper uses Unix file locks.

To remove the macOS job:

```bash
launchctl bootout "gui/$(id -u)/dev.t3-crew.recovery"
rm "$HOME/Library/LaunchAgents/dev.t3-crew.recovery.plist"
```

This keeps reports intact. Stop or settle active children before removing their dispatcher.

## Diagnose a blocked launch

- `STATE: BLOCKED`: fix missing commands or the T3 data directory. Verify `python3 --version` actually runs; a command stub is insufficient.
- Catalog unavailable: verify the CLI can authenticate to the same running T3 instance. Never paste authentication output into a report.
- Unproven identity: use the nonce flow emitted by `resolve`. Thread titles are not identity.
- Quota `skip`: choose another configured instance. `avoid` requires a deliberate `--allow-low`; unavailable quota remains unknown and dispatch warns before proceeding.
- Permission/input card: resolve it in T3. An ordinary follow-up message does not answer a provider approval request.
