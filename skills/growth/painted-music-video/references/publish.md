# Render, publish, clean up

## Render

```bash
node render.mjs --frames=0:<dur> --workers=6       # resumable: re-run after a crash, done frames are skipped
node render.mjs --encode --out=out/film.mp4        # H.264 CRF 17 + AAC 256k, faststart
```

A 93.5 s film (2,244 frames) rendered in about 15 minutes with 6 workers on an M-series Mac mini and encoded
in about a minute (231 MB). Frames take ~1.2 GB: check free disk first. Verify with
`ffprobe -show_entries format=duration:stream=codec_name,width,height out/film.mp4` (1920×1080, h264 + aac, the
song's duration).

## Publish: Unlisted, and the human flips it

Upload **Unlisted** unless the human already ordered a public release: a public video is a public position.
Report the link, and let the human watch it with sound and decide.

YouTube Studio with no API: drive the human's signed-in Chrome on macOS with AppleScript, which can run page
JavaScript (`tell application "Google Chrome" to execute active tab of front window javascript js`).

- Open `https://studio.youtube.com/channel/<channel id>/videos` in a new Chrome window. Dismiss any welcome or
  "Get started / Dismiss" popup, then click Create → "Upload videos" (the `/videos/upload` URL no longer opens
  the dialog by itself).
- Studio is web components: walk every `shadowRoot` to find controls. Title and description are the
  contenteditable `#textbox` elements (set with `execCommand('selectAll')` + `execCommand('insertText')`).
  Audience: `tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]`. Then `#next-button` three times,
  `tp-yt-paper-radio-button[name=UNLISTED]`, `#done-button`.
- Only the file picker needs a real click: read the "Select files" button's screen position from page JS,
  click it with `cliclick c:x,y`, then System Events `Cmd+Shift+G`, type the path, Return, Return.
- Read JS files into AppleScript as UTF-8 (`read POSIX file "/tmp/x.js" as «class utf8»`): the default
  MacRoman read garbles every accent and emoji in the title.
- An `execute` can fail once with "Application isn't running" (-600) while Chrome is open: retry it.
- The Visibility step shows the youtu.be link; the content list needs a reload before the new row appears.
- Verify twice: Studio's row shows `Unlisted`, and anonymous
  `curl "https://www.youtube.com/oembed?url=https://youtu.be/<id>&format=json"` returns the title.
- Close the Chrome window you opened.

## Clean up

Delete everything regenerable once the MP4 is verified and kept somewhere durable: `out/frames`, check renders,
the Python venv (~1.1 GB with mlx). Commit and push the repo clean. Record the video link, the chosen take and
anything learned wherever the project keeps durable notes.
