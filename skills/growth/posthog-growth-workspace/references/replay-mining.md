# Session-Replay Mining

Use for `replay-mining` mode, and whenever a funnel drop-off or experiment hypothesis needs qualitative evidence. Replays are the highest-signal source this skill has for *why* — the numbers say where users stop; replays say what stopped them. PostHog's own wizard began as a friction log built from binged onboarding recordings.

## Selecting what to watch

Never watch randomly — mine against a question ("why do users stall at stage 3?", "what happens after `pdf_upload_failed`?"). Filter via API before watching:

```bash
node scripts/pg-query.mjs --get "/api/projects/<id>/session_recordings/?limit=20"
```

Useful filters (query params / HogQL on `raw_session_replay_events`): sessions containing a target event, minimum duration, console errors present, specific `distinct_id`, date range. Rank by relevance to the question: sessions that *entered* the problem stage but didn't exit beat long sessions generically.

Watching is visual — replays play in the PostHog UI. Listing, filtering, and metadata are CLI; the watch step uses the browser lane the operating profile provides (for the Andes fleet: `codex-computer-use` on the signed-in Chrome). Budget it: 5–10 targeted replays per question, per Test Before Bulk — read the first 3 findings before committing to a longer watch list.

## The friction log

Each watched session produces at most one row in `audit.md`:

```md
- YYYY-MM-DD · <replay URL> · <stage/question> — <observed friction in one line> · pattern-count: <n of watched sessions showing it>
```

A **finding** is a friction pattern seen in ≥2 sessions (or one session with a console error that explains a funnel cliff). Findings get a hypothesis and a backlog row — usually feeding `experiment` mode. One-off oddities are logged but not ticketed; a single user's confusion is a disqualifier, not a signal.

## Exit criteria

The mode exits when the driving question is answered (finding + backlog row) or honestly exhausted (watched the targeted set, no pattern — record that; ruling friction *out* is a valid verdict that redirects the hypothesis to positioning, pricing, or channel quality instead of UX).
