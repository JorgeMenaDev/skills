# Worked example: Andy Publicaciones (2026-09)

The film this skill was distilled from: a 16 s Spanish launch film for Andy Publicaciones, a social media
scheduler that publishes one post to X, LinkedIn, Instagram and TikTok. Its beat map is
`examples/andy-publicaciones/BEATMAP.md` and its full scene is `examples/andy-publicaciones/index.html`, the
reference for code shape and quality. It needs its assets to render (`assets/font.woff2` Geist,
`assets/andy_logo.svg`, `assets/instagram-icon.svg`, `assets/p302899.jpg` a Pexels latte photo, the Mixkit files
named in the beat map, and `hit0..3.wav` cut from Mixkit 2532 "Slow typing on a keyboard").

## What made it work

- **The arc in `film.md` fit a feature, not just a chat product.** Ask = typing the post; act = Programar; work =
  channel badges landing through the breakdown; drop = Aprobar; result = previews flipping to Publicado;
  back = the week filling; line and mark = tagline, channel marks merging into the logo.
- **The drop template fit the music exactly**: starting Rising Forest 12 beats before its drop put its 4-beat
  breakdown on film beats 8–11, the "work" beats.
- **A stylised redraw of the real App**: its actual sidebar labels (Componer, Calendario, Por aprobar, Canales),
  breadcrumb, and the provider marks copied from the product's icon component.

## What the first cut got wrong

- The beat grid from onset autocorrelation was 0.15 s late and put the "drop" one beat early; refitting to the
  kicks fixed it (now built into `audio/beats.py`).
- Mixkit titles were paired with the wrong URLs (now fixed in `audio/mixkit.py`).
- The calendar at zoom 1 was too small to read on a phone, and the mid-morph frame around beat 7 was an empty
  blue block. Both are listed as anti-patterns.

## Numbers

| Step | Time |
|---|---|
| Brief, music, SFX, beat grid | ~25 min |
| Scene (≈530 lines of HTML/JS) and stills review | ~40 min |
| Final render, 957 frames × 8 subframes | 3.5 min |
| Mix, scan, mux | < 1 min |
