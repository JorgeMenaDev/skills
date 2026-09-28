---
name: launch-video
description: "Make a code-rendered launch video: one HTML film driven by seek(t), cut to a royalty-free song's beat grid, rendered to a 60 fps MP4 with motion blur and real sound effects. Use when asked for a launch video, a feature promo or demo clip, or motion design for a product."
version: 1.0.0
license: MIT
mutating: true
writes_to: ["a new film folder (index.html, audio/, out/)"]
---

# Launch video

A 15–20 s keynote-style film for one product feature. Every frame is code: one HTML file whose `seek(t)`
draws any moment, Playwright screenshots each frame, ffmpeg blends subframes and muxes a beat-cut mix.
Method from zero (@twoclipping)'s article "How I Make $10K Launch Videos for $0". Worked example:
[references/example-andy-publicaciones.md](references/example-andy-publicaciones.md).

## Contract

- **Every frame is a pure function of `t`.** No CSS transitions, timers, `Math.random` or state between frames.
- **Music first.** The beat grid is fitted and locked before the scene is built; every event sits on a beat,
  and the hero moment lands on the drop.
- **One continuous take.** Objects change shape, rise out of mask lines, or flood the frame; nothing cuts or fades.
- **The product's own design canon** (colours, fonts, logo, UI vocabulary), taken from its repo or site.
- **Real sound effects** for every event, placed by measured peak, mixed to -14 LUFS.
- Publishing is the human's call: deliver the file, never post it.

## Preamble

```bash
for t in node ffmpeg python3; do command -v $t >/dev/null && echo "HAVE_$t: yes" || echo "HAVE_$t: no"; done
python3 -c "import numpy, scipy" 2>/dev/null && echo "PY_NUMPY_SCIPY: yes" || echo "PY_NUMPY_SCIPY: no"
{ [ -d "/Applications/Google Chrome.app" ] || command -v google-chrome >/dev/null; } && echo "CHROME: yes" || echo "CHROME: no"
df -h . | tail -1 | awk '{print "FREE_DISK: "$4}'
```

Any `no`: install it first (`CHROME: no` → `npx playwright install chromium` and render with
`CHROME_CHANNEL=chromium`). A render needs about 200 MB free.

## Steps

1. **Brief.** From the human or the context, settle: the product and feature, the one request a user types
   (or the one action they take), what the viewer must learn in order, the language, the aspect (1920x1080
   default) and length (32 beats ≈ 16 s). Collect the brand's font, logo and colours. Done when these are
   written at the top of `BEATMAP.md` in the film folder.
2. **Scaffold.** Copy `templates/` to a new folder outside any product repo (`gitignore` → `.gitignore`),
   `npm install`, put the font at `assets/font.woff2` and the logo in `assets/`. Done when
   `node render.mjs beats` renders the demo.
3. **Music.** Read [references/audio.md](references/audio.md) in full. Pick a track with a breakdown and a drop,
   run `audio/beats.py`, set `BPM` and `MUSIC` in `index.html`. Done when the drop sits on film beat 12.
4. **Beat map and stills.** Read [references/film.md](references/film.md) in full. Write `BEATMAP.md` (one row
   per beat: what happens, which SFX), build the scene, render 4 stills of the key moments.
   **STOP**: show the beat map and stills to the human, or when running unattended, check them against the
   film.md checklist and write the verdict in `BEATMAP.md`. Building 30 beats on a story nobody checked is
   the waste this gate prevents.
5. **Build.** Replace the demo scene with the film. Loop `node render.mjs beats` and read `out/beats.jpg`
   until every beat shows a change, no text is clipped, and the smallest text at zoom 1 is still legible.
6. **Sound.** Fetch one Mixkit effect per event, declare each with `sfx()`, run `audio/mix.py`.
   Done when it prints no `MISSING` line.
7. **Render and verify.** Read [references/render.md](references/render.md). Render with 8 subframes, scan,
   mux, and step through every fast moment frame by frame. Done when `POPS: none` and the contact sheet reads
   as the beat map.
8. **Deliver.** Hand over the MP4 path (and a phone-viewable link if the host has one), the beat map, and
   the known weaknesses. Keep the folder: director notes ("too slow here", "hit the drop harder") usually
   take 2–3 rounds, and a re-render is minutes.

## Anti-patterns

- **The slideshow**: things fade in, hold and fade out. Make every scene come out of the previous one.
- **Dark 3D default**: glows, particles and 3D flips read as a template. Warm white canvas, black UI, one accent.
- **Camera ping-pong**: zooming in and straight back out. One move per scene, eased, zoom interpolated in log space.
- **Synthesised sounds**: they sound cheap. Download real ones.
- **A guessed beat grid**: an autocorrelation tempo lands the phase ~0.15 s late and the drop on the wrong beat.
- **Tiny UI at full view**: a whole app window at zoom 1 is unreadable on a phone. Push in on what matters.
- **Empty morph frames**: a shape mid-flight with no content inside. Carry a copy of the content with it.

## Output

```
STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED
Video: <path or link> · <duration> · 1920x1080 60fps · -14 LUFS · pops: none
Music: <track, BPM, drop on film beat 12> · SFX: <n> events
Folder: <path> · beat map: BEATMAP.md
Weaknesses: <one line each, or none>
```
