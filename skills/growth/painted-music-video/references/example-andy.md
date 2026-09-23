# Worked example: "Andy: nunca se duerme" (2026-09)

The film this skill was distilled from: a 93.5 s Spanish music video introducing Andy, an AI agent that answers a
small business's WhatsApp, Instagram and web messages. Its source files live in `examples/andy/`.

## Inspiration

[JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo): a 156 s music video painted entirely in code
by Claude with p5.brush, rendered in headless Chrome, with a storyboard and an animation guide briefing
parallel subagents, one chapter each. That repo carries **no license**, so its code is never copied: the
engine in `templates/` is an independent implementation of the same method. Clone it only to render a quality
bar (`node render.mjs --sheet=0.8,4,9,14,24,31,40,47,55,62,78,88,100,112,120,128,140,152 --cols=6 --w=480`).

## What was made

- **Story**: 3 AM, la Dueña (a Santiago shop owner, the singer) drowns in customer messages; a blue bird flies
  in and answers them all; by morning the calendar is full, sales rang, every lead is saved, the summary
  arrives; a customer who wants a person gets her; one bird covers every channel; she sleeps, Andy works.
- **Teaching list → lines**: answers 24/7 on every channel (chorus), books appointments, closes sales, saves
  leads, morning summary (verse 2), human handoff, one agent for all channels (bridge).
- **Lyrics**: `examples/andy/lyrics.md`. The chorus:
  > Andy, Andy, nunca se duerme, / contesta al tiro, veinticuatro siete, /
  > agenda la hora, cierra la venta, / y mientras duermo, Andy hace la pega.
- **Song**: Lyria 3 Pro, 3 takes; take 3 (musical-theatre Latin pop, 99.4 BPM, 93.5 s) won. "Andy" was
  blocked by the name filter and sung as "Ándi". Music cost ≈ $0.52 at list price including filter probes.
- **Cast**: `examples/andy/andy.js` (the logo bird: fixed face, egg body, wings, flat feet), `examples/andy/cast.js`
  (la Dueña, customers, phones, chat-bubble critters with eyes and feet), `examples/andy/props.js` (the shop:
  window onto Santiago and the Andes, clock, calendar, counter, register, salon chair; day/night/party).
- **Storyboard**: `examples/andy/STORYBOARD.md`, seven chapters: title (street, letters drop on beats), 3 AM chaos,
  the bird arrives, chorus 1 (disco shop, "24/7" neon), the workday, the bridge (a football substitution
  for the human handoff, three channel doors), finale (party, pull back to the street, end card).
- **One chapter as a reference for quality and code shape**: `examples/andy/chapter-example.js` (the arrival).

## Numbers

| Step | Time |
|---|---|
| Song: lyrics, 3 takes, analysis, alignment | ~40 min (mostly finding the name filter) |
| Engine, rigs, set, model sheet, storyboard, guide | ~70 min |
| 7 chapter agents in parallel | 20–37 min wall clock |
| Shared fixes + whole-film review | ~15 min |
| Render (6 workers) + encode + upload | ~20 min |

## What the human rejected first

A dancing-mascot loop on an empty stage, before any of this: "nicer, but not even close". The difference
was never the brush: it was the song with a story, full sets, a gag per lyric line, supporting characters,
and chapters that hand off to each other. Start from those.
