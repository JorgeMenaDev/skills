# Experimental recorded browser evidence

## Status

`recording: on` is an experimental AFK capability. Keep it dormant by stamping
`recording: off` on every brief unless the requester explicitly asks for video proof.
Use video as supporting evidence; acceptance assertions and screenshots remain the
PASS/FAIL oracle.

## Support matrix

| Lane | Status | Recording path |
|---|---|---|
| Cloud (`agent:implement`) | Experimental | Records on the hosted runner |
| Vercel Sandbox (`agent:implement-sandbox`) | Experimental | Records inside the microVM and exports before deletion |
| Local Docker (`agent:implement-local`) | Unsupported in v1 | Fail-fast |

`recording: on` requires `verify: full` or `verify: slim`. The workflow rejects
unsupported or contradictory combinations before implementation starts.

## Output contract

A successful run:

- commits a size-capped animated GIF, screenshots, and Markdown evidence;
- uploads the full WebM, report, and screenshots as a 30-day Actions artifact;
- comments on the draft PR with the inline GIF, lane, evidence SHA, verdict, and artifact link;
- keeps the WebM out of Git history.

Partial recordings are uploaded after failed runs when a non-empty WebM exists. A
missing or empty recording fails verification, and no draft PR opens without the
required evidence.

## Before enabling

- Treat the recording as potentially sensitive: constrain the flow to QA/public data
  and exclude credentials, notifications, customer data, and one-time codes.
- Put visible navigation and scrolling after `agent-browser record start`; recording
  starts a fresh browser context.
- Keep the interaction bounded. The GIF is only a review preview; the WebM is the
  full-resolution proof.
- Expect `agent-browser` 0.25.5 to require an ffmpeg executable. The proof runs found
  ffmpeg differently in each lane; deterministic bundling remains future hardening.

## Proven baseline

The same Andy hero Play/Pause brief ran from base `1606e81` in both lanes:

- GitHub cloud: [draft PR #362](https://github.com/Andesphere/andyChat/pull/362),
  [run 29136086630](https://github.com/Andesphere/andyChat/actions/runs/29136086630).
- Vercel Sandbox: [draft PR #361](https://github.com/Andesphere/andyChat/pull/361),
  [run 29134618910](https://github.com/Andesphere/andyChat/actions/runs/29134618910).

Both runs produced green checks, bilingual recorded interactions, inline GIFs, and
full evidence artifacts. The Vercel WebM survived microVM deletion. These PRs are
proof vehicles, not product changes to merge.
