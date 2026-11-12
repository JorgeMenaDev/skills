# /visual-plan

`/visual-plan` turns a plan, report or comparison into one designed HTML page that opens straight from disk. The page is warm dark and phone first, set in Inter with Excalifont for sketches. It lists items as rows on hairlines with emoji state tags, and can hold Excalidraw drawings, hand-drawn wireframes and sticky-note whiteboards.

Everything runs locally. No account, no server, no network after the first drawing install.

```bash
npx skills@latest add JorgeMenaDev/skills --skill visual-plan
```

## What you get

Each plan is a folder in `$VISUAL_PLAN_DIR` (default `~/visual-plans`):

```
2026-03-01-signup-plan/
  index.html     the page, with inline CSS
  fonts/         Inter, Excalifont and their licences
  flow.excalidraw, flow.svg   a drawing, when the page has one
```

The folder is static and self-contained. Open it locally, zip it, or put it on any static host.

## Requirements

- macOS or Linux, with bash, python3, curl and perl.
- A Chromium browser for screenshots and drawings: Chrome, Chromium, Edge or Brave. Set `CHROME` to use another executable.
- bun or Node.js (npm) for Excalidraw drawings. The first drawing installs the pinned renderer into `scripts/excalidraw/node_modules`.
- Windows: use WSL, or open `index.html` directly.

## Fonts

Inter (Copyright 2016 The Inter Project Authors) and Excalifont (Copyright 2024 by Excalidraw) are licensed under the SIL Open Font License 1.1. The licence text sits next to each font in `templates/fonts/`, and every plan folder carries a copy.
