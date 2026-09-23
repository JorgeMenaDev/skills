# Cast, set and storyboard

## Cast and set

Write the rigs yourself before any chapter exists: seven chapter agents will copy whatever the model sheet
shows, including its mistakes.

- **One rig function per character**: `hero(x, y, u, o)` with (x, y) the ground point between the feet and `u`
  a size unit. Options cover pose (dy, sq squash, rot, tilt, flip, sx spin, limb angles, walk/fly phase),
  face, hooks (`handL/handR` or `wingL/wingR` at the limb tip, `draw` in body space for hats and props),
  `emote` + `emoteK` for reaction marks, and a beat-locked `heroMove(style, t)`. `examples/andy/andy.js`
  and `examples/andy/cast.js` are complete references.
- **Brand mascots keep their face.** If the hero is a logo, the logo face never changes. Allow at most one
  contained deviation (Andy's half-closed `lid`). The hero acts with the body: squash, lean, bounce,
  limbs. A fixed face that leans and peeks cannot argue and cannot become a first-person persona.
- **Chibi proportions for everyone**: big heads, short bodies, so the singer and the hero read as one family.
- **The recurring set** is one function (`shopBack(t, { night, lamp, party, … })` + `shopFront`) with a fixed
  layout written in its header comment. Chapters return to it; a fixed layout keeps them consistent.
- Backgrounds are layered watercolour `fill` shapes, never one flat colour.
- **Model sheet** (`src/gallery.js`): every rig in every expression and pose, and the set by day and at its
  most dramatic lighting. Render it, look hard, fix proportions and contrast, re-render. Save the passing sheet
  to `docs/reference/model-sheet.jpg` for the chapter agents.

## STORYBOARD.md

The storyboard is the brief every chapter agent reads. `examples/andy/STORYBOARD.md` is the template: copy
its shape.

- **Header**: the idea in one line, "what the video must teach, in order" (the brief's list), rules for every
  shot, the cast table, the palette arc.
- **Rules for every shot** (keep these, adapted):
  - Something happens in every shot: a character acts, something transforms, breaks, flies or pops.
  - **Every lyric line gets its own visual gag** that shows the words, and hits land on beats.
  - **Text-light**: the karaoke carries the words. Budget the only painted words: the title, at most one sign,
    the end card, and at most four comic sound effects in the whole film.
  - **No fake product UI**: screens show cartoon bubbles, glyphs and doodle charts, never an imitation of the
    real app or of third-party apps; no real third-party logos (channels are colours).
  - Motivated transitions: brush wipes (automatic) at the big section edges, and every other cut carried by the
    action (an iris, a flash, a push through a window, a whip pan).
- **One section per chapter**: `## C<n> · <name> (<start>–<end>) · src/ch/<file>.js · <set and palette>`, then a
  table `| Time | Lyric | Shot |` with one row per lyric line (times from `LYRICS`) and rows for instrumental
  gaps. Each Shot cell is one concrete, drawable gag with its beat hit and its "Out" transition where it ends
  a chapter.
- **Chapters** follow the song sections, 5–18 s each, 4–7 chapters for a 60–95 s film. Put chapter edges at
  bar lines just before the next section's first word; put `WIPES` in `src/timeline.js` at 2–4 of them.
- The opening establishes the world with the title; the finale returns to it (a pull-back to the opening
  location) and holds on the end card: logo, name, promise, URL.

## ANIMATION_GUIDE.md

Copy `templates/ANIMATION_GUIDE.md` and fill its `## Characters` section from your rig files (signatures,
options, hooks, sizes). Everything else in it is engine-generic, including the engine traps list.
