---
name: visual-plan
description: "Turn a plan, report or comparison into a designed single-page HTML file the reader opens locally. Use when asked for a visual plan, an HTML page or artifact, or \"show me\", or for a diagram, sketch, wireframe or whiteboard on a page."
version: 2.0.0
license: MIT
mutating: true
writes_to: ["$VISUAL_PLAN_DIR (default ~/visual-plans): one folder per plan", "scripts/excalidraw/node_modules (the drawing renderer, installed on first use)"]
---

# Visual plans

A **plan** is one folder, `<yyyy-mm-dd>-<slug>/` inside `$VISUAL_PLAN_DIR` (default `~/visual-plans`), holding `index.html`, its `fonts/` and every image, drawing and video it shows. It opens straight from disk: no server, no account, no network.

Scripts live in this skill's `scripts/` folder; run them by their path. They need bash, python3, curl and perl, plus a Chromium browser (Chrome, Chromium, Edge or Brave; set `CHROME` to point at another). Drawings also need bun or Node.js. On Windows, use WSL, or open `index.html` directly and skip the scripts.

## Steps

1. **New plan.** `scripts/new.sh <slug>` prints a new folder with `templates/page.html` and its fonts copied in. **Update** instead when the reader wants changes to an existing plan: edit its folder in place, never a second folder for the same plan.
2. **Write it.** Keep the components that fit (answer, figures, rows, tags, timeline, steps, table, notes, wireframes, whiteboard, drawing, evidence) and delete the rest with their example text. Follow ## Design system, and ## Drawings, wireframes and whiteboards when a picture explains faster than words. Write fresh for a reader who did not see the chat: the answer first, then the evidence. Charts: inline SVG on the dark tokens.
3. **STOP: look at it first.** `scripts/shot.sh <folder> /tmp/<slug>` writes phone and desktop screenshots. Read both images, and shoot again with one row `open` when the page has expanding rows. Fix clipped text, a squeezed title, sideways scroll on the phone and missing media, then shoot again. Checking only the HTML source is how a broken page reaches the reader.
4. **Hand it over.** Open `<folder>/index.html` with the OS opener (`open` on macOS, `xdg-open` on Linux). Reply with the file path on its own line and one sentence on what the page shows.

**Sharing** is the reader's choice. The folder is static and self-contained, so any static host serves it as is. Keep secrets and credentials off every page.

## Design system

The tokens and components live in `templates/page.html`; copy its `<style>` whole and add page-specific rules after it.

- **The headline is a fact sentence** with real counts, under a mono eyebrow. GOOD: "22 features turn the CRM into the place where sales happen. 10 are planned by 15 March." BAD: "CRM Roadmap Overview".
- **Rows on hairlines, not cards.** A list is `.rows`; an item with more to say is a `<details class="row">` that opens in place. Figures sit on hairlines, never in boxed KPI tiles.
- **States, each with its emoji and colour.** Grey `.tag` is neutral. `.tag.done` ✅ is green: finished and checked. `.tag.wait` is blue: our move, with ⏳ (in progress), 📅 (a date) or 🛠️ (to build). `.tag.warn` is amber: someone else must act, with 👉 (or 💰 for a money decision). `.tag.alert` 🚨 is red, for the gravest case only. Colour only the states that matter; a page with a coloured tag on every row has spent its budget.
- **Play a bit.** Most pages need not be serious. A section title may start with one emoji, and the answer may open with 👉. Keep emoji at the start of a line, one per line at most.
- **Fonts:** Inter for prose; mono for dates, codes, counts and eyebrows, with tabular numbers; Excalifont only for sketches (sticky notes, wireframes, drawings).
- **Every waiting state names who acts** (`.who`, or a tag such as "👉 Needs Alex").

## Drawings, wireframes and whiteboards

Use one only when it makes the point faster than text: a flow, funnel or system with four or more connected parts; what a screen showed or should show; options or hypotheses side by side. One or two per page at most, and most pages need none.

- **Excalidraw drawing** (a flow, funnel, system, before and after). Write `<name>.excalidraw` in the plan folder; `templates/drawing.excalidraw` shows the element shapes (boxes, text bound to them, arrows bound to both ends; `fontFamily: 5` is Excalifont). Draw in Excalidraw's light colours: the export applies its dark mode, which also inverts emoji colours, so keep emoji out of drawings. Draw about 340 units wide so the text stays readable on a phone; vertical flows suit a phone best. Run `scripts/excalidraw.sh <folder>/<name>.excalidraw`, which writes `<name>.svg` with its fonts embedded, offline. Embed it with the `figure.drawing` snippet in the template, with the SVG's width and height, and link the `.excalidraw` so the reader can edit it at excalidraw.com.
- **Wireframes** (`.board` holding `.wires`): hand-drawn phone screens. `.hit` circles the place where someone got stuck, and `.cap` under each screen says what it is.
- **Whiteboard** (`.board` holding `.stickies`): sticky notes for hypotheses (💡), facts (✅) and open questions (❓).

## Page rules

- **Self-contained.** Inline CSS and JS, fonts from the folder's `fonts/`, media copied into the folder. Links the reader clicks may point anywhere; every script, style, font and media file loads from the folder.
- **Dark only, phone first.** The template is built for 375px wide and sets `color-scheme: dark`. Wide tables go inside `.table-wrap` so they scroll sideways.
- **Plain English**, short sentences. The page explains; it does not repeat the chat word for word.
- **Define every label where it first appears**, before any row or drawing uses it: people coded A–D, ids such as F1 or R2, product terms. A reader cannot guess who "B" is in a drawing.
- **Media size.** Keep the folder light enough to send. Make a web copy of a video and a poster frame, and leave the original untouched:
  `ffmpeg -i in.mp4 -vf scale=-2:720 -c:v libx264 -crf 26 -preset slow -movflags +faststart -c:a aac -b:a 96k video.mp4`
  `ffmpeg -ss 3 -i in.mp4 -frames:v 1 -vf scale=-2:720 -q:v 3 poster.jpg`
