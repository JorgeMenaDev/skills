# Animation guide (read before painting a chapter)

This repo renders a music video as painted watercolour-and-ink animation
with p5.brush, offline in headless Chrome. The shot list is [STORYBOARD.md](STORYBOARD.md). The bar is a
picture-book music video: **cute, cartoony, saturated but soft, lively, something happening in every shot,
full sets (never a character on an empty background), brave camera moves, every hit on a beat.**

Look at these before you start:
- `docs/reference/model-sheet.jpg`: the cast and the set as they are drawn today.
- `out/reference/quality-bar.jpg`: frames of the reference video whose quality we are matching. Notice: full painted sets, props everywhere, a clear focal gag per shot,
  secondary characters, strong silhouettes, watercolour texture in the backgrounds.

## How a chapter works

Each chapter is one file in `src/ch/`, wrapped in an IIFE so helpers stay private:

```js
// src/ch/c3_chorus1.js
(() => {
  const discoBall = (x, y, r, t) => { ... };             // private helpers: any names, no collisions
  function dance(t, lt, dur) { ... }                       // a shot
  function clockSpin(t, lt, dur) { ... }
  chapter('chorus1', 28.5, 47.2, [[28.5, dance], [33.2, clockSpin], ...]);
})();
```

- `chapter(name, start, end, shots)` registers it. A shot is called as `fn(t, lt, dur)` (song time, time since
  the shot started, shot length) and must paint the **entire frame**, background included.
- **Frames render in parallel and out of order.** Every shot is a pure function of `t`: no state carried
  between frames, no `Math.random()`. Use `hash(i)` for stable per-object randomness and `jit(a)` for
  hand-drawn jitter (reseeded 12×/s so outlines "boil"; that is wanted).
- **Only edit your own chapter file.** If a shared helper is missing, write it privately in your IIFE. If you
  find a real bug in a shared file, report it in your final message; do not edit it. Shared files:
  `src/core.js`, `src/hero.js`, `src/cast.js`, `src/props.js`, `src/timeline.js`, `src/song.js`,
  `studio.html`, `render.mjs`, `src/gallery.js`.

## Canvas, layout, timing

- 1920×1080, y down, origin top-left. **The karaoke pill covers about y 985–1060 whenever a lyric is
  showing.** Keep faces and key action above y 960.
- Paper texture is under every frame; a grain + vignette is multiplied on top automatically.
- Brush wipes are automatic at the `WIPES` times in `src/timeline.js` (±0.32 s). Chapters touching those times need not
  transition themselves there; every other chapter edge needs a motivated transition (see the storyboard).
- **Timing is the real beat grid** of the song (see `SONG.bpm` in `src/song.js`):
  `bpOf(t)` continuous beat position, `beatN(t)` integer beat, `beatT(n)` time of beat n,
  `pulse(t, k)` 1 on each beat then decays, `pulse2` on eighths, `bar(t)`.
  Put every important hit (a landing, a pop, a stamp, a ding) on a beat: find it with `beatT(beatN(x) + 1)`.
- Lyric timings: `LYRICS` in `src/song.js` (`start`, `end`, and `words[]` = start time of every word). Sync
  gags to the word, e.g. a burst on the sixth word of line 3 at `LYRICS[2].words[5]`.
- Helpers: `seg(t, a, b)` 0..1 progress, `kf(t, [[t0, v0], [t1, v1]], easeFn)` keyframes (arrays ok),
  `ease`, `easeIn`, `easeOut`, `backOut` (overshoot), `elasticOut`, `lerp`, `clamp`, `frac`, `wob(t, f, ph)`,
  `hash(i)`, `mixCol(a, b, k)`, `TAU`.

## Painting API (core.js)

`paint(pts, o)` paints one shape from `[[x, y], ...]`:

| option | meaning |
|---|---|
| `wash`, `washOp` | flat colour (0–255). Characters and anything that must read solidly. |
| `fill`, `fillOp`, `bleed`, `tex`, `border` | watercolour with bleeding edges and pigment texture. Backgrounds, shading, glows, pools of light. `bleed` .05–.3, `tex` .3–.9, `border` .2–.8. |
| `hatch: { d, a, o, b, c, w }` | hatching (dist, angle, `{rand, gradient}`, brush e.g. `'HB'`/`'charcoal'`, colour, weight). Sparingly. |
| `ink`, `sw`, `br` | outline colour (default `PAL.ink`), weight (~.5–2), brush (`'ink'`, `'inkfine'`, `'dry'`, built-ins `'2B'`, `'HB'`, `'charcoal'`, `'marker'`, `'pen'`). **`ink: null` = no outline.** |
| `curv` | smooth the outline through the points (0–1). |

- Shapes: `ellPts(cx, cy, rx, ry, n, jitter, rot)`, `rectPts(x, y, w, h, j)`, `rrPts(x, y, w, h, r, j)`,
  `starPts(cx, cy, r, inner, n, rot)`, `heartPts(cx, cy, r)`, `bubblePts(x, y, w, h, tail, j)`, `translatePts`.
