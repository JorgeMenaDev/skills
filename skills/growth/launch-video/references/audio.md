# Music and sound

## Pick the track

Mixkit's music is free for commercial use. List candidates with `python3 audio/mixkit.py music upbeat`
(also `tech`, `corporate`, `genre/electronica`), fetch 5–8 with `python3 audio/mixkit.py get music <id>`, and run
`python3 audio/beats.py audio/music/<id>.mp3` on each.

Choose a track, 115–130 BPM, whose output shows **a breakdown then a drop**: a run of 2–4 quiet beats in the
energy bars followed by a jump. Prefer the first drop that leaves at least 12 beats of build before it. A track
with no drop can still work if you put the payoff on a bar downbeat, but it loses the best moment of the film.

## Lock the grid

`beats.py` fits the grid to the kick drums (a fine tempo/phase search, then a least-squares refit to per-beat
kick onsets) and prints:

- `BPM` and `offset`: put the BPM in `index.html`.
- `DROP beat N ... MUSIC.offset X`: put `X` in `MUSIC.offset`, which starts the song 12 beats before its drop so
  the drop is film beat 12 and the breakdown is film beats 8–11.

Check the residual: under ~20 ms is a good fit. Much higher means the kick is buried or the tempo drifts: try
another track.

## Sound effects

One real effect per event, the article's list: keystrokes, the send/act click, a pop per landing, a sweep for
cards, an impact on the drop, a success tone per status flip, a whoosh as the page fills, a sparkle on the logo.

- List and fetch: `python3 audio/mixkit.py sfx <tag>` (`click`, `pop`, `whoosh`, `swoosh`, `impact`,
  `notification`, `sparkle`, `typing`), then `get sfx <id>`. Files land as `audio/sfx/<id>.mp3`.
- Measure: `python3 audio/peaks.py audio/sfx/*.mp3`. Short clicks and pops start on their event
  (`sfx('1117.mp3', 12, 0.9)`). Whooshes and impacts have a slow rise: align their **peak** to the event
  (`sfx('1143.mp3', 12, 0.55, true)`).
- Keystrokes: typing recordings are long takes. `python3 audio/peaks.py --hits audio/sfx/<id>.mp3 4` cuts four
  isolated keystrokes to `hit0..3.wav`; play one on most typed characters, rotating through them.
- Levels: clicks 0.8–0.9, pops 0.4–0.6, success tones ~0.3, impacts ~0.55, keys ~0.9 (they are quiet).

## Mix

`node render.mjs` (any mode) writes `out/timeline.json`; `python3 audio/mix.py` mixes the song from
`MUSIC.offset` with a 0.9 s tail fade plus every SFX, then loudnorms to -14 LUFS / -1 dBTP into `out/mix.wav`.
It prints `MISSING` for any file it could not find.
