# Art direction

## The world

One building, one light, one palette, walked through in order. Each stop is a room whose contents are a
physical metaphor for the stop's message, joined to the next by an open doorway or a clear path. A small
**recurring object** (for example a white sculpted block model) appears in most rooms so the film reads
as one journey. Derive the palette from the product's brand colour: walls in the brand colour, neutral
floor, one natural material.

## Still prompts

Each body = the room's sentence + one shared **style block**, identical across stops. A style block that
worked:

> Architectural interior photograph of a calm, contemporary building, 16:9 widescreen, eye level, 24mm lens,
> symmetrical one-point perspective, no people. Walls painted deep {brand colour} ({hex}), matte black steel
> details, pale limestone floor, warm oak joinery. Soft, even morning daylight from tall windows, gentle
> natural shadows, no glow, no haze. Quiet, precise, serene. Muted natural colours, photorealistic, high
> detail. The lower left of the frame is calm and uncluttered. Absolutely no text, letters, numbers, logos,
> signage, labels or screens.

- Each room sentence names the doorway onward ("an open doorway at the far end") and places the recurring
  object.
- "The lower left is calm" leaves room for the caption panel.
- Ask for dials "without numerals" and label holders "blank": models add glyphs to anything that usually
  carries text.

## Picking

Build a 2x2 contact sheet per stop (`ffmpeg ... hstack/vstack`). Prefer the frame with a one-point view and
a visible doorway toward the next room. Expect the recurring object to change shape between rooms; the clips
smooth part of it. Show all picks on one sheet before Step 4.

## Clip prompts

Each body = the move + one shared tail. The move describes one camera path from this still to the next:

> Smooth first-person camera walk through a calm {colour} building. The camera glides slowly forward down
> the {room}, past {object}, through the doorway at the far end, and into {next room}, settling {where the
> next still is framed}.

When the start still has no opening toward the next room (a wall with only a window), the model invents
one, often straight through the glass. Name the route ("walks along the wall to the open door"), add
"never passes through glass, a window or a wall", and list what must not appear ("no white cabinets").

Tail, identical across clips:

> One continuous take on a steady gimbal at eye level, slow and calm, gentle ease-in and ease-out, settling
> exactly on the final frame. Constant focal length, no zoom, no cuts, no fades, no dissolves, no morphing,
> no people, no animals moving, no camera shake, no flicker. Preserve the architecture, colours and light exactly. No text,
> letters or logos appear. Photorealistic. Silent.

## Strip review

`ffmpeg -i clip.mp4 -vf "fps=2,scale=480:-2,tile=4x4" -frames:v 1 strip.jpg` gives 16 frames. A clip
passes when the walk is continuous, the last frames hold on the next still, and no readable text appears.
If two frames look like a cut, make a dense strip of that span before retaking
(`ffmpeg -ss 2.2 -t 2 -i clip.mp4 -vf "fps=6,scale=400:-2,tile=6x2" -frames:v 1 dense.jpg`): fast pans
look like cuts at 2 fps.
Retake a clip that cuts, fades, passes through a wall or invents text; tighten its move sentence first.
