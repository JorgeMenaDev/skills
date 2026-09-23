// core.js: frame constants, math and timing helpers, shape builders, the paint() wrapper around p5.brush,
// camera, lettering, full-frame effects, paper and grain, and the render hooks used by render.mjs.
// Every frame is a pure function of song time T: frames render in parallel and out of order.

const W = 1920, H = 1080, TAU = Math.PI * 2;
const BOIL = 12;                         // line "boil" rate (jitter reseeds 12x per second)
const DUR = SONG.dur;

// Palette. Replace the first row with the hero's own brand colours; keep the world warm and soft around them.
const PAL = {
  sky: '#4BC0F4', peri: '#616FF7', beak: '#F7BA44', rim: '#16161C', white: '#FFFFFF',
  ink: '#2A2438', paper: '#F4EEE2', cream: '#FFF6E6',
  night: '#1C2150', dusk: '#34307A', plum: '#5B3F8C', moon: '#FFE9A8',
  coral: '#F2786B', rose: '#F29BB0', peach: '#F8C6A0', mint: '#7FD6B8', leaf: '#5DAE7A',
  wa: '#3DCB6C', waDk: '#1F9D4E', ig1: '#F58529', ig2: '#DD2A7B', ig3: '#8134AF',
  wood: '#C98F5E', woodDk: '#8A5A36', wall: '#F6E7D2', steel: '#8FA3C0'
};

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const frac = x => x - Math.floor(x);
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeIn = x => Math.pow(clamp(x), 3);
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const backOut = (x, s = 1.8) => { x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s); };
const elasticOut = x => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * TAU / 3) + 1; };
const hash = i => { const v = Math.sin(i * 91.345 + 47.853) * 24634.6345; return v - Math.floor(v); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const wob = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);
const jit = a => (random() * 2 - 1) * a;          // seeded per boil frame, so outlines shimmer like hand drawing
function kf(t, keys, e = ease) {                   // keyframes [[t, v], ...]; v may be a number or an array
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((t - a) / (b - a));
    return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
  }
  return keys[keys.length - 1][1];
}
function mixCol(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, clamp(k)));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// ---------- beat clock (from the song's detected beat grid, so hits land on the real drums) ----------
const BEATS = SONG.beats, BEAT = 60 / SONG.bpm;
function bpOf(t) {                                 // continuous beat position: integer on each beat
  if (t <= BEATS[0]) return (t - BEATS[0]) / BEAT;
  const n = BEATS.length;
  if (t >= BEATS[n - 1]) return n - 1 + (t - BEATS[n - 1]) / BEAT;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (BEATS[m] <= t) lo = m; else hi = m; }
  return lo + (t - BEATS[lo]) / (BEATS[hi] - BEATS[lo]);
}
const beatN = t => Math.floor(bpOf(t));
const beatT = n => n < 0 ? BEATS[0] + n * BEAT : n < BEATS.length ? BEATS[n] : BEATS[BEATS.length - 1] + (n - BEATS.length + 1) * BEAT;
const pulse = (t, k = 6) => Math.exp(-frac(bpOf(t)) * k);          // 1 on the beat, decays
const pulse2 = (t, k = 6) => Math.exp(-frac(bpOf(t) * 2) * k);     // same on eighths
const bar = t => Math.floor(bpOf(t) / 4);

