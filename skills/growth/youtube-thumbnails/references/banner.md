# Channel banner

- Upload 2560×1440, under 6 MB (YouTube Studio banner uploader). Every device shows the central **1546×423** (x 507–2053, y 508–931); desktop shows up to the full-width 2560×423 strip, TV the whole image. Studio previews all three crops after upload: look at each.
- The model cannot hold that band: in a 2026-09 test, text landed 7 px from the edge and ignored the requested margins. So the model paints a **background plate** only: full 16:9 scene, calm and darker in the central band, with the interest pushed to the left and right thirds of the strip.
- Composite the real logo and one line of copy with `scripts/finish.sh IN OUT.png --size 2560x1440 --logo ... --text ...` (banner size centres both inside the safe area), then crop x 507, y 508, 1546×423 and look at it: every word and the whole logo sit inside with visible margin.
- Upscale note: the 1672×941 original is upscaled to 2560×1440; keep plates soft (bokeh, gradients, texture), since fine detail blurs when upscaled.
- The banner repeats the channel's promise in the brand's words. It is not a thumbnail: no moment needed, one line of copy, the logo, a URL at most.
