# Writing the film

## Start from a reference (optional)

When the human has a launch video they like, or you find one for a similar product, break it down before
writing your own:

```bash
ffmpeg -i reference.mp4 -vf "fps=2,scale=480:-1,tile=6x5:padding=4" out/ref_%02d.jpg
```

Read the sheets and note, per beat: what happens, how each scene turns into the next, the camera moves, colours
and fonts. Then write the same structure for this product, with the product's own assets.

## The beat map

`BEATMAP.md` opens with the brief and then has one row per beat. The default arc for 32 beats puts the
**payoff** on the drop, film beat 12 (set by `beats.py --build`, see `audio.md`):

| Beats | Scene | What happens |
|---|---|---|
| 0–6 | **Ask** | Close on where the user starts: an input typing on fixed lines, a phone screen where a finger taps a place, a slider being dragged. Supporting details pop in on half-beats. |
| 6 | **Act** | The action lands (click, tap, release). A fill ripples out of the touched object and turns it into the next one; one pull-back reveals the product around it. |
| 7–11 | **Work** | The breakdown: the music drops out, so show the product working, one visible step per beat (a badge lands, a line draws, a counter ticks). Something rises for the payoff action. |
| 12 | **Payoff** | On the drop: a colour flood clears the frame edge to edge in ~0.35 s and the result bursts in (cards, a big view of the outcome, numbers). |
| 13–16 | **Result** | One change per half-beat on the result (Scheduled → Published, a counter climbing, a checkbox ticking). |
| 16–21 | **Back** | The flood shrinks back into the object it came from, carrying the result; the wider product fills in (one item per beat). |
| 21–27 | **Line** | A button or card grows into the whole frame (it keeps its shape until it reaches the edges while the camera pushes in); its label grows to headline size and slides out. The tagline rises word by word. |
| 27–32 | **Mark** | The ecosystem (channels, platforms, integrations) pops in, merges into the logo, and the wordmark wipes out from behind it; name and URL rise under it. |

Adapt it and keep its rules: something happens on every beat, the payoff sits on the drop, the breakdown shows
visible work, and the last frame is the brand. A **looping** film (square, UI morphs) instead ends on a frame
identical to its first, cursor position and speed included.

## Surfaces

- **Web or desktop UI**: a stylised redraw in DOM from the product's real vocabulary (labels, sidebar items,
  statuses, icons from its repo). Call it a stylised redraw when delivering.
- **Phone app**: a phone frame (screen ~428x926, radius ~56, thin black bezel, status bar) built in DOM around
  the redraw; a finger is a soft circle that presses (scale) instead of a cursor.
- **Maps and terrain**: draw them as pure functions: SVG paths and contour polylines from real data (GeoJSON,
  a DEM exported to contours), a canvas redrawn inside `seek()`, or a still render of the real map as an image
  the camera moves over. A live WebGL map is not frame-deterministic: use its screenshots or a screen recording.
- **Real footage** (screen recordings, product shots): re-encode all-intra (`ffmpeg -i in.mp4 -g 1 -c:v libx264
  -crf 12 footage.mp4`), load it as a blob URL, and in `seek()` set `currentTime` and await `seeked` before
  drawing. `seek()` may be async; `render.mjs` awaits it.
- **Phone screen recordings**: iOS Simulator `xcrun simctl io booted recordVideo --codec=h264 out/sim.mp4`
  (Ctrl-C to stop), Android `adb shell screenrecord /sdcard/sim.mp4`; then treat it as real footage above.
- **Fonts**: take the product's own font files from its repo (`.woff2` as is; convert `.ttf`/`.otf` with
  `pip install fonttools brotli && fonttools ttLib.woff2 compress Font.ttf`), else the same family from Google
  Fonts. System fonts (SF Pro) are not redistributable: use the closest open family (Inter) and say so.
- **Photos**: Pexels (free licence): search in a browser, download
  `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?w=1600` directly (their search pages refuse
  scripts). Crop per surface with `background-position`.

## Motion vocabulary

- **Shape change over fade**: animate `left/top/width/height/border-radius` together on one element.
- **Mask lines**: text rises out of a clipped line (`riser()` + `rise()`), and leaves the same way.
- **Floods**: a screen-space layer with `clip-path: circle(r at x y)`, centred on the touched object's screen
  position (`toScreen(camAt(...), x, y)`). It overscales past the farthest corner and takes ~0.35 s; faster
  reads as a flash, slower as a wipe.
- **Shared elements**: every handoff carries its content. The flood carries a copy of the words; a morphing card
  carries its text out through its own mask while the destination's text rises in.
- **Springs**: `sp(t, t0)` for every pop and landing (tiny overshoot). Several targets on one value = the sum of
  one spring per change.
- **Camera**: one transform on `#cam`, keyframed `[beat, zoom, cx, cy]`. A slow push during the ask, one
  pull-back on the act, one push toward the payoff, then reposition only while a flood covers the frame.
- **Cursor or finger**: world space, so it scales with the camera (divide by zoom above 1.3 so it stays
  readable). It enters, moves on an eased path, presses ~0.1 s before the beat, springs back after.

## Look

The product's canon decides colour, type and mode. Without one, use the fallback: warm white canvas
(`#f5f5f3`), black UI, one accent, one clean sans. Size for a phone: a 1920x1080 film is watched ~400 px wide,
so keep text at or above ~1.5% of the frame's shorter side at the current zoom (~16 px of 1080; 28 px reads
comfortably).

## Checklist (the step-4 gate)

- [ ] The brief's "what the viewer learns" list maps to named beats, in order.
- [ ] Every beat has a change; no hold over ~1 s.
- [ ] The payoff is on the drop and the breakdown shows visible work.
- [ ] Every transition is a shape change, mask rise, flood or shared element; no crossfade.
- [ ] The camera never zooms in and straight back out.
- [ ] The stills use the brand's font, colours and logo, and their smallest text is legible at phone size.
- [ ] The copy is in the product's language and voice, and claims only what the product does.

## Gotchas

- Never `will-change` on anything the camera scales: text renders blurry.
- `visibility: visible` on a child shows through a hidden parent: use `inherit` (the `vis()` helper does).
- Set `z-index` on every layer, or a card floats over the flood.
- Never let the camera chase a wrapping text cursor: type on fixed lines.
- Text that swaps inside a morphing shape needs its own mask and timing, or old and new overlap.
- Declare every variable before the first `seek()`; preload every image in `PRELOAD`.
- Measure widths only from elements whose content is fixed at build time: `offsetWidth` forces a layout each frame.
