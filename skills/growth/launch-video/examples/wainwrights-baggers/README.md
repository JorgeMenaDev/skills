# Example: Wainwrights Baggers (vertical phone app with a map)

The skill's proof of concept, made by a fresh agent from the installed skill alone in about 23 minutes. It is a
15.9 s, 1080x1920 film for an iPhone app that tracks the 214 Wainwright fells of the Lake District. It covers
the routes the Andy example does not: a phone frame and a finger instead of a browser and a cursor, a map drawn
from the product's own terrain data, a map fly-to, two font families (serif display + sans UI), and a flood
that returns into a journal tile.

- `BEATMAP.md`: the brief, the beat map and the step-4 gate verdict.
- `index.html`: the scene (fells from `assets/fells.json`, map layers `map_overview.jpg` / `map_detail.jpg`).
- `gen_map.py`: builds those assets from the product repo's terrain tiles and fell catalogue (hillshade,
  water, woods, contours). Pass the path of a
  [wainwright-tracker](https://github.com/Andesphere/wainwright-tracker) checkout; it shows the pattern, not a drop-in tool.

Assets (fonts, logo, Pexels photos, generated map layers) are not bundled.

It predates the end-hold gate: `scan.py` measures its end hold at 0.83 s, so a new film should finish the
end card's motion earlier.