// ---------- shape builders (all return [[x, y], ...]) ----------
function ellPts(cx, cy, rx, ry, n = 28, j = 0, rot = 0) {
  const p = [], cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * cr - y * sr + jit(j), cy + x * sr + y * cr + jit(j)]); }
  return p;
}
function rectPts(x, y, w, h, j = 0) { return [[x + jit(j), y + jit(j)], [x + w + jit(j), y + jit(j)], [x + w + jit(j), y + h + jit(j)], [x + jit(j), y + h + jit(j)]]; }
function rrPts(x, y, w, h, r, j = 0) {
  r = Math.min(r, w / 2, h / 2); const p = [];
  const arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; p.push([cx + Math.cos(a) * r + jit(j), cy + Math.sin(a) * r + jit(j)]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  return p;
}
function starPts(cx, cy, r, inner = .42, n = 5, rot = -Math.PI / 2) {
  const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r * inner : r; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return p;
}
function heartPts(cx, cy, r, n = 36) {
  const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, s = Math.sin(a);
    p.push([cx + 16 * s * s * s * r / 17, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r / 17]); } return p;
}
function bubblePts(x, y, w, h, tail = 'left', j = 0) {   // chat bubble with a little tail at the bottom corner
  const p = rrPts(x, y, w, h, Math.min(h * .45, 40), j), tx = tail === 'left' ? x + 18 : x + w - 18;
  const i = p.findIndex(q => q[1] > y + h - 2 && (tail === 'left' ? q[0] < x + w / 2 : q[0] > x + w / 2));
  p.splice(Math.max(0, i), 0, [tx + (tail === 'left' ? -14 : 14), y + h + 18]);
  return p;
}
const translatePts = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

// ---------- painting ----------
// paint(pts, o): wash = flat colour, fill = watercolour, hatch = dry strokes, ink = outline (null = none).
function paint(pts, o = {}) {
  const wash = o.wash && (o.washOp ?? 255) > 0, fill = o.fill && (o.fillOp ?? 160) > 0;   // p5.brush treats opacity 0 as unset
  if (wash || fill || o.hatch) {
    wash ? brush.wash(o.wash, o.washOp ?? 255) : brush.noWash();
    if (fill) { brush.fill(o.fill, o.fillOp ?? 160); brush.fillBleed(o.bleed ?? .12); brush.fillTexture(o.tex ?? .4, o.border ?? .3); } else brush.noFill();
    if (o.hatch) { brush.hatch(o.hatch.d, o.hatch.a, o.hatch.o || { rand: .1 }); brush.hatchStyle(o.hatch.b || 'HB', o.hatch.c || PAL.ink, o.hatch.w || 1); } else brush.noHatch();
    brush.noStroke();
    if (o.curv) { brush.beginShape(o.curv); pts.forEach(q => brush.vertex(q[0], q[1])); brush.endShape(true); }
    else brush.polygon(pts);
  }
  if (o.ink !== null) {
    brush.noWash(); brush.noFill(); brush.noHatch();
    brush.set(o.br || 'ink', o.ink || PAL.ink, o.sw ?? 1);
    brush.beginShape(o.curv || 0); pts.forEach(q => brush.vertex(q[0], q[1])); brush.endShape(true);
  }
}
function brushLine(pts, sw = 1, col = PAL.ink, br = 'ink', curv = .5) {   // open line along a path
  brush.noWash(); brush.noFill(); brush.noHatch(); brush.set(br, col, sw); brush.spline(pts, curv);
}
function glow(cx, cy, rx, ry, col, op = 90, bleed = .3) { paint(ellPts(cx, cy, rx, ry, 30), { fill: col, fillOp: op, bleed, tex: .2, border: .1, ink: null }); }

// ---------- camera (one level; pair camBegin/camEnd) ----------
let CAM = null;
function camBegin(cx = W / 2, cy = H / 2, zoom = 1, rot = 0) { push(); translate(W / 2, H / 2); rotate(rot); scale(zoom); translate(-cx, -cy); CAM = { cx, cy, zoom, rot }; }
function camEnd() { if (CAM) pop(); CAM = null; }
function toScreen(x, y) {
  if (!CAM) return [x, y];
  const c = Math.cos(CAM.rot), s = Math.sin(CAM.rot), dx = (x - CAM.cx) * CAM.zoom, dy = (y - CAM.cy) * CAM.zoom;
  return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
}
const shakeXY = (t, amt) => { const f = Math.floor(t * 24); return [(hash(f * 3.1) - .5) * 2 * amt, (hash(f * 5.7 + 2) - .5) * 2 * amt]; };

