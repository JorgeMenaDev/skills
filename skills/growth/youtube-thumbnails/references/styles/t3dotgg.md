# Style: t3dotgg (Theo, https://www.youtube.com/@t3dotgg)

Studied from his 60 latest thumbnails (2026-06 to 2026-09). Theo's channel packages tech news as **a reaction to a piece of evidence**. Copy the method, not his face, his screenshots or his subjects.

## Anatomy

Two zones on one frame, nearly every time:

- **Evidence, left ~55–60%.** The thing he is reacting to, shown as it looks in the wild: a dark-mode X post (avatar, name, verified badge, one or two lines, timestamp, huge view count), a product UI (a model picker, a settings toggle, a confirm dialog, a GitHub PR, Activity Monitor), a chart with 3–5 bars, a tier list, logos facing off ("vs"), a price tag crossed out, a tombstone reading "2020 – 2026". Clean, legible, large type; it carries almost all the words.
- **Reactor, right ~40%.** Theo cut out, head large, cropped hard by the right and bottom edges, looking at the evidence or straight at the viewer. The reaction is the emotion: hands on both cheeks (Home Alone), hand over mouth, face-palm, hand on chin (sceptical), eyes rolled up, slight smirk, sunglasses for a win.
- **Irony is the hook.** The evidence is usually a real artifact nudged one step into a joke: a model list escalating to "Opus LXVII", an effort picker whose top level is labelled "Mental illness", "Destroy the world 🔥 Full Access", a Community Note reading "It actually sucks". Viewers click to find out whether it is real.
- **Standalone headlines are rare.** When present: 1–3 words, heavy uppercase sans, black or white, sometimes one red arrow or red circle ("STOP TYPING TO CODE", "GOODBYE.", "STOP READING CODE").
- **Colour comes from the evidence:** X black, paper white or cream, and the brand colours of whatever logos appear. The reactor adds skin and hair; no glow, no gradients, no neon.
- **Title and thumbnail never repeat.** Titles are conversational, first person, a little dramatic, often trailing off: "This is really bad…", "So I was using Fable wrong...", "I'm done with terminals", "Well This Was Unexpected...". The thumbnail shows the evidence; the title gives the feeling.

## Applying it to a brand mascot

The mascot is the reactor. A logo face does not change expression, so the mascot reacts with its **body**: wings on both cheeks, a wing over the beak, a wing on the chin, a face-wing, leaning away, peeking in from the edge, sunglasses. At most one contained change to the face (for example half-closed lids for scepticism).

1. **Build a pose kit first**, once per channel: 6 poses (cheeks, mouth covered, chin, facepalm, peeking, sunglasses win), each a flat-vector full-body mascot on a transparent background, generated from the logo reference. Check each against the logo side by side. Where the face drifted, lock it with `scripts/face-lock.sh` (pastes the real logo face over the head). Keep the passing poses in `pose-kit/` and reuse them in every thumbnail.
2. **Evidence comes from the channel's own world**, and it must be honest: the product's real UI, a plausible customer message, a real review, a real price. Never put invented words in a real named person's or company's mouth; that is the one part of Theo's method a brand cannot copy.
3. **Compose:** evidence on the left ~60% (generated with the model, or a real screenshot), the pose from the kit composited right, cropped by the frame edge, its face above the bottom fifth so the duration badge covers only the body.
4. **Titles** keep the conversational, slightly dramatic voice, but in the brand's language and never first person from the mascot. For Spanish SMB audiences: "Tu cliente te escribió a las 23:47...", "Esto le pasa a tu negocio todos los días", "Nadie responde el WhatsApp de tu negocio (y se nota)".

## Checklist additions

- The evidence reads at 168×94: one post, one chart or one UI element, large.
- The mascot's reaction is legible at 168×94 and matches the evidence (shock for bad news, smirk for a win).
- The joke is one step from real, never a claim the product cannot back.
