---
name: scroll-film-landing
description: "Build a scroll-driven film landing page: AI stills joined by first/last-frame video clips (Higgsfield API), scrubbed by scroll, with real HTML captions per stop. Use when asked for a scroll world, a scroll-scrubbed video hero, a camera walk-through landing, or Higgsfield clips for a website."
version: 1.0.0
license: MIT
mutating: true
writes_to: ["a new Astro project (src/, public/film/, media/, scripts/)", "Higgsfield API usage (paid, estimated before every call)", "~/.config/higgsfield/api.env (the API key, mode 600)"]
---

# Scroll film landing

A landing page whose hero is a **film** the visitor scrubs with the scroll: N stills become N-1 clips, clip k
runs from **stop** k to stop k+1, and scroll position sets `currentTime`. Scroll down to go forward, up to go
back. Method after midudev's Arko landing (github.com/midudev/mcp-higgsfield-landing); the engine here is
its own implementation.

## Contract

- **The film carries mood, HTML carries truth.** AI video smears text and numbers while the camera moves, so
  stills hold no readable text, logos or screens. Every claim, figure and UI sits in an HTML **caption** at
  the bottom left of its stop.
- **One world.** All stills show one continuous place in one style, each with a doorway or path toward the
  next, so the model animates a camera move, not a morph.
- **Spend gate.** Every paid call is estimated first and the estimate reported. The human approves the budget
  (Step 2) and the stills (Step 3) before any clip money is spent.
- **Seams are invisible.** The poster under each clip is extracted from the encoded clip itself, and colour
  tags are verified, so poster and video match (Step 7 measures it).
- **Local by default.** Uploads to Higgsfield get public CDN URLs: upload only material the owner may share.
  Deploy only when asked, and treat private work per [references/private-deploy.md](references/private-deploy.md).

## Preamble

```bash
for t in node pnpm ffmpeg ffprobe cwebp jq curl; do command -v $t >/dev/null && echo "HAVE_$t: yes" || echo "HAVE_$t: no"; done
{ [ -d "/Applications/Google Chrome.app" ] || command -v google-chrome >/dev/null; } && echo "CHROME: yes" || echo "CHROME: no"
[ -f "${HF_ENV_FILE:-$HOME/.config/higgsfield/api.env}" ] && echo "HF_KEY: saved" || echo "HF_KEY: missing"
```

Install anything missing (`brew install ffmpeg webp jq`). Chrome is required for QA: Playwright's bundled
Chromium cannot decode H.264.

## Steps

### 1. Brief the stops

Read the product's design canon (design system, site, brand rules). Write a **stops table**: 5 to 7 stops,
each with an `id`, a place in the world, the caption's one-line claim, and the HTML card that proves it
(a table row, a status, a figure). Choose a world where each place is a physical metaphor for its stop
(an archive for an inventory, an inspection room for review), plus an opening arrival shot.

**Done when** the table lists every stop, the world is named, and N-1 clips follow from N stops.

### 2. Key and budget

If `HF_KEY: missing`, the human runs `scripts/hf-key-setup.sh` in their own terminal (the key is entered
hidden, never in chat). Then price the run with free estimates. Read
[references/higgsfield-api.md](references/higgsfield-api.md) first: the Higgsfield CLI and the API have
separate balances.

**Done when** the human has seen `stills (N × batch price) + clips ((N-1) × clip price) + one retake per clip`
and approved it.

### 3. Stills

Write one request body per stop from [references/art-direction.md](references/art-direction.md) (shared
style block, recurring object, doorway continuity), generate a batch of 4 per stop, build contact sheets,
and pick one per stop.

**Done when** the human has seen all N picks side by side and approved them. This is the last free exit.

### 4. Clips

Upload the picks (`scripts/hf-upload.sh`), write clip bodies from the art-direction reference, generate
**one test clip**, review its frame strip, then generate the rest in parallel. Review every strip for cuts,
fades, warping, readable text and a final frame that settles on the next still; retake only the failures.

**Done when** every clip passes its strip review and `media/jobs.jsonl` totals the spend.

### 5. Encode

Run `scripts/encode.sh`. It writes `public/film/clip-k.mp4` (1080p), `clip-k-720.mp4` (mobile) and the
posters, with a keyframe every 6 frames and BT.709 / sRGB tags.

**Done when** `ffprobe` shows `bt709` primaries and `iec61966-2-1` transfer on every clip, and the
keyframe count is the frame count divided by 6.

### 6. Build

Scaffold Astro (`pnpm create astro@latest`, `pnpm add lenis`, `pnpm add -D playwright`), copy `templates/src/` and `templates/qa/`, and
style the captions in the product's design canon. Wiring, the mobile crop (`focus`) and the
gotchas are in [references/engine.md](references/engine.md).

**Done when** `pnpm build` passes and every stop's caption and card show at desktop and 390 px wide.

### 7. QA

Start `pnpm preview` and run `node qa/verify.mjs`. It scrolls both ways at 1440x900 and 390x844, checks
the clip time follows the scroll, measures poster vs video PSNR at two stops, checks reduced motion loads
no video, and fails on console errors.

**Done when** `verify.mjs` prints `PASS`, and the human has the stop screenshots and the run command.
