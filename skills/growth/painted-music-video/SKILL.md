---
name: painted-music-video
description: "Make a music video painted entirely in code: an original sung song, watercolour animation in p5.brush, word-by-word karaoke, rendered to MP4. Use when the user wants a music video, an animated explainer or product intro with a song, a mascot video, or something like PDoomVideo."
version: 1.0.0
license: MIT
mutating: true
writes_to: ["a new video repo (engine, song, chapters)", "Google Cloud Vertex AI usage (Lyria)", "YouTube (Unlisted upload)"]
---

# Painted music video

A picture-book music video where a character sings to a hero: an original song, painted sets, a visual gag on
every lyric line, word-by-word karaoke, rendered frame by frame in headless Chrome. The method comes from
[PDoomVideo](https://github.com/JohnHeibel/PDoomVideo); the engine in `templates/` is an independent
implementation (that repo has no license). The worked example is [references/example-andy.md](references/example-andy.md).

## Contract

- **Song first, pictures second.** The chosen take, its beat grid and its word times are locked before any
  frame is painted; every hit lands on a beat and every gag on its word.
- **Every frame is a pure function of song time.** No state between frames, no `Math.random`: frames render in
  parallel and out of order.
- **Full sets, a story, a gag per lyric line.** A character dancing on an empty background is the failure the
  whole method exists to avoid.
- A brand mascot keeps its logo face and acts with its body; it never speaks first-person. Screens show cartoon
  bubbles, never a fake copy of a real app.
- Publishing public is the human's call: upload Unlisted and hand over the link.

## Preamble

```bash
for t in node ffmpeg uv gcloud; do command -v $t >/dev/null && echo "HAVE_$t: yes" || echo "HAVE_$t: no"; done
[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] || [ -n "$CHROME" ] && echo "CHROME: yes" || echo "CHROME: no"
echo "GCP_PROJECT: $(gcloud config get-value project 2>/dev/null)"
df -h . | tail -1 | awk '{print "FREE_DISK: "$4}'
```

If any `HAVE_*` or `CHROME` is `no`, install it first. If `GCP_PROJECT` is empty or has no billing, stop and
ask the human for a billed Google Cloud project: a fake or instrumental song cannot carry the video. Frames
need ~1.5 GB per 90 s.

## Steps

1. **Brief.** Settle with the human or from the context: the hero, the singer, the language, the length
   (45–95 s), and "what the viewer must learn, in order". Done when that list is written into the repo README.
2. **Song.** Read [references/song.md](references/song.md) in full. Write `music/lyrics.md`, generate three
   takes, analyse them, pick one, lock `src/song.js`. Done when the chosen take's transcript matches the lyrics
   and `align.py` matched most words.
3. **Scaffold.** Copy `templates/` into a new repo (`gitignore` → `.gitignore`), `npm install`, render a quality
   bar into `out/reference/quality-bar.jpg` (PDoomVideo frames, or frames of a previous film in this style).
4. **Cast and set.** Read [references/storyboard.md](references/storyboard.md). Write the rigs and the recurring
   set, render the model sheet, fix it until every rig is on-model.
   **STOP** until the model sheet passes: dispatching chapters on a broken rig copies the defect into every chapter.
5. **Storyboard and guide.** Write `STORYBOARD.md` (one row and one gag per lyric line) and fill
   `ANIMATION_GUIDE.md`'s Characters section. Commit and push.
6. **Chapters.** Read [references/chapters.md](references/chapters.md). Dispatch one agent per chapter in
   parallel with the prompt template. Done when every chapter has reported.
7. **Integrate.** Fix the reported shared-file bugs, render the whole-film review sheet, fix what it shows.
   **STOP** before the full render until every lyric line's gag is visible in the sheet: a 15-minute render of an
   unchecked film is the waste this gate prevents.
8. **Render and publish.** Read [references/publish.md](references/publish.md). Render, encode, verify, upload
   Unlisted, verify the link anonymously.
9. **Clean up.** Delete regenerable artifacts, push the repo, record the link and the chosen take durably.

## Anti-patterns

- **The dancing loop**: a mascot moving on a plain backdrop. It is pretty, and nowhere near the bar.
- **Text-heavy frames**: labels and captions that repeat the lyric. The karaoke already says it.
- **Snapped moods**: a face or pose that changes between frames with no take (squash, emote, then the new pose).
- **Chapter agents editing shared files**: they report; you fix once, after all of them finish.
- **Re-rolling the song after painting**: it re-times every chapter. Lock it in step 2.

## Output

```
STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED
Video: <link> (Unlisted) · <duration> · 1920x1080
Song: <take + style> · <cost> · alternates: <files>
Repo: <url> @ <sha>
Chapters: <n> · concerns: <one line each, or none>
```
