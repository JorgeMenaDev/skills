# Render and verify

```bash
node render.mjs video 8                  # out/silent.mp4: 60 fps, 8 subframes, 180° shutter
python3 scan.py out/silent.mp4           # POPS: none
python3 audio/mix.py                     # out/mix.wav
ffmpeg -y -i out/silent.mp4 -i out/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/film.mp4
python3 audio/loud.py out/film.mp4       # LOUDNESS: OK
ffmpeg -y -i out/silent.mp4 -vf "select='not(mod(n\,30))',scale=480:-1,tile=6x6:padding=4" -frames:v 1 out/sheet.jpg
```

- **Time:** a 16 s film is ~960 frames; at 8 subframes that is ~7,700 screenshots, about 3.5 min on an
  Apple-silicon Mac. Use `video 2` for a quick draft pass, 8 for the deliverable (4 leaves ghost copies on fast
  moves).
- **Motion blur:** frames are captured at 60×S fps, `tmix` averages each group of S, `select` keeps the complete
  groups. Nothing in the page needs to know.
- **Pops:** `scan.py` flags any frame whose difference to its neighbours spikes 3×: an element appearing for one
  frame, a flood that is too fast, a camera cut. Fix the timing in the scene, re-render, re-scan.
- **Frame-by-frame:** for every fast moment (the act click, the drop, the page fill, the logo merge) render
  stills at quarter-beats (`node render.mjs stills 11.75,12,12.25,12.5`) and look for empty shapes, overlapping
  text, and content escaping its mask.
- **Rest and end hold:** `scan.py` also prints `REST` (still windows, each measured against its own first frame)
  and `END HOLD`. Aim for about 2 s; under 1.5 s the brand frame never lands: finish the end card's motion earlier.
- **Embed width:** read the contact sheet scaled to the width the film will really play at (a landing hero is
  ~1000 px wide, a phone feed ~400 px), not at full size.
- **Loudness:** `audio/loud.py` measures the final MP4, not `mix.wav`: the AAC encode adds up to 2 dB of true
  peak (up to 7 dB on a film dense with keystrokes), which is why `mix.py` low-passes at 15 kHz and normalises to
  -3.5 dBTP. On `FAIL`, lower `TP` in `mix.py` or the keystroke volumes and re-mux; a limiter on the mux did not
  hold the peak.

## Delivering

- `out/film.mp4` is H.264 60 fps with AAC, 6–20 MB for 16 s (flat UI small, detailed maps and photos large): X,
  LinkedIn, Instagram (as a Reel) and TikTok accept it as is. Over ~20 MB, re-encode at `-crf 20`.
- **Two cuts:** `out/silent.mp4` (faststart) is the muted cut for autoplay embeds; its web copy:
  `ffmpeg -i out/silent.mp4 -vf scale=-2:720 -c:v libx264 -crf 26 -an -movflags +faststart muted.mp4`. `out/film.mp4` is the scored cut for social. A muted embed with no
  unmute control never plays the score, so spend on music only for the social cut.
- **Licences:** name each source's licence in the delivery note, with the page you read and the date: Mixkit
  (https://mixkit.co/license/) and Pexels (https://www.pexels.com/license/) were free for commercial use without
  attribution (checked 2026-09-28). For paid music, read the cancellation clause (do published films stay
  cleared after you stop paying?) and skip personal-only or non-commercial tiers. A licence page you could not
  read is **unverified**: say so rather than assume it.
- A web preview copy: `ffmpeg -i out/film.mp4 -vf scale=-2:720 -c:v libx264 -crf 26 -c:a aac -b:a 96k web.mp4`.
- **Email copy:** Gmail's attachment limit is 25 MB, and a 60 fps film runs about 0.6 MB per second at full
  quality. `ffmpeg -i out/film.mp4 -c:v libx264 -crf 24 -preset slow -c:a copy -movflags +faststart email.mp4`
  kept 1080p60 at 9.6 MB for 41 s and 17.8 MB for 87 s. A longer film goes as a link instead.
