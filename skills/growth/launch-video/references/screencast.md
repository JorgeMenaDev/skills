# Screencast cut

A real screen recording of the live product, edited into a short captioned clip: one 16:9 cut for X, one 1:1 cut
for LinkedIn, and a poster frame for each. Use it to show a feature working, not a designed film. The founder never
appears on camera and never records himself (Jorge, 2 Nov 2026). Worked example: the Andy Ideas board launch,
2 Nov 2026 (23 s, five shots, about 2 hours end to end on the first run).

## Steps

1. **Brief.** Write the shot list: what to open, what to create, what not to press (publish, approve, archive,
   delete, "Turn into draft"). Pick one real, harmless record to create on camera.
2. **Sign in.** Use the host's built-in browser (T3 `preview_*`), default profile.
   - A product login you hold (QA actor, review account): use it.
   - The founder's own account on a Clerk app: mint a one-use, 60 s sign-in ticket with the production Clerk
     secret and open it through `templates/screencast/ticket302.py`, a loopback redirect that keeps the ticket out
     of your commands. Run it in the background with the key in `K`:
     `python3 -I ticket302.py <user_id> /en/<workspace>/<page>`, then navigate to `http://127.0.0.1:47651/`.
     Find the user id with `GET https://api.clerk.com/v1/users?email_address=...`. Send a `User-Agent` header:
     Clerk's API returns 403 to Python's default. The landing URL still echoes the consumed ticket. Revoke the
     session when done: `POST /v1/sessions/<id>/revoke`. Only for a recording the founder ordered.
3. **Language.** In Andy the account language always wins over the URL prefix and the `andy_locale` cookie
   (ADR 0032). Setting the cookie alone causes a reload loop. For an English take, switch the account language in
   the user menu, record, switch it back, and check that the original language is ticked.
4. **Rehearse once without recording**, then record: `preview_recording_start`, drive the page with `preview_act`
   (CSS or text selectors, not refs), hold 3 to 5 s on each moment with a timed `preview_evaluate`
   (`new Promise(r => setTimeout(r, 4000))`), then `preview_recording_stop`. The recording is the page only
   (1402x876 at the default size), with the host's cursor drawn in. `preview_act type` fills text at once, so
   there is no typing to cut. Avoid `preview_snapshot` during a take, and close the user menu before recording:
   it shows the account email.
5. **Find the moments.** Contact sheets of the raw take: `ffmpeg -ss <a> -t <d> -i take.mp4 -vf
   "fps=2,scale=400:-1,tile=6x4" -frames:v 1 sheet.jpg`. Write down the in and out point of each shot, skipping
   loading skeletons and dialog fades.
6. **Edit.** Copy `templates/screencast/` into a film folder outside any repo, `npm i playwright-core geist`, copy
   `Geist-Medium.woff2` and `Geist-SemiBold.woff2` from `node_modules/geist/dist/fonts/geist-sans/` into `assets/`
   as named in `edit.html`, plus the product logo, and re-encode the take all-intra:
   `ffmpeg -i take.mp4 -vf fps=30 -g 1 -c:v libx264 -crf 12 -an footage.mp4`.
   Fill `SEG` in `edit.html`: in and out (source seconds), speed, one eased camera move per shot
   (`[zoom, cx, cy]` in **recording pixels**, with separate `sq0`/`sq1` for the square cut), and one caption.
   Read coordinates off the recording: host screenshots may be scaled (T3's are 1280 wide).
   The video is drawn into a canvas each frame. Transforming the `<video>` element itself left a strip of
   repeated footage in headless Chrome screenshots.
7. **Check.** `node render.mjs x sheet`, `node render.mjs sq sheet`, and full-size stills of the busiest shots
   (`node render.mjs sq stills 6.5,15.5`): no clipped text, nothing private (emails, account menus, employer
   names), captions that claim only what the take shows or the product does.
8. **Render.** `node render.mjs x video`, `node render.mjs sq video`, and a still of the strongest shot as each
   poster. About one minute per cut.

## Captions

Short, plain, one line each, no em or en dashes. They rise in after each cut and ease out before the next one.
The end card names the feature and the product, with no link and no call to action.

## Known gaps

- No sound. X and LinkedIn autoplay muted, so the clip reads in silence. A music bed would follow `audio.md`.
- At the closest zoom the footage is upscaled about 2x and looks slightly soft. A larger recording viewport helps.
- No vertical 9:16 cut yet for Instagram or TikTok.
- Toward a tool: the shot list, the timed holds and `SEG` could come from one JSON file, so a launch becomes
  "write the shot list, run one command".
