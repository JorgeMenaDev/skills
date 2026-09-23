---
name: youtube-thumbnails
description: "Make YouTube thumbnails and channel banners with an image model (Codex image generation on a ChatGPT plan), grounded in the real brand assets. Use when the user wants a thumbnail, a channel banner or channel art, or says a channel or its thumbnails look poor, generic or AI-made."
version: 0.3.0
license: MIT
mutating: true
writes_to: ["image files in a working directory", "ChatGPT plan image usage (Codex)"]
---

# YouTube thumbnails

A thumbnail is half of a **package**: the thumbnail carries the emotion or the moment, the title carries the context, and the two share almost no words. The image model paints the **scene**; the real brand assets and the final check stay in your hands. Research behind every rule: [references/craft.md](references/craft.md).

## Contract

- **One moment per thumbnail.** One subject, at most three elements (subject, one object, 0–3 words). A thumbnail that describes the topic instead of showing a moment is the failure this whole skill exists to prevent.
- **Real brand, never a lookalike.** The logo or mascot comes from its source file, composited on top. A posed mascot generated from the reference must pass a side-by-side identity check against the file (outline, eyes, beak or features, gradient), or it is dropped for the composited original.
- **Scene, not template.** The image comes from the model. HTML templates (headline + UI screenshot + glow) are exactly what reads as AI slop; code only places the real logo, sets text the model got wrong, and exports.
- **Three diverse concepts per video** (different hook, not different hue), so YouTube's Test & Compare has something to decide.
- The human picks and publishes. You deliver a review sheet and files; uploading is their call unless already ordered.

## Steps

1. **Brief.** Per video, write the promise in one sentence, the audience, the title it will pair with, and three concepts. Each concept names its moment as a verb (someone asking, booking, finishing). Done when every concept passes the one-second test: a stranger would get the promise from the concept line alone.
2. **Style and brand kit.** When the human names a channel whose look they want, follow its profile in `references/styles/` (one exists: [t3dotgg](references/styles/t3dotgg.md), a mascot reacting to evidence); the profile overrides the defaults here where they conflict. Collect the source logo or mascot file (PNG with alpha), palette hexes, and brand font. Look at the brand's own site so the scenes share its world. Done when every path is absolute and opened once.
3. **Generate.** Two variants per concept with Codex image generation. Mechanism, sizes and the non-Codex route: [references/codex-imagegen.md](references/codex-imagegen.md). Prompt skeletons, mascot references and text rules: [references/prompts.md](references/prompts.md). Record each prompt, output path and seconds in `prompts.jsonl`.
4. **Finish.** For each keeper, `scripts/finish.sh` places the real logo, optionally sets a headline, and exports 1280×720 JPG under 2 MB (banner sizes delegate to `scripts/finish-banner.py` with a local brand font). Model-rendered words stay only if every glyph is right, accents included.
5. **Check.** `scripts/review-sheet.sh <dir> [out] [duration]` renders every candidate at 640×360 beside 168×94 with a real duration badge; judge glyphs separately at full size. Drop any candidate that fails the [checklist](references/craft.md#checklist) and log it in `dropped.txt` with its failed line. Done when final/ holds three diverse concepts passing lines 1–14.
6. **Hand over.** Show the review sheet, recommend one per video with the reason, and list the other two for Test & Compare. Line 15 is the publisher's job after upload.

**Banner branch:** channel banners follow [references/banner.md](references/banner.md); the model paints only the background.

## Output

`<workdir>/thumbnails/<video-slug>/` holding `raw/` (model originals), `candidates/` (finished exports under review), `final/` (1280×720 JPGs), `dropped.txt` (one line per rejected candidate with its failed checklist line), `review.png`, and `prompts.jsonl` (one line per call; repairs carry `edit_of` pointing at the repaired raw). A worked example: [examples/andy.md](examples/andy.md).
