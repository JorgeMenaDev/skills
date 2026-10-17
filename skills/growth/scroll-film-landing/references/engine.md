# Engine

## Files

Copy `templates/src/` into the Astro project:

- `data/stops.ts`: one entry per stop: `id`, `place` (rail label) and `focus` (mobile crop).
- `components/Film.astro`: the sticky stage (posters, clips, stop rail) and a default slot for the stops.
- `components/Stop.astro`: one stop. Its article is the scroll distance (200svh) and its panel sticks to the
  bottom left. Put the caption and its HTML card inside.
- `scripts/film.ts`: scroll → **position** (0 at the first stop, 2.5 halfway between the third and
  fourth), position → active clip and `currentTime`, nearest-first loading.
- `scripts/main.ts`: Lenis smooth scroll, then `mountFilm`. Import it from the page in a `<script>`.

Media paths are fixed by `encode.sh`: `/film/clip-k.mp4`, `/film/clip-k-720.mp4`, `/film/poster-i.webp`
and `/film/poster-i-960.webp`, with k from 1 and i from 0.

## How the scrub stays seamless

- There is one clip fewer than stops. At the last stop the final clip holds its last frame.
- Poster i is the exact frame shown at stop i: the first frame of clip i+1, and the last frame of the final
  clip for the last stop. Posters fade in over the second half of the segment before them, so while a clip
  is still loading, scrolling still shows the right place.
- A clip becomes visible only after its `seeked` event lands on the wanted time, and neighbouring clips
  share a frame at the stop, so switching clips is invisible.
- Each clip is fetched whole as a blob before use, so scrubbing never waits on range requests.
- iOS Safari paints sought frames only after one `play()`: the loader calls `play()` then `pause()` once.
- `prefers-reduced-motion` or Save-Data: no clip is fetched; the posters carry the film.

## Encoding

- `-g 6 -keyint_min 6 -sc_threshold 0`: a keyframe every 6 frames keeps backward seeks fast.
- **ffmpeg 8 ignores `-color_primaries` / `-color_trc` unless the frames carry them**, so `encode.sh` adds
  `setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv` to the filter chain.
  Without the tags the browser paints the video lighter than the poster and every seam shows.
- Posters are decoded with `scale=in_color_matrix=bt709:in_range=tv:out_range=pc` so their RGB matches
  what the browser paints.

## Mobile crop

Portrait viewports crop the 16:9 frame; `focus` is the horizontal `object-position` per stop, interpolated
between stops. Read it off a poster sheet with a 10% grid:
`ffmpeg -i poster-%d.png ... drawgrid=w=iw/10:h=0:t=1:c=white@0.35` and set each stop's focus to the x% of
its subject. The caption panel covers the lower half on phones, so prefer subjects in the upper half.

## Captions

Use solid panels (card background, the design canon's radius and shadow) rather than gradient veils over the
video: they stay legible on any frame and need no per-stop tuning. Keep the first stop's panel the page's
`h1` and main action; the rest carry an `h2`, one sentence and one HTML card.