// ---------- lettering (drawn on the 2D compositor so type stays crisp) ----------
let LETTERS = [];
const FONT_TITLE = '"Fredoka"', FONT_BODY = '"Nunito"';
// letter(txt, x, y, size, colour, { pop 0..1, rot, alpha, outline colour|false, weight, font, align, screen })
function letter(txt, x, y, size, color, o = {}) {
  if (CAM && !o.screen) { [x, y] = toScreen(x, y); size *= CAM.zoom; o = { ...o, rot: (o.rot || 0) + CAM.rot }; }
  LETTERS.push({ txt, x, y, size, color, ...o });
}
// Comic sound effect that pops in at age 0, wobbles, and fades by `life` seconds.
function sfx(txt, x, y, size, color, age, o = {}) {
  const life = o.life ?? 1.1; if (age < 0 || age > life) return;
  letter(txt, x, y, size, color, { pop: age * 5, rot: (o.rot ?? -.1) + Math.sin(age * 22) * .04 * (1 - age / life), alpha: 1 - seg(age, life - .25, life), ...o });
}
function drawLetters(c) {
  for (const L of LETTERS) {
    const k = L.pop == null ? 1 : backOut(L.pop); if (k <= .01) continue;
    c.save(); c.globalAlpha = clamp(L.alpha ?? 1); c.translate(L.x, L.y); c.rotate(L.rot || 0); c.scale(k, k);
    c.font = `${L.weight || 700} ${L.size}px ${L.font || FONT_TITLE}`; c.textAlign = L.align || 'center'; c.textBaseline = 'middle';
    if (L.outline !== false) {
      c.lineJoin = 'round'; c.strokeStyle = L.outline || PAL.rim; c.lineWidth = L.size * (L.ow ?? .16);
      c.fillStyle = L.outline || PAL.rim; c.fillText(L.txt, L.size * .05, L.size * .07);   // drop shadow
      c.strokeText(L.txt, 0, 0);
    }
    c.fillStyle = L.color; c.fillText(L.txt, 0, 0);
    c.restore();
  }
}

// ---------- full-frame effects ----------
function flash(k, col = PAL.cream) { if (k > .01) paint(rectPts(-80, -80, W + 160, H + 160), { wash: col, washOp: 255 * clamp(k), ink: null }); }
// Paint everything outside a star-shaped outline (iris, keyhole, bubble-shaped reveals).
function irisShape(pts, col = PAL.night, far = 4200) {
  const n = pts.length; let cx = 0, cy = 0; pts.forEach(q => { cx += q[0]; cy += q[1]; }); cx /= n; cy /= n;
  const out = q => { const dx = q[0] - cx, dy = q[1] - cy, d = Math.hypot(dx, dy) || 1; return [cx + dx / d * far, cy + dy / d * far]; };
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], ex = (b[0] - a[0]) * .08, ey = (b[1] - a[1]) * .08;
    paint([[a[0] - ex, a[1] - ey], [b[0] + ex, b[1] + ey], out(b), out(a)], { wash: col, ink: null });
  }
}
function iris(cx, cy, r, col = PAL.night) { if (r < 3) paint(rectPts(-80, -80, W + 160, H + 160), { wash: col, ink: null }); else irisShape(ellPts(cx, cy, r, r, 44), col); }

