# Wainwrights Baggers: beat map

- **Product:** Wainwrights Baggers, a native iPhone app (plus web) for bagging the 214 Wainwright fells of the Lake District.
- **Feature / action:** a walker taps Great Gable on the map, sets the day they walked it, taps "Bag it".
- **Viewer learns, in order:** all 214 fells on one map → tap a fell, the map flies to it → height, book, rank → bag it with a date → the count climbs and the seven books fill → the day lands in the year's photo journal (printable) → tagline → brand.
- **Language:** English (UK). **Frame:** 1080x1920 vertical, 60 fps, 32 beats (~15.9 s). Phone app for Reels/TikTok/Shorts.
- **Brand (from `wainwright-tracker`, read-only):** Palette `apps/ios/.../App/Theme.swift` and `apps/web/styles/slope.css`: moss #3E6E54, leaf #5C946F, pine #1F4232, ink #112318, cream #FAFAE8, paper #F3F1E4, bracken #E3A23B (bagged), contour #8A6E4B. Type: Newsreader (serif headings, `--font-serif`) + Plus Jakarta Sans (body), the web canon; the iOS app itself uses SF + New York, which are not redistributable, so the redraw uses the web canon's open pair. Logo `apps/web/public/logo-512.png` (trig pillar). Vocabulary from the app: "Search 214 fells", "47 of 214 / 167 to go", "The Western Fells · Book Seven", Height / Book / Rank "by height", "Date walked", "Bag it", "Bagged", "Journal", "Print album". Tagline copy from the landing page: "Bag it on the hill. Write it up at home." and "A quiet tracker for the 214 Wainwrights."
- **Surface:** stylised redraw of the iPhone app in a DOM phone frame. Map drawn from the product's own terrain data (`apps/web/public/terrain/v2`: district heights at 100 m, 10 m tiles around Great Gable, OSM water/woods) by `tools/gen_map.py`, with all 214 summits at their DoBIH coordinates from `packages/catalog`. Real iOS screenshots (`apps/web/public/screens/ios`) used as the reference for layout.
- **Photos:** Pexels (free licence) 35734483 (Great Gable from Wasdale), 16520669 (Wast Water), 18774238 (Easedale Tarn), 8465231 (Derwentwater).
- **Music:** Mixkit "Rising Forest" (id 471), 124.0102 BPM, residual 18 ms, MUSIC.offset 9.7051 s: breakdown on film beats 8–11, drop on film beat 12 (payoff = "Bag it").

