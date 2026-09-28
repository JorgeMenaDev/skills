# Writing the film

## The beat map

`BEATMAP.md` opens with the brief (product, the request, what the viewer learns, language, brand) and then has
one row per beat. The default arc for 32 beats, with the song starting 12 beats before its drop:

| Beats | Scene | What happens |
|---|---|---|
| 0–6 | **Ask** | Close on the product's input (composer, search box, button). The request types on fixed lines with a real keystroke rhythm; supporting chips or attachments pop in on half-beats. |
| 6 | **Act** | The cursor clicks. A fill ripples out of the button and turns the input into the next object; one pull-back reveals the product around it. |
| 7–11 | **Work** | The breakdown: the music drops out, so show the product working, one visible step per beat (a badge lands, a counter ticks, a status changes). A popover or button rises for the payoff click. |
| 12 | **Drop** | The payoff click lands on the drop. A colour flood clears the frame edge to edge in ~0.35 s and the result bursts in (cards, previews, numbers). |
| 13–16 | **Result** | One status flip per half-beat on the results (Scheduled → Published, 0 → 12). |
| 16–21 | **Back** | The flood shrinks back into the object it came from, carrying the result; the wider product fills in (one item pops per beat). |
| 21–27 | **Line** | A button grows into the whole page (it stays a pill until it reaches the edges while the camera pushes in); its label grows to headline size and slides out. The tagline rises word by word, white on black. |
| 27–32 | **Mark** | The ecosystem (channels, integrations) pops in, merges into the logo, and the wordmark wipes out from behind it; product name and URL rise under it. |

Adapt it, keep its rules: something happens on every beat, the payoff sits on the drop, the breakdown shows
visible work, and the last frame is the brand.

## Motion vocabulary

- **Shape change over fade**: a circle grows into a pill, a card morphs into a calendar chip, a button into a page.
  Animate `left/top/width/height/border-radius` together on one element.
- **Mask lines**: text rises out of a clipped line (`riser()` + `rise()`), and leaves the same way.
- **Floods**: a screen-space layer with `clip-path: circle(r at x y)`, centred on the clicked object's screen
  position (`toScreen(camAt(...), x, y)`). It must overscale past the farthest corner and take ~0.35 s; faster
  reads as a flash, slower as a wipe.
- **Shared elements**: every handoff carries its content. The flood carries a copy of the words in white; a
  morphing card carries its text out through its own mask while the destination's text rises in.
- **Springs**: `sp(t, t0)` for every pop and landing (tiny overshoot). Several targets on one value = the sum of
  one spring per change.
- **Camera**: one transform on `#cam`, keyframed `[beat, zoom, cx, cy]`. A slow push while typing, one pull-back on
  the act, one push toward the payoff, then reposition only while a flood covers the frame.
- **Cursor**: world space, so it scales with the camera (divide by zoom above 1.3 so it stays readable). It
  enters, moves on an eased path, presses ~0.1 s before the click beat, springs back after.

## Look

- Warm white canvas (`#f5f5f3`), black UI, the brand's one accent colour, the brand font. 2D only.
- UI is a **stylised redraw** of the product, built from its real vocabulary (labels, sidebar items, status
  names, provider marks). Say so when delivering; never present it as a screenshot.
- Real photography where the story needs content (Pexels), cropped per surface.
- Size for a phone: 1920x1080 is watched at ~400 px wide. Body text under ~28 px at the current zoom disappears.

## Checklist (the step-4 gate)

- [ ] The brief's "what the viewer learns" list maps to named beats, in order.
- [ ] Every beat from 0 to 32 has a change; no hold over ~1 s.
- [ ] The payoff click is on beat 12 and the breakdown (8–11) shows visible work.
- [ ] Every transition is a shape change, mask rise, flood or shared element; no crossfade.
- [ ] The camera never zooms in and straight back out.
- [ ] The 4 stills use the brand's font, colours and logo, and their smallest text is legible at phone width.
- [ ] The copy is in the product's language and voice, and claims only what the product does.

## Gotchas

- Never `will-change` on anything the camera scales: text renders blurry.
- `visibility: visible` on a child shows through a hidden parent: use `inherit` (the `vis()` helper does).
- Set `z-index` on every layer, or a card floats over the flood.
- Never let the camera chase a wrapping text cursor: type on fixed lines.
- Text that swaps inside a morphing shape needs its own mask and timing, or old and new overlap.
- Declare every variable before the first `seek()`; preload every image in `PRELOAD`.
- Measure widths only from elements whose content is fixed at build time (`offsetWidth` forces layout each frame).
