# Andy: nunca se duerme — storyboard

A 93.5 s painted music video that introduces Andy. The song is sung by **la Dueña**, the owner of a small
shop in Santiago, to Andy. Andy never speaks: his face is the logo and never changes. He acts with his body.

**The story in one line.** It is 3 AM and la Dueña is drowning in customer messages. A little blue bird flies
in and answers all of them. By the end she sleeps, the shop sells, and Andy is still working.

**What the video must teach, in order:** Andy answers WhatsApp, Instagram and the web, instantly, 24/7;
he books appointments into the calendar; he closes sales; he saves every lead; he sends a morning summary;
when a customer asks for a person, he hands over to the owner; one Andy covers every channel.

**Rules for every shot.**
- Something happens on screen in every shot: a character acts, something transforms, breaks, flies or pops.
- Every lyric line gets its own visual gag that shows the words. Hits land on beats (see ANIMATION_GUIDE).
- **Text-light.** The karaoke carries the words. The only painted words in the whole film are: the title
  ("Andy" + "nunca se duerme"), one neon "24/7" sign in chorus 1, the end card, and at most four comic sound
  effects in total (one per chapter at most, e.g. "¡DING!", "¡PUM!", "¡LISTO!"). No labels, no captions.
- **No fake product UI.** Phones and screens only ever show cartoon chat bubbles, glyphs and doodle charts,
  never an imitation of the Andy app or of WhatsApp/Instagram screens. No real logos: channels are colours
  (WhatsApp green bubbles, Instagram pink-orange bubbles, web blue bubbles).
- Andy is the hero but never talks and never holds a sign with a claim. La Dueña and the customers react.
- Motivated transitions: brush wipes (automatic) at 28.5, 47.2, 61.4 and 76.0 s. Every other cut is carried
  by the action (an iris, a flash, a zoom through a window, a whip pan).

## Cast

| Who | Look | Role |
|---|---|---|
| **Andy** | The logo bird: head disc with the fixed face, egg body, wing nubs, flat feet, tail fan, sky→periwinkle | Answers everyone. Tiny when he arrives, big (≈40% frame height) in the choruses. |
| **La Dueña** | Warm brown skin, dark curly bun with a pencil, gold hoops, coral shirt, cream apron, jeans, coral shoes | The singer. Exhausted → amazed → rested and happy. |
| **Clientes** | Round simple people in bright shirts (`client()`), each with a seed | Ask questions, book, buy, try to "escape", dance in the finale. |
| **Bubble critters** | Chat bubbles with eyes and little feet (`msgBubble(..., { critter: true })`) | The flood of messages at 3 AM. Once Andy answers one it flips to a double check and happily hops away. |

## Palette arc

Night indigo + lamp amber + phone glow (verse 1) → moonlit blue with Andy glowing (arrival) → party neon in
Andy blue and amber (chorus 1) → warm daylight cream (verse 2) → football-pitch green + channel colours
(bridge) → sunset to night party, then the quiet night street (finale).

---

## C0 · Title (0.0–7.0) · `src/ch/c0_title.js` · night street, moon, the Andes

| Time | Lyric | Shot |
|---|---|---|
| 0.0–3.1 | (intro) | A quiet night street in Santiago under the Andes and a big moon. One shop window glows at centre. The camera drifts in. On beats from ~1.2 s the title "Andy" drops in one letter per beat, bouncing, over the sky. |
| 3.1–4.9 | (intro) | A blue shooting star streaks across the sky, loops once and becomes the Andy mark (`andyLogo`) sitting by the title, then "nunca se duerme" writes in underneath. |
| 4.9–7.0 | "(uh-uh, ding-ding)" | Title lifts away. The camera pushes toward the glowing window: inside, a phone on the counter lights up on each "ding". Out: iris/zoom through the window at 7.0 into the shop. |

## C1 · 3 AM (7.0–21.4) · `src/ch/c1_night.js` · shop at night, lamp on

| Time | Lyric | Shot |
|---|---|---|
| 7.1–10.1 | "Tres de la mañana y el celular no para," | Tilt down from the wall clock at 3:00 to la Dueña asleep on the counter under the lamp. Her phone buzzes on every beat and hops toward the counter's edge. On "no para" it leaps; she jolts awake (wide eyes, frizz). |
| 11.2–14.9 | "¿Tienen hora?", "¿Cuánto sale?", "¿Abren mañana?" | Three bubble critters pop out of the phone, one per question, each on a beat (glyphs clock, $, cal), and hop onto her head. |
| 14.9–17.2 | "WhatsApp que suena, Instagram que explota," | Green bubbles jangle like alarm bells. On "explota" a pink-orange bubble inflates like a balloon and bursts ("¡PUM!") into a shower of little hearts and bubbles. |
| 17.9–21.1 | "y yo con el café frío y la paciencia rota." | She sips from her mug: it is ice cold (frost, a floating ice cube). Bubbles now flood the shop to her waist. On "rota" the pencil in her bun snaps in half. Pull back to show the flood. Out: the phone screen flares to a white-blue flash at ~21.3. |

## C2 · The blue bird (21.4–28.5) · `src/ch/c2_arrival.js` · moonlight, Andy glows