| Beat | What happens | SFX |
|---|---|---|
| 0–3 | Close on the phone (zoom 2.05, slow push). The Lake District map; the 214 fell markers pop in book by book, one Pictorial Guide per half-beat (Eastern → Western); 47 are already bracken (bagged). | pop ×7 |
| 3.5 | The progress sheet rises: "Search 214 fells", ring, "47 of 214 · 167 to go". | soft swoosh |
| 4–4.5 | Labels rise on the big four: Scafell Pike 978 m, Helvellyn 950 m (4), Skiddaw 930 m, Great Gable 899 m (4.5). | light pop ×2 |
| 5–5.9 | A finger enters and glides to Great Gable. | — |
| 6 | **Act:** tap. The marker grows into the selected pin; the map flies from the whole district to Great Gable (10 m contours) while the camera pulls back once to show the whole iPhone. | tap + whoosh (peak 7) |
| 6.55–7.4 | The sheet grows into the fell card; "Great Gable" rises (6.8) while "47 of 214" rides the sheet bottom and drops out, then "The Western Fells · Book Seven" (7.3). | swoosh |
| 8, 8.5, 9 | Breakdown, one per half-beat: Height 899 m / 2,949 ft, Book Seven / Western, Rank #7 by height. Camera pushes toward the card. | pop ×3 |
| 9.5 | "Date walked" row and date pill "28 Sep 2026" rise. | pop |
| 10–10.25 | Finger taps the pill; the date rolls to "26 Sep 2026". | tap + tick |
| 10.5–11.9 | "Bag it" button rises; finger moves onto it and presses. | sweep |
| 12 | **Payoff on the drop:** "Bag it" floods the frame bracken in ~0.35 s; the bagged badge bursts in. | tap + deep impact (peak) |
| 12.25–12.5 | "Great Gable" and "Bagged · 26 Sep 2026" rise. | sweep |
| 13–13.5 | "47 of 214" rises and rolls to 48. | success tone |
| 13.75–15.25 | The seven books rise one per quarter-beat, bars filling (Eastern 9/35 … Western 2/33). | light pop ×7 |
| 15.5 | Western ticks 2 → 3 of 33. | success tone |
| 16–16.8 | **Back:** the flood contracts, carrying the result, into a tile of the Journal (the camera moved under the flood); bracken sweeps up off the tile to show the Great Gable photo. | wind swoosh (peak) |
| 16.5–16.75 | "2026" and "6 fells · 9 photos" rise. | — |
| 17–19 | The year's album fills, one tile per half-beat in walking order: Catbells 14 Mar, Helvellyn 4 Apr, Scafell Pike 23 May, Tarn Crag 12 Jun, Skiddaw 18 Jul. | pop ×5 |
| 19–20 | Finger enters and taps "Print album". | tap |
| 21–22 | **Line:** the "Print album" pill grows into the whole frame (moss) while the camera pushes in; its label grows to headline size and slides out. Cream contour rings (the app's own decoration) sit in the moss. | fast whoosh (peak) |
| 22.5–24 | "Bag it on the hill." rises word by word. | (music) |
| 24.25–25.75 | "Write it up at home." rises word by word. | (music) |
| 26.5–27 | The lines leave through their masks. | short swoosh |
| 27–28.5 | **Mark:** seven bagged markers (one per book) pop in a row. | pop ×7 |
| 29–29.75 | The markers merge into one dot that springs into the app icon. | sparkle (peak) |
| 30–31 | Icon rises; "Wainwrights Baggers" wipes out from behind it; "A quiet tracker for the 214 Wainwrights." rises; "Coming soon to iPhone · wainwrightsbaggers.com" rises. | swoosh |
| 31–32 | Hold on the brand; the music tail fades. | — |

## Step-4 gate (unattended self-check against the film.md checklist)

Checked on `out/beats.jpg` (all 33 beats) and stills at beats 2, 5.5, 6.6–7.6, 9.8, 12.6.

- [x] **Learn-list maps to named beats, in order:** 214 fells (0–3) → tap + fly (6) → height/book/rank (8–9) → date (9.5–10.25) → bag it (12) → count 47→48 and seven books (13–15.5) → journal year album + print (16–20) → tagline (22–26) → brand (27–32).
- [x] **A change on every beat, no hold over ~1 s:** longest hold is the tagline pair at 25.5–26.5 (0.48 s) and the final brand hold after 31.1 (~0.9 s + tail), which is the intended end.
- [x] **Payoff on the drop, breakdown shows work:** "Bag it" floods on film beat 12 = song drop; beats 8–11 land one card element per half-beat.
- [x] **Transitions are shape changes / masks / floods / shared elements:** sheet → card (shape), marker → pin (spring), bracken flood out of the button and back into the Great Gable tile carrying the result, pill → frame, dots → icon, wordmark wipe. No crossfade. (The detail map layer blends in over the fly as a level-of-detail swap, not a scene transition.)
- [x] **No zoom-in-and-straight-out:** push 0–5.8, one pull-back on the tap (6–7.6), one push toward the card (8.2–11.7), repositions only under the flood (12.4–13) and the pill (21–22.6).
- [x] **Brand:** Newsreader + Plus Jakarta Sans, moss/pine/bracken/cream/paper, trig-pillar logo, app vocabulary. Smallest text: map labels 11 pt × 2.05 ≈ 22 px, journal captions 12 pt × 2.05 ≈ 25 px; the card at the 1.55 pull-back (beats 7.6–8.2) has 12 pt ≈ 19 px captions, only while the camera is moving back in.
- [x] **Copy:** English (UK), the app's own strings and the landing page's own tagline; claims only shipped features (map, bag with a date, count, seven books, journal with photos and notes, printable album). "Coming soon to iPhone" matches the site while the app is in review.
- **Fixed at the gate:** beat 7 showed an empty sheet mid-morph (the anti-pattern); now the title rises at 6.8 while "47 of 214" rides the bottom of the growing sheet and drops out.

**Verdict: PASS, continue to build/sound/render.**
