---
name: upload-file
description: Upload screenshots, GIFs and short videos to public URLs for PR evidence and validation steps. Use when a PR, review or verdict needs an image or clip, or GitHub won't take a file from the CLI.
version: 1.0.0
mutating: true
writes_to: ["the public `evidence` R2 bucket (files expire after 90 days)"]
---

# Upload evidence files

`gh` cannot attach files to a PR. This skill puts them in a public Cloudflare R2 bucket and prints Markdown you paste into the PR body or a comment. GitHub shows the images inline through its image proxy.

```bash
R2_EVIDENCE_TOKEN=… python3 <this skill's folder>/upload.py before-open.png after-open.png --prefix <repo>/<pr>
```

- It prints one line per file: `![name](url)` for PNG, JPEG, GIF and WebP, a plain link for anything else.
- `--prefix` is the bucket folder: `<repo>/<pr>` for PR evidence, `<repo>/<topic>` otherwise. A file with the same name in the same folder is replaced.
- Every file is deleted 90 days after upload. Don't use this for anything that must last.
- The URLs are public and unguessable only by path. Never upload secrets, login links, tokens or real people's data. Crop or blur first.
- `R2_EVIDENCE_TOKEN` missing: the script exits 2. Ask whoever runs the session; never look for another key.

## Video

GitHub strips `<video>` tags whose file it doesn't host, so a clip shows only as a link. Make a short GIF when it should play inline:

```bash
ffmpeg -i clip.mp4 -vf "fps=10,scale=960:-1:flags=lanczos" -loop 0 clip.gif
```

Keep GIFs under about 10 MB; trim with `-ss <start> -t <seconds>`. `agent-browser record start <path>` / `record stop` records a browser session to MP4.