// ---------- paper, grain, compositing, render hooks ----------
let paperG, grainC, outC, outX, T = 0;
function makePaper() {
  const g = createGraphics(W, H); g.pixelDensity(1); g.background(PAL.paper); g.noStroke();
  randomSeed(3); noiseSeed(3);
  for (let i = 0; i < 2600; i++) { g.fill(120, 90, 60, random(3, 9)); g.ellipse(random(W), random(H), random(20, 180), random(10, 90)); }
  g.stroke(110, 80, 50, 12); for (let i = 0; i < 1400; i++) { const x = random(W), y = random(H), a = random(TAU), l = random(6, 30); g.line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l); }
  return g;
}
function makeGrain() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), d = x.createImageData(W, H);
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < d.data.length; i += 4) {
    const px = (i / 4) % W, py = Math.floor(i / 4 / W), vx = (px / W - .5), vy = (py / H - .5), vig = 1 - (vx * vx + vy * vy) * .55;
    const v = Math.round(255 * vig * (.93 + rnd() * .07)); d.data[i] = v; d.data[i + 1] = v; d.data[i + 2] = Math.round(v * .985); d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0); return c;
}
function defineBrushes() {
  brush.add('ink', { type: 'default', weight: 5, scatter: .2, sharpness: .85, grain: 36, opacity: 240, spacing: .2, pressure: [1.1, .85], rotate: 'natural', noise: .12 });
  brush.add('inkfine', { type: 'default', weight: 2.4, scatter: .12, sharpness: .9, grain: 36, opacity: 235, spacing: .2, pressure: [1.05, .85], rotate: 'natural', noise: .08 });
  brush.add('dry', { type: 'default', weight: 14, scatter: 2.6, sharpness: .3, grain: 6, opacity: 85, spacing: .6, pressure: [1, .6], rotate: 'natural', noise: .4 });
}
async function setup() {
  createCanvas(W, H, WEBGL); pixelDensity(1); noLoop();
  brush.scaleBrushes(5); defineBrushes();
  paperG = makePaper(); grainC = makeGrain();
  outC = document.getElementById('out'); outX = outC.getContext('2d');
  await Promise.all([document.fonts.load(`700 100px ${FONT_TITLE}`), document.fonts.load(`800 60px ${FONT_BODY}`)]);
  window.ready = true;
  if (!location.search.includes('render')) devUI();
}
function draw() {
  if (!window.ready) return;
  LETTERS = []; CAM = null;
  push(); translate(-W / 2, -H / 2);
  randomSeed(1000 + Math.floor(T * BOIL)); noiseSeed(77);
  image(paperG, 0, 0);
  drawWorld(T);
  pop();
}
function composite(t) {
  const c = outX;
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.drawImage(drawingContext.canvas, 0, 0, W, H);
  drawLetters(c);                                  // lettering always sits above the paint, under the grain
  c.globalCompositeOperation = 'multiply'; c.drawImage(grainC, 0, 0);
  c.globalCompositeOperation = 'source-over';
  drawKaraoke(c, t);
}
window.renderAt = async (t, type = 'image/png', q = .92) => { T = t; await redraw(); composite(t); return outC.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640) => {
  const h = Math.round(w * 9 / 16), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); T = times[i]; await redraw(); composite(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h; c.drawImage(outC, x, y, w, h);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x, y, 86, 24); c.fillStyle = '#fff'; c.font = '15px system-ui'; c.fillText(times[i].toFixed(2) + 's', x + 7, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => { const gl = drawingContext, e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; };

// Studio scrubber with audio, for humans: open studio.html in Chrome, drag or press space to play.
function devUI() {
  const s = document.getElementById('scrub'), lab = document.getElementById('tt'), au = new Audio(SONG.file);
  s.max = DUR;
  let want = 0, busy = false;
  const go = async () => { if (busy) return; busy = true; while (want != null) { const t = want; want = null; const t0 = performance.now(); await window.renderAt(t); lab.textContent = `${t.toFixed(2)}s · ${Math.round(performance.now() - t0)} ms/frame`; } busy = false; };
  s.oninput = () => { want = +s.value; au.currentTime = want; go(); };
  document.onkeydown = e => { if (e.code === 'Space') { e.preventDefault(); au.paused ? au.play() : au.pause(); } };
  const tick = () => { if (!au.paused) { s.value = au.currentTime; want = au.currentTime; go(); } requestAnimationFrame(tick); };
  tick(); want = 0; go();
}
