# Chapters: parallel painting and integration

## Dispatch

One agent per chapter, all dispatched in one message so they run concurrently (a 7-chapter film took 20–37
minutes of wall clock). Each owns exactly one file, `src/ch/<file>.js`. If you cannot spawn agents, paint the
chapters yourself in time order with the same loop, one chapter per pass.

Before dispatching, commit the scaffold so every agent starts from the same engine, and stub every chapter
file listed in `studio.html` (`// cN: not painted yet`).

**Watching them.** An agent's first move is often one ~550-line Write, which leaves it silent for 10–15 minutes;
that is slow, not dead. Watch `out/check/<cid>_*` renders, not transcripts or line counts. Re-dispatch a chapter
only when it has no render at all after ~20 minutes, and never while its first agent may still write the same file.

Prompt template (fill the angle brackets; keep every other line):

```
You are painting ONE chapter of a code-painted music video in the repo <abs path> ("<title>", a <dur> s
picture-book watercolour music video that <purpose>). The song (<language>) is sung by <singer> to <hero>.

Your chapter: **<C id> · <name> (<start>–<end> s)**, file `src/ch/<file>.js` (currently a stub). Register it with
`chapter('<name>', <start>, <end>, [...shots])`.

Read first, fully: `ANIMATION_GUIDE.md` (API and rules) and `STORYBOARD.md` (your rows under "<C id>"). Then
read the shared engine files for exact APIs: <list every src file>, and `src/song.js` (beat grid + LYRICS with
per-word times; your lines are LYRICS[<i..j>]). Look at `docs/reference/model-sheet.jpg` and
`out/reference/quality-bar.jpg` (the quality bar: full painted sets, props, a focal gag per shot, strong
camera moves).

Chapter-specific notes:
- <what the previous chapter ends on, and what the next one starts on: the hand-off both ways>
- <one bullet per lyric line: the gag, the beat or word it lands on, the allowed sfx if any>
- <sizes, who sings, anything exported for a later chapter (e.g. window.streetScene)>
- Karaoke covers y ~985–1060: keep faces above y 960.

Rules: only create/edit `src/ch/<file>.js` (it exists as a stub: Read it before your first Write). Write a small
skeleton with every shot registered and render it within the first 5 minutes, then build up. Do not edit shared files (report real bugs in your final message
instead). Do not run any git commands. Every shot is a pure function of t (no Math.random, no state). Keep
≤ 1.5 s/frame.

Work loop: write the chapter, then render contact sheets from the repo root, e.g.
`node render.mjs --sheet=<12–20 times across the chapter> --cols=4 --w=480 --out=out/check/<cid>_a.jpg`,
open them with the Read tool and look hard. Check 0.1 s steps around hits, one full-res still, and a clip with
audio if useful. Iterate at least 3 times until every moment is charming, readable, lively, on-model and
matches the reference quality.

Final message: list your shots with times, what each shows, ms/frame, anything you could not get right, and
any shared-file bugs you found. Keep it short. Also write that same report to `out/check/<cid>_report.md` and
leave your final contact sheet at `out/check/<cid>_final.jpg`.
```

The hand-off bullets are what make the film feel continuous: tell each agent the exact last frame of the chapter
before and the first frame of the chapter after (the title agent in the Andy film landed its push-through-the-
window exactly on the next chapter's opening camera because both were written into the prompts).

## Integration

When every agent has reported:

1. **Review each chapter as it lands** (its `_report.md` appears): one contact sheet of 12 frames, read it yourself.
2. **Collect the shared-file bugs** from all reports. Fix them only after every agent is done (a mid-run fix moves
   the ground under agents still iterating), and only in ways that cannot break the workarounds agents wrote
   (additive guards, clamps, wider sets; no renamed options). Re-render the model sheet to confirm.
3. **Whole-film review**: one 40-frame sheet across the film, including a frame just before and just after
   every chapter edge, the end card at full resolution, and one karaoke frame at full resolution. Done when
   every lyric line's gag is visible in its frame, every edge is continuous or wiped, and nothing sits under
   the karaoke.
4. Commit and push the chapters and fixes before the full render.