| Time | Lyric | Shot |
|---|---|---|
| 21.6–24.0 | "Y de pronto llegó un pajarito azul," | The window swings open. Andy flies in against the moon (silhouette → full colour, blue trail), lands on the counter with a squash. Every bubble critter freezes and turns to look. |
| 24.6–28.0 | "contestó a todos, ¡y con buena actitud!" | A whirlwind: Andy taps critter after critter with a wing, one per beat or eighth; each flips to a double-check bubble, cheers and hops out of the window. On "buena actitud" Andy strikes the wings-up pose with sparkles; la Dueña's jaw drops (mouth O), then heart eyes. |

## C3 · Chorus 1 (28.5–47.2) · `src/ch/c3_chorus1.js` · the shop becomes a dance floor

| Time | Lyric | Shot |
|---|---|---|
| 28.7–31.1 | "Andy, Andy, nunca se duerme," | The lamp becomes a disco ball; spotlights in Andy blue and amber. Big Andy (≈40% of frame height) dances centre stage, backed by the answered, happy critters. The moon peeks into the window; Andy is wide awake. |
| 31.1–33.3 | (instrumental) | Keep the dance going: a camera move and a pose change on the bar. |
| 33.4–36.3 | "contesta al tiro, veinticuatro siete," | A neon "24/7" sign flickers on (the one allowed word-sign). The wall clock's hands spin wildly; calendar pages fly off. Andy catches incoming bubbles one per beat and fires replies back like a baseball pitcher. |
| 38.2–41.5 | "agenda la hora, cierra la venta," | Whip pan left: Andy stamps the wall calendar and a blue dot pops on a day. Whip pan right: the register rings ("¡DING!"), the drawer pops, confetti. |
| 42.5–45.9 | "y mientras duermo, Andy hace la pega." | La Dueña asleep in the salon chair with a sleep mask, smiling, zzz. Pan to Andy at the counter wearing a tiny headset, typing on a phone with both wings, speed lines, bubbles flying out answered. |
| 45.9–47.2 | (tail) | Andy does a spin and a bow as the brush wipe arrives (47.2). |

## C4 · The workday (47.2–61.4) · `src/ch/c4_workday.js` · warm daylight

| Time | Lyric | Shot |
|---|---|---|
| 47.5–50.1 | "Le pregunta a la clienta qué día le acomoda," | A customer at the counter. Andy fans a hand of little calendar cards like a magician; she picks one. |
| 50.1–53.1 | "lo anota en el calendario, y listo, sin demora." | Andy flies up to the wall calendar (big, close) and marks the day; more appointment dots pop in across the grid on the beats. "¡LISTO!" pops once. |
| 54.8–58.1 | "Guarda el nombre y el teléfono, ningún cliente se me escapa," | Little contact cards (a face doodle + a phone doodle) fly into a big glass jar on the counter. One customer tiptoes to the door; Andy catches their card with a butterfly net just in time. The customer laughs. |
| 58.1–61.5 | "y en la mañana me llega el resumen con la data." | Sunrise through the window. La Dueña, rested, sips a hot coffee (steam this time). Andy flies in with a rolled newspaper and unrolls it: doodle bar charts that grow upward, a heart. She beams. |

## C5 · Bridge (61.4–76.0) · `src/ch/c5_bridge.js` · a football pitch + the three channel doors

| Time | Lyric | Shot |
|---|---|---|
| 61.5–64.9 | "Y si alguien pide hablar con una persona," | A customer bubble critter rings a tiny desk bell. Andy nods, raises a wing like a linesman's flag. |
| 64.9–68.7 | "me suena el teléfono, ¡y entro yo a la cancha!" | La Dueña's phone rings; the shop floor unrolls into a football pitch with a cheering crowd of customers. Andy holds up the substitution board (arrows). She runs onto the pitch and takes the conversation, triumphant. |
| 68.7–71.9 | "WhatsApp, Instagram y la web también," | Three doors in a row: green, pink-orange, blue. On each channel word its door bursts open and a stream of bubbles pours out. Andy zips between the three doors answering them all. |
| 71.9–76.1 | "un solo pajarito que lo hace todo bien." | The three streams swirl together and converge on one Andy, who rises on a little pedestal, golden star behind him, hero pose. Camera pushes in. |

## C6 · Finale (76.0–93.5) · `src/ch/c6_finale.js` · party → night → the street → end card

| Time | Lyric | Shot |
|---|---|---|
| 76.1–79.1 | "Andy, Andy, nunca se duerme," | The shop party at sunset: bunting, confetti. A dance line: la Dueña, customers, happy critters, Andy centre and big. |
| 79.1–81.2 | (instrumental) | Everyone does the same move on the bar (a conga or a spin). |
| 81.2–83.1 | "contesta al tiro, veinticuatro siete," | Time lapse: sun and moon swap in the window on every beat; Andy keeps dancing through it. |
| 84.1–86.3 | "agenda la hora, cierra la venta," | The wall calendar and the register sprout little legs and join the dance line. |
| 86.3–89.1 | "y mientras duermo, Andy hace la pega." | The party is over, lights dim to night. La Dueña asleep in the salon chair, smiling. Andy at the counter, a phone glowing in his wing, half-lidded and calm. The camera pulls back out through the window to the street (the reverse of the opening). |
| 89.1–93.5 | "Andy, Andy... ¡nunca se duerme!" | The night street from the opening. The shop sign lights up as the Andy mark. End card over the sky: the Andy mark, the word "Andy", "nunca se duerme" and "andypartner.com". Hold to the end. |
