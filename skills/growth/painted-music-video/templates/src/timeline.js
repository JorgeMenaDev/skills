// timeline.js: chapter registry, brush-wipe breaks between chapters, and word-by-word karaoke.
//
// chapter(name, start, end, shots): shots = [[t0, fn], ...] in time order. A shot fn(t, lt, dur) gets song time,
// time since the shot started, and the shot's length. It paints the ENTIRE frame and is a pure function of t.

const CH = [];
function chapter(name, start, end, shots) { CH.push({ name, start, end, shots }); CH.sort((a, b) => a.start - b.start); }

// Brush wipes in the hero's colours at these chapter breaks (cover by the boundary, reveal after it).
const WIPES = [];                               // e.g. [28.5, 47.2, 61.4, 76.0]: the chorus/section edges
const WIPE_COLS = [PAL.sky, mixCol(PAL.sky, PAL.peri, .5), PAL.peri];
const HERO_WORD = null;                          // e.g. /Andy/: karaoke paints the hero's name in the hero colours
const WIPE_TR = .32;
let KARAOKE_OFF = false;          // a shot may set this (e.g. title and end cards)

// Standalone loops (not in the film): window.LOOP = LOOPS[name] swaps the whole frame; t is loop time.
const LOOPS = {};

function drawWorld(t) {
  KARAOKE_OFF = false;
  if (window.LOOP) { window.LOOP(t); KARAOKE_OFF = true; return; }
  const ch = CH.find(c => t >= c.start && t < c.end);
  if (!ch) placeholder(t);
  else {
    let i = 0; while (i + 1 < ch.shots.length && t >= ch.shots[i + 1][0]) i++;
    const t0 = ch.shots[i][0], end = i + 1 < ch.shots.length ? ch.shots[i + 1][0] : ch.end;
    ch.shots[i][1](t, t - t0, end - t0);
    camEnd();
  }
  WIPES.forEach(b => { if (Math.abs(t - b) < WIPE_TR) wipe((t - (b - WIPE_TR)) / (2 * WIPE_TR), b); });
}

function placeholder(t) {
  paint(rectPts(-80, -80, W + 160, H + 160), { wash: '#DDE6F7', ink: null });
  letter('(chapter not painted yet)', 960, 300, 56, PAL.ink, { outline: false });
  letter(t.toFixed(2) + ' s', 960, 400, 40, PAL.ink, { outline: false });
}

// Painterly wipe: fat blue strokes sweep across (k 0..0.5 covers, 0.5..1 uncovers from the other side).
function wipe(k, seed) {
  const cover = k < .5, p = cover ? easeIn(k * 2) : easeOut((k - .5) * 2);
  const cols = WIPE_COLS;
  for (let i = 0; i < 7; i++) {
    const y0 = -120 + i * 190, lag = hash(seed * 10 + i) * .18, q = clamp((p - lag) / (1 - lag));
    const a = cover ? -300 : lerp(-300, W + 300, q), b = cover ? lerp(-300, W + 300, q) : W + 300;
    if (b - a < 4) continue;
    paint([[a, y0 - 30], [b, y0 - 60], [b + 40, y0 + 200], [a - 40, y0 + 230]], { wash: cols[i % 3], ink: null });
  }
}

// ---------- karaoke ----------
function currentLine(t) {
  for (let i = 0; i < LYRICS.length; i++) {
    const L = LYRICS[i], next = LYRICS[i + 1], hold = next ? Math.min(L.end + .6, next.start - .12) : L.end + 1;
    if (t >= L.start - .25 && t < hold) return { L, i, fadeIn: seg(t, L.start - .25, L.start - .05), fadeOut: 1 - seg(t, hold - .15, hold) };
  }
  return null;
}
function drawKaraoke(c, t) {
  if (KARAOKE_OFF) return;
  const cur = currentLine(t); if (!cur) return;
  const { L } = cur, a = Math.min(cur.fadeIn, cur.fadeOut); if (a <= .01) return;
  const words = L.text.split(' '), size = 46;
  c.save(); c.globalAlpha = a;
  c.font = `800 ${size}px ${FONT_BODY}`; c.textBaseline = 'middle';
  const sp = c.measureText(' ').width, ws = words.map(w => c.measureText(w).width), total = ws.reduce((x, y) => x + y, 0) + sp * (words.length - 1);
  const cx = W / 2, cy = 1022, pw = total + 90, ph = 76;
  c.fillStyle = 'rgba(22,22,28,.18)'; roundRect(c, cx - pw / 2 + 4, cy - ph / 2 + 6, pw, ph, 38); c.fill();
  c.fillStyle = PAL.cream; c.strokeStyle = PAL.rim; c.lineWidth = 4; roundRect(c, cx - pw / 2, cy - ph / 2, pw, ph, 38); c.fill(); c.stroke();
  let x = cx - total / 2;
  words.forEach((w, j) => {
    const ts = L.words[j] ?? L.start, te = L.words[j + 1] ?? L.end, sung = t >= ts, k = seg(t, ts, ts + .12);
    const isHero = HERO_WORD && HERO_WORD.test(w);
    c.save(); c.translate(x + ws[j] / 2, cy - (sung ? Math.sin(Math.PI * k) * 6 : 0));
    c.textAlign = 'center';
    c.fillStyle = sung ? (isHero ? PAL.peri : '#3E3A8C') : 'rgba(42,36,56,.42)';
    if (sung && t < te) { c.fillStyle = isHero ? PAL.sky : PAL.coral; }
    c.fillText(w, 0, 0);
    c.restore();
    x += ws[j] + sp;
  });
  c.restore();
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