- Lines: `brushLine(pts, sw, colour, brush = 'ink', curv = .5)`. Glow: `glow(cx, cy, rx, ry, colour, op, bleed)`.
- Transforms: p5 `push()/pop()/translate()/rotate()/scale()` work with every brush call.
- Palette `PAL` (see `src/core.js`): hero colours first, then the world. Any hex is fine; stay harmonious. Avoid
  pure black and pure white in the world (use `PAL.ink`/`PAL.night` and `PAL.cream`).
- Camera: `camBegin(cx, cy, zoom, rot)` puts world point (cx, cy) at screen centre; `camEnd()` restores. One
  level only. `shakeXY(t, amount)` for hits. Use it: pushes, pans, whips, tilts, zoom-outs.
- Lettering (crisp, on the compositor, always above the paint): `letter(txt, x, y, size, colour, { pop, rot,
  alpha, outline, weight, font, align, screen })` (Fredoka by default; `font: FONT_BODY` for Nunito). Letters
  follow the active camera but not your own push/translate: give world coordinates.
  `sfx(txt, x, y, size, colour, age, { life, rot })` is a comic sound effect. Respect the text budget in the storyboard.
- Full-frame: `flash(k, colour)`, `iris(cx, cy, r, colour)`, `irisShape(pts, colour)` (paints outside any
  star-shaped outline). Set `KARAOKE_OFF = true` inside a shot to hide the karaoke (title/end cards only).

## Characters

<!-- Fill from the project's rig files: one block per rig with its signature, size, pose options, face
options, hooks and the size guide. Keep each block as dense as this one:

**Hero** — `hero(x, y, u, o)`: (x, y) ground point between the feet; ~14u tall.
- Pose: dy, sq, rot, tilt, flip, sx, limbs, fly/walk phases. Face: what may change (and what never does).
- Hooks: wingL/wingR or handL/handR at the tip, draw(u, sw) in body space. emote + emoteK.
- heroMove(style, t) beat-locked poses; react(t, keys) for takes. Sizes: tiny 5–9, normal 16–24, hero 30–60.
-->

**Props** — list every shared set function with its options and the fixed layout of the recurring set.

## Style rules

- **Look:** hand-painted picture book. Characters: flat `wash` + ink outlines. Backgrounds: layered watercolour
  `fill` shapes, a few big soft ones, not flat single colours. Light and glow as low-opacity fills.
- **Readability:** one clear focal gag per shot, big silhouettes, strong contrast between character and set.
  Shots are short (1.5–4 s); the joke must read instantly.
- **Motion:** everything moves. Cameras drift or push; characters bounce on the beat; anticipation, squash and
  overshoot (`backOut`, `elasticOut`); reactions via `react()`. Nothing snaps.
- **Performance:** aim ≤ 1.5 s per frame, never above 3 s. Hundreds of shapes are fine, thousands are not.

## Checking your work

From the repo root (several agents can render at once):

```
node render.mjs --sheet=28.6,29.3,30.1,30.9,31.6,32.3 --cols=3 --w=640 --out=out/check/c3_a.jpg
node render.mjs --stills=29.5 --out=out/check/c3_full
node render.mjs --clip=28.5:36 --out=out/check/c3.mp4      # with the song, to feel the timing
```

Open sheets with the Read tool and look hard: first and last frame of every shot, a few in between, motion
across consecutive times (every 0.1 s around a hit), the transitions in and out, nothing under the karaoke.
Iterate until each shot is charming, readable, lively and on-model. Fix scale, contrast, clutter, stiffness.

## Engine traps (learned the hard way)

- Lettering (`letter`, `sfx`) is drawn on the compositor: it follows the camera but **not** your own
  `push/translate/scale/rotate`, and it always sits above every paint stroke. Inside a transformed drawing,
  paint glyphs as shapes instead.
- p5.brush does not paint outside the 0..1920 × 0..1080 world area. A camera that zooms in near an edge shows
  bare paper there: keep the camera view inside the frame, or paint the set wider than the frame.
- p5.brush draws noticeably slower under a small `scale()` (2–3× at 0.25). Draw a cheap version of a set
  that is only seen small.
- Watercolour `fill` shapes cost far more than `wash` shapes: a crowd of fill shadows can add a second per
  frame. Use `wash` with low `washOp` for shadows and repeated small things.
- Limbs raised past the head's silhouette vanish behind it: the rigs clamp them. Pose "arms up" as a V.
- Brush line weight is absolute, not scaled: small glyphs drawn with `brushLine` (badges, stamps, doodles on a
  phone) smear into grey blobs. Paint small things as filled shapes, and give any phone-screen teaching point a
  close-up (a hand-held phone's doodles are ~20 px wide).
- Hand hooks draw before the singer's torso: a prop held at the chest is hidden. Draw such props after the rig
  call, in world space.
