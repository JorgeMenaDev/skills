---
name: scroll-film-landing
description: "Build a scroll-driven film landing page: AI stills joined by first/last-frame video clips (Higgsfield API), scrubbed by scroll, with real HTML captions per stop. Use when asked for a scroll world, a scroll-scrubbed video hero, a camera walk-through landing, or Higgsfield clips for a website."
version: 1.1.0
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
for t in node pnpm ffmpeg ffprobe cwebp jq curl uv; do command -v $t >/dev/null && echo "HAVE_$t: yes" || echo "HAVE_$t: no"; done
{ [ -d "/Applications/Google Chrome.app" ] || command -v google-chrome >/dev/null; } && echo "CHROME: yes" || echo "CHROME: no"
[ -f "${HF_ENV_FILE:-$HOME/.config/higgsfield/api.env}" ] && echo "HF_KEY: saved" || echo "HF_KEY: missing"
```

Install anything missing (`brew install ffmpeg webp jq uv`; `uv` is only needed to reframe real photos). Chrome is required for QA: Playwright's bundled
Chromium cannot decode H.264.

Install for an agent without prompts: `npx skills@latest add JorgeMenaDev/skills --skill scroll-film-landing -a claude-code -y`
(it also writes `skills-lock.json` to the project).

## Steps

### 0. Project

Scaffold Astro first, so `scripts/` and `media/` live inside the project. create-astro refuses a non-empty
folder, so scaffold into a temp dir and copy it in:

```bash
pnpm create astro@latest /tmp/film-astro --template minimal --no-install --no-git --skip-houston -y
cp -R /tmp/film-astro/. . && pnpm install && pnpm add lenis && pnpm add -D playwright
printf '.env*\n.vercel\n' >> .gitignore
```

Copy `templates/scripts/` into the project as `scripts/` and `chmod +x scripts/*.sh scripts/reframe/*.sh`.
Every script path below is relative to the project root.

### 1. Brief the stops

Read the product's design canon (design system, site, brand rules). Write a **stops table**: 5 to 7 stops,
each with an `id`, a place in the world, the caption's one-line claim, and the HTML card that proves it
(a table row, a status, a figure), plus an opening arrival shot. Pick the branch:

- **Invented world** (software, services): each place is a physical metaphor for its stop (an archive for an
  inventory, an inspection room for review). Stills are generated.
- **Real photos** (a cabin, a venue, a property): the world is the real thing and stops are its real rooms
  or views. Read [references/real-photos.md](references/real-photos.md) now: it changes how stops are
  ordered and captioned.

**Done when** the table lists every stop, the branch is named, and N-1 clips follow from N stops.

### 2. Key and budget

If `HF_KEY: missing`, the human runs `scripts/hf-key-setup.sh` in their own terminal (the key is entered
hidden, never in chat). Then price the run with free estimates. Read
[references/higgsfield-api.md](references/higgsfield-api.md) first: the Higgsfield CLI and the API have
separate balances.

**Done when** the human has seen `stills + clips ((N-1) × clip price) + retakes` and approved it. Price
`duration: 6` and `duration: 8`. Under a hard cap, cut retakes or clip length before stops, and state how
many retakes the cap allows.

### 3. Stills

- **Invented world:** write one request body per stop from [references/art-direction.md](references/art-direction.md)
  (shared style block, recurring object, doorway continuity), generate a batch of 4 per stop, build contact
  sheets, and pick one per stop.
- **Real photos:** catalogue, order, reframe to 16:9 and clean each pick as
  [references/real-photos.md](references/real-photos.md) says. Edits need uploads now, so clean logos,
  plates and faces before any upload.

**Done when** the human has seen all N picks side by side and approved them. This is the last free exit.

### 4. Clips

Upload the picks (`scripts/hf-upload.sh`; record each URL in `media/uploads.tsv`), write clip bodies from the art-direction reference, generate
**one test clip** (the move that invents the most), review its frame strip, then generate the rest in
parallel a few seconds apart. Run every paid clip with `HF_CAP_USD=<cap>` when the human set a cap. Review
every strip for cuts, fades, warping, readable text, invented rooms or fixtures (a hard fail for a real
product) and a final frame that settles on the next still; retake only the failures and move rejected takes
to `media/clips/rejected/`.

**Done when** every clip passes its strip review and `scripts/spend.sh` reports the charged total.

### 5. Encode

Run `scripts/encode.sh`. It writes `public/film/clip-k.mp4` (1080p), `clip-k-720.mp4` (mobile) and the
posters, with a keyframe every 6 frames and BT.709 / sRGB tags.

**Done when** `encode.sh` prints `bt709` primaries and `iec61966-2-1` transfer on every clip, the keyframe
count is `ceil(frames / 6)` (H3 returns about 0.58 s more than `duration`), and every clip-to-clip seam it
prints is at least 30 dB; retake the clip on either side of a lower seam.

### 6. Build

Scaffold Astro (`pnpm create astro@latest`, `pnpm add lenis`, `pnpm add -D playwright`), copy `templates/src/` (including the example
`pages/index.astro`) and `templates/qa/`, and style the header, captions and sections in the product's
design canon. After every encode, `rm -rf dist && pnpm build`: an older build can leave `dist/film/` empty. Wiring, the mobile crop (`focus`) and the
gotchas are in [references/engine.md](references/engine.md).

**Done when** `pnpm build` passes and every stop's caption and card show at desktop and 390 px wide.

### 7. QA

Start the preview on a free port (`lsof -iTCP:4400 -sTCP:LISTEN` empty, then `pnpm preview --port 4400`;
Astro 7 daemonises it, `pnpm astro preview stop` ends it) and pass that URL to both scripts:
`node qa/verify.mjs http://localhost:4400/` scrolls both ways at 1440x900 and 390x844, checks the clip time
follows the scroll, measures poster vs video PSNR at two stops, checks reduced motion loads no video, and
fails on console errors or the wrong server. `node qa/sections.mjs http://localhost:4400/` screenshots every
section below the film and fails on broken images.

**Done when** both print `PASS`, and the human has the stop and section screenshots and the run command.
