# Render and verify

```bash
node render.mjs video 8                  # out/silent.mp4: 60 fps, 8 subframes, 180° shutter
python3 scan.py out/silent.mp4           # POPS: none
python3 audio/mix.py                     # out/mix.wav
ffmpeg -y -i out/silent.mp4 -i out/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/film.mp4
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
- **Rest and end hold:** `scan.py` also prints `REST` (still windows) and `END HOLD`. An end hold under 1.5 s
  means the brand frame never lands: finish the end card's motion earlier.
- **Embed width:** read the contact sheet scaled to the width the film will really play at (a landing hero is
  ~1000 px wide, a phone feed ~400 px), not at full size.
- **Loudness:** measure the final MP4, not `mix.wav` (AAC adds ~0.6 dB of true peak):
  `ffmpeg -i out/film.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A6 Integrated` → about -14 LUFS, true peak
  under -1 dBTP.

## Delivering

- `out/film.mp4` is H.264 60 fps with AAC, 6–20 MB for 16 s (flat UI small, detailed maps and photos large): X,
  LinkedIn, Instagram (as a Reel) and TikTok accept it as is. Over ~20 MB, re-encode at `-crf 20`.
- **Two cuts:** `out/silent.mp4` is already the muted cut for autoplay embeds (landing pages); `out/film.mp4`
  is the scored cut for social.
- **Licences:** Mixkit's licence (free for commercial use, no attribution) and Pexels' licence cover their
  files. Name both in the delivery note; any other source needs its licence named before it ships.
- A web preview copy: `ffmpeg -i out/film.mp4 -vf scale=-2:720 -c:v libx264 -crf 26 -c:a aac -b:a 96k web.mp4`.
