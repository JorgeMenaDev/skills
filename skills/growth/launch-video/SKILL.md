---
name: launch-video
description: "Make a code-rendered launch video: one HTML film driven by seek(t), cut to a royalty-free song's beat grid, rendered to a 60 fps MP4 with motion blur and real sound effects. Use when asked for a launch video, a feature promo or demo clip, or motion design for a product."
version: 1.2.0
license: MIT
mutating: true
writes_to: ["a new film folder (index.html, audio/, out/)"]
---

# Launch video

A 15–20 s keynote-style film for one product feature. Every frame is code: one HTML file whose `seek(t)`
draws any moment, Playwright screenshots each frame, ffmpeg blends subframes and muxes a beat-cut mix.
Method from zero (@twoclipping)'s article "How I Make $10K Launch Videos for $0". Worked examples:
[references/example-andy-publicaciones.md](references/example-andy-publicaciones.md) (a web app, 1920x1080) and
`examples/wainwrights-baggers/` (a phone app with a map, 1080x1920).

## Contract

- **Every frame is a pure function of `t`.** No CSS transitions, timers, `Math.random` or state between frames.
- **Music first.** The beat grid is fitted and locked before the scene is built; every event sits on a beat,
  and the **payoff** (the one moment the film exists to show) lands on the drop.
- **One continuous take.** Objects change shape, rise out of mask lines, or flood the frame; nothing cuts or fades.
- **The product's own design canon** (colours, fonts, logo, UI vocabulary, light or dark), from its repo or site.
- **It reads in silence.** Landing pages autoplay muted, so every beat is legible without sound. Sound is
  for the social cut: real effects for every event, placed by measured peak, mixed to -14 LUFS, from sources
  whose licence you can name.
- The deliverable is a file: posting it anywhere is the human's decision.

## Preamble

```bash
for t in node ffmpeg ffprobe python3; do command -v $t >/dev/null && echo "HAVE_$t: yes" || echo "HAVE_$t: no"; done
python3 -c "import numpy, scipy" 2>/dev/null && echo "PY_NUMPY_SCIPY: yes" || echo "PY_NUMPY_SCIPY: no"
{ [ -d "/Applications/Google Chrome.app" ] || command -v google-chrome >/dev/null; } && echo "CHROME: yes" || echo "CHROME: no"
df -h . | tail -1 | awk '{print "FREE_DISK: "$4}'
```

Any `no`: install it first (`CHROME: no` → `npx playwright install chromium` and render with
`CHROME_CHANNEL=chromium`). A render needs about 200 MB free.

## Steps

1. **Brief.** From the human or the context, settle: the product and feature, the one action a user takes
   (types a request, taps a place, drags a slider), what the viewer must learn in order, the language, the
   frame (1920x1080, 1080x1920 vertical, 1440x1440 square) and length (~32 beats ≈ 16 s). Collect the brand's
   font, logo, colours and any real screen recordings. Done when these head `BEATMAP.md` in the film folder.
2. **Scaffold.** Copy `templates/` to a new folder outside any product repo, in a git-ignored output area
   (`gitignore` → `.gitignore`),
   `npm install`, put the fonts in `assets/` (one `@font-face` and `FONTS` entry each) and the logo, set `W`/`H`.
   Done when `node render.mjs beats` renders the demo.
3. **Music.** Read [references/audio.md](references/audio.md) in full. Pick a track with a breakdown and a drop,
   run `audio/beats.py`, set `BPM` and `MUSIC` in `index.html`. Done when the drop sits on the payoff beat.
4. **Beat map and stills.** Read [references/film.md](references/film.md) in full. Write `BEATMAP.md` (one row
   per beat: what happens, which effect), build only the 4 key moments (ask, payoff, result, end card) and
   render a still of each.
   **STOP**: show the beat map and stills to the human, or when running unattended, check them against the
   film.md checklist and write the verdict in `BEATMAP.md`. Building 30 beats on a story nobody checked is
   the waste this gate prevents.
5. **Build.** Fill in every beat between the key moments. Loop `node render.mjs beats` and read `out/beats.jpg`
   until every beat shows a change, no text is clipped, and the smallest text is legible at phone size.
6. **Sound.** Fetch one Mixkit effect per event, declare each with `sfx()`, run `audio/mix.py`.
   Done when it prints no `MISSING` line.
7. **Render and verify.** Read [references/render.md](references/render.md). Render with 8 subframes, scan,
   mux, and step through every fast moment frame by frame. Done when `scan.py` prints `POPS: none` and an
   end hold of at least 1.5 s, and the contact sheet reads as the beat map.
8. **Deliver.** Hand over the MP4, the beat map and the known weaknesses, and keep the folder: director notes
   ("too slow here", "hit the drop harder") usually take 2–3 rounds of minutes each. Done when the Output
   block below is filled.

## Anti-patterns

- **The slideshow**: things fade in, hold and fade out. Make every scene come out of the previous one.
- **Template sheen**: glows, particles, lens flares and 3D flips added for polish. Let the canon's own surfaces carry it.
- **Camera ping-pong**: zooming in and straight back out. One move per scene, eased, zoom interpolated in log space.
- **Synthesised sounds**: they sound cheap. Download real ones.
- **A guessed beat grid**: autocorrelation alone lands the drop on the wrong beat. Use `beats.py`.
- **Tiny UI at full view**: a whole app window at zoom 1 is unreadable on a phone. Push in on what matters.
- **Empty morph frames**: a shape mid-flight with no content inside. Carry a copy of the content with it.

## Output

```
STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED
Video: <path or link> · <duration> · <W>x<H> 60fps · <LUFS> · pops: <none | n> · end hold <s> · muted cut <path>
Music: <track, BPM, payoff on film beat N> · effects: <n>
Folder: <path> · beat map: BEATMAP.md
Weaknesses: <one line each, or none>
Unverified: <what you could not check, e.g. how the mix sounds; what a human should listen and look for>
```
