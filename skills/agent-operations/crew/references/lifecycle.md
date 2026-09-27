# Lifecycle

The dispatcher prints a UUID only after observing child startup. Each crew has a private local directory; each correction creates a new round with its own `REPORT.md`. The child writes a started marker, a report and a terminal status, then calls the supplied `notify` command.

Read `--help` for the full command interface. Routine operations:

```bash
bash "$CREW_SKILL/scripts/t3-dispatch.sh" status "$CREW_ID"
bash "$CREW_SKILL/scripts/t3-dispatch.sh" send "$CREW_ID" --message-file "$CORRECTION_FILE"
bash "$CREW_SKILL/scripts/t3-dispatch.sh" ack "$CREW_ID" --round "$ROUND_ID"
bash "$CREW_SKILL/scripts/t3-dispatch.sh" settle "$CREW_ID"
```

`status` identifies the current round and report path. Read those rather than an older report. `send` addresses the existing child and routes its next hand-back to the proven calling thread. It refuses a new round while delivery is pending or a provider input/approval card needs a response.

## Notifications and permissions

A notification sends a short report pointer to the parent. Before first delivery it reads the parent's current model and permission mode; retries reuse the saved request. The parent's permission mode is not widened. Child corrections retain the mode chosen at dispatch.

Supported child modes are `approval-required`, `auto-accept-edits`, `auto` and `full-access`. The default is `approval-required`. Apply the user's authorization and the provider's actual permission behavior when selecting another mode.

`ack` means the firstmate has read and accepted this round. Settlement waits until the child is idle. For a blocked notice, run:

```bash
bash "$CREW_SKILL/scripts/t3-dispatch.sh" ack-blocked "$CREW_ID" --round "$ROUND_ID" --block "$BLOCK_ID"
```

That records receipt only. Resolve the underlying request in T3 or with the user before continuing.

## Recovery

Run one `sweep` when diagnosing a missed notification. It reconciles saved requests with T3 before retrying; repeated status polling is unnecessary. Recovery bounds reminders and leaves unresolved attention in local state.

If the child is wedged, `stop "$CREW_ID"` stops only that recorded child. Inspect its work before deciding whether to correct, accept or launch a replacement. A launch failure after thread creation is recorded in `dispatch.result`; use a new crew ID for a replacement.

A UUID or wake is not completion proof. Inspect the report and actual files, then report the verified result to the captain.
