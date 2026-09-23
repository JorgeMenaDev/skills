# The song

The song is the spine: every shot is timed to its beat grid and its word times, so it is made and locked
before a single frame is painted. A natural-sounding vocal comes from three things, in this order: lyrics a
native speaker would actually sing, a style prompt that names the vocal, and picking the best of several takes.

## Lyrics

Write them yourself in `music/lyrics.md`, in the audience's language and register.

- **One teaching point per line.** List what the viewer must learn (the brief), then give every item its own
  line. A line that teaches nothing is a line with no gag to paint.
- **The singer is a person, not the brand.** A customer, an owner, a fan sings *to* the hero. The hero never
  sings about itself (a mascot that speaks first-person becomes a persona nobody approved).
- **Picture words.** "el café frío y la paciencia rota" paints itself; "improves efficiency" paints nothing.
  Prefer concrete objects, times ("tres de la mañana"), sounds and small disasters.
- **Native slang, lightly.** One or two local idioms per song ("al tiro", "hace la pega", "entro yo a la
  cancha") make it sound written by a local. More than that reads as parody.
- **Singable.** 7–11 syllables per line, assonant rhyme at line ends (duerme/siete, venta/pega), the hook
  word repeated twice at the start of the chorus ("Andy, Andy, …"). Numbers written as words
  ("veinticuatro siete"), never digits.
- **Structure** that fits ~90 s: `[Intro] [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Bridge] [Final Chorus]
  [Outro]`. Section tags in square brackets; ad-libs in parentheses (the aligner skips both). A shorter film
  (~45–60 s) drops Verse 2 or the Bridge, never the chorus.
- **Line budget**: about 3.5 s per sung line at ~100 BPM plus a 3–5 s intro, so 60 s holds 15–17 lines and 90 s
  holds ~23. Say the length in `prompt.md` ("about 60 seconds, short intro, no long instrumental breaks") and ask
  for a 3–4 s instrumental outro: the end card needs a hold after the last word.
- The problem comes first (verse 1: the pain, sung funny), then the hero arrives (pre-chorus), then the promise
  (chorus). The bridge carries the twist that keeps the human in charge.

## Generating takes (Google Lyria 3 Pro)

Lyria 3 Pro (`lyria-3-pro-preview`) sings full songs with lyrics, up to ~3 minutes, and sounds natural. It runs
on Vertex AI: a Google Cloud project with billing on and `aiplatform.googleapis.com` enabled
(`gcloud services enable aiplatform.googleapis.com --project <p>`). List price was $0.08 per song
(Lyria 3 Clip, 30 s, $0.04); a whole video's music costs well under a dollar.

```bash
uv venv .venv && uv pip install --python .venv/bin/python google-genai librosa mlx-whisper
.venv/bin/python music/gen.py music/take1.mp3 --project <p> --style "Style: playful musical-theatre pop, like an animated film opening number, with a groovy latin rhythm section." --rename Andy=Ándi
```

- `music/prompt.md` holds genre, tempo, instruments and **the vocal** ("warm, charismatic female lead vocal,
  clear diction so every word is understandable, fun backing vocals on the name"). Naming the vocal and
  asking for clear diction is what makes the words land.
- Generate **three takes in different styles** in parallel (one `--style` line each). The winning Andy take
  was the musical-theatre style above; tropical cumbia-pop was the runner-up.
- **The name filter.** Lyria rejects some names outright (`prohibited_content`, "sensitive words"): the
  literal word "Andy" did, probably as an artist name. Bisect with short prompts on `lyria-3-clip-preview`
  (cheaper) to find the word, then respell it phonetically (`--rename Andy=Ándi`; hyphenated spellings failed).
  The karaoke still shows the real spelling.
- The filter is also **flaky**: an identical prompt can fail and then pass. Retry a failed take once before
  rewording anything.
- API gotchas: `location='global'` (regional endpoints are rejected), `client.interactions.create` (Lyria
  returns 400 on `generate_content`), audio in `interaction.output_audio.data`.

## Choosing and locking a take

You cannot listen, so judge with evidence and leave the ear to the human:

```bash
.venv/bin/python music/analyze.py music/take1.mp3 --lang es      # duration, tempo, transcript per segment
```

- **Diction**: the whisper transcript should read almost like `lyrics.md`. Mishearings of brand words are
  fine ("what's up" for WhatsApp); missing lines or invented lines are not.
- **Length and tempo**: within the target length; a steady detected tempo.
- Pick the best, copy it to `assets/song.mp3`, keep the others in `music/` as alternates for the human.
- Lock it: `python music/align.py music/take1.analysis.json --audio assets/song.mp3 --alias Andy=andi`
  writes `src/song.js` (beat grid + per-word times). Check the printed line times against the transcript and
  that most lyric words matched. **Changing the take after chapters are painted means re-timing every chapter.**
