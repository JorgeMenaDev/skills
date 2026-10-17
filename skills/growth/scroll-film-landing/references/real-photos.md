# Real photos

Use this branch when the product is a real place or object with the owner's photos (a cabin, a shop, a
venue, a property). The world is the real thing: stops are real rooms or views, stills are real photos, and
every caption describes what the visitor is actually looking at.

## Catalogue

Look at every photo before choosing. For each, record in `media/stills/catalogue.tsv`: file, room or view,
which unit or model it shows, orientation, and **view direction** (which wall or landmark it faces). Build
1x4 review sheets to see them all. Group by unit: a film walks through one unit, so prefer the unit with a
photo of every stop. A walkthrough video can supply stills (extract frames with ffmpeg and check sharpness)
only if it shows the same unit.

## Ordering the walk

Real photos face wherever the photographer stood. Write, for each pair of neighbouring stops, the landmark
the two photos share (a doorway, a wall, a window). Order stops so each still faces roughly the direction of
travel; a pair needing more than about a 90° turn inside one clip usually fails. A move no photo shows (the
door from outside, one room to the next) will be invented by the clip model: name those clips at Step 3,
make one of them the test clip, and budget a retake for each. Any frame showing a room, fixture or furniture
that is not in the real unit fails the strip review.

## Reframing to 16:9

- **Crop** when the subject survives a 16:9 crop (most landscape 4:3 photos). This is 100% real.
- **Outpaint** portrait photos:
  1. `scripts/reframe/canvas.sh PHOTO media/stills/canvas/NAME [Y_SHIFT]` crops the photo to a
     1280x1080 band and centres it on a 1920x1080 canvas with flat grey side bars.
  2. Upload the canvas and send it to `xai/grok-imagine-image-2.0` with `image_urls: [canvas]`,
     `aspect_ratio: "16:9"`, `resolution: "2k"`, `quality: "medium"`, and a prompt naming the room's
     materials: "Outpaint: this is a real photograph of {room}, placed in the centre of a 16:9 canvas. Fill
     the flat grey areas on the left and right with a realistic continuation of the same room ({materials},
     same daylight, lens and perspective). Do not change the central photograph at all. No new furniture,
     people, text, letters, logos or screens." About $0.09 each.
  3. `uv run --with opencv-python-headless --with numpy scripts/reframe/paste.py AI.png BAND.png OUT.png`
     puts the real pixels back. Expect a median alignment error near 1 px and about 55% real pixels.
- Tested and rejected: `alibaba/qwen-image-3/edit` redraws the centre when given grey bars and stretches
  the photo when given the band alone.
- Disclose it. A real product shown with AI-extended frames and AI motion needs one plain line near the
  film and in the footer (for example "made from real photos of a cabin we built, extended and animated
  with AI").

## Clean before upload

Real photos break the "no text" rule in ways no prompt can avoid. Before any upload, check every still for
logos, brand badges, number plates, screens, faces and house numbers. Fix each with a local blur, or with a
box passed to `paste.py` so only that area is left to the AI (say "remove the {object}" in the prompt).
Record each fix in `media/stills/picks.tsv`. Uploads give public URLs, so clean first.

## Captions

A caption names a product or model only when the source links that photo to it. If the site never says which
model a photo shows, the captions speak about the company (process, materials, team, payment, contact) and
the model question goes to the human.
