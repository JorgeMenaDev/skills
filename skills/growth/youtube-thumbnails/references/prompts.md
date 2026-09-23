# Prompting the scene

Sources: OpenAI's image prompting guide https://developers.openai.com/api/docs/guides/image-prompting and cookbook https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide; mascot consistency https://meirlabs.com/articles/how-to-keep-an-ai-mascot-consistent; Codex's bundled `imagegen` skill (`references/prompting.md`).

## Skeleton

Short labelled lines beat one long paragraph. Long, adjective-stacked prompts make GPT Image "overcook" (visible artifacts). https://x.com/altryne/status/2098430308647666082

```
Use case: YouTube thumbnail, 16:9 landscape, full bleed.
Moment: <one sentence: who does what, where, when>.
Subject: <the one focal point, its emotion, its place in frame (left third / right third)>.
Supporting: <one object that proves the moment, e.g. a phone showing a booking confirmation>.
Setting: <real place with real texture>, <light: time of day, practical lamps>.
Style: photorealistic, tactile, shallow depth of field, high contrast. (or: flat vector, thick outlines)
Text: exactly "<≤4 words>", <weight, colour, placement>. No other text anywhere. | No text anywhere.
Keep empty: bottom-right corner (duration badge) and <where the logo will go>.
Avoid: neon glow, glassy floating UI, collage, stock smiling faces, invented logos.
```

Then iterate with single-change edits: "Change only X. Keep subject, layout, light and text exactly the same."

## Mascots and logos

- The model has no seed. Consistency comes from the reference image plus a preserve list, and it still drifts: in a 2026-09 test, a flat logo passed with "keep EXACT" came back with new eye and beak proportions and no outline.
- Default: generate the scene with the mascot **absent** and reserve its spot, then composite the real file with `scripts/finish.sh --logo`.
- When the mascot must act (pose, wings, emotion): label `Image 1: brand mascot reference`, say "same character, re-posed", list the invariants (silhouette, outline weight, eye shape, beak, gradient hexes), change one thing per call, and pass the side-by-side check against the file. Keep approved poses as a **pose kit** and reference the nearest pose next time.
- Never describe the mascot's look in words alongside the reference image; text competing with the reference is the main cause of drift.

## Text

- Quote the exact words, give weight, colour and placement, and say "no other text".
- Short Spanish lines with accents rendered correctly in the 2026-09 test ("Responde por ti", "¡Nos vemos mañana!"). The model also invented extra signage despite "no other text": read every word in the frame.
- Wrong glyph → regenerate once → otherwise generate text-free and set the words with `finish.sh --text`.

## Failure modes

| Symptom | Fix |
|---|---|
| Generic glossy look | Name a real place, a time of day and a tactile material; drop "premium", "cinematic", "glow". |
| Mascot drift | Composite the real file; see above. |
| Invented text or signage | Read every word; edit "remove the sign, change nothing else". |
| Subject in the badge corner | "Keep the bottom-right quarter empty." |
| Moderation refusal | Drop hyperbole ("shocked", "screaming"); describe the scene neutrally. |
