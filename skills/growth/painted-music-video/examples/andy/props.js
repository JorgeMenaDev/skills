// props.js: the recurring set (la Dueña's shop, a small salon-and-shop in Santiago) and shared props.
//
// shopBack(t, o): the whole back of the shop, painted edge to edge. Floor line at y 820.
//   o.night 0..1 (1 = 3 AM, dark blue; 0 = warm day), o.lamp 0..1 (the ceiling lamp's pool of light),
//   o.window: true (default) shows the big window with the city and the Andes behind, o.party 0..1 adds bunting.
//   Layout (x): window 560..1360 (sill y 560), wall clock at (240, 250), wall calendar at (1640, 300),
//   counter from x 1180 to 1800 (top y 640), salon chair + mirror at x ~380, door with a bell at x 1860.
// shopFront(t, o): foreground pieces that overlap characters (the counter front, plants). Paint last.
// cityWindow(x, y, w, h, t, night): the window view on its own (skyline + Andes + moon/sun).
// wallClock(x, y, r, hour, o), wallCalendar(x, y, s, o) (o.marks = [[col,row,colour],...], o.flip 0..1 page turn),
// counter(x, y, w), register(x, y, s, o) (o.ding 0..1 pops the drawer + a bell sparkle),
// moonSky(t, o): a full-frame night sky with moon and twinkling stars (used for outside shots).
// andyLogo(x, y, r, o): the flat Andy mark (face on a disc) for title cards and end cards.

const FLOOR_Y = 820;

function cityWindow(x, y, w, h, t, night = 1) {
  const sky = mixCol('#BFE3F7', PAL.night, night), sky2 = mixCol('#FCE3C4', PAL.dusk, night);
  paint(rectPts(x, y, w, h), { wash: sky, ink: null });
  paint(ellPts(x + w * .3, y + h * .3, w * .4, h * .25, 20), { fill: mixCol(sky, PAL.plum, .3), fillOp: 90, bleed: .3, tex: .7, border: .5, ink: null });
  paint(rectPts(x, y + h * .45, w, h * .55), { fill: sky2, fillOp: 140, bleed: .15, tex: .3, border: .2, ink: null });
  // moon or sun
  const mx = x + w * .78, my = y + h * .22;
  if (night > .5) { glow(mx, my, 90, 90, PAL.moon, 80 * night); paint(ellPts(mx, my, 42, 42, 26), { wash: PAL.moon, ink: null }); }
  else paint(ellPts(mx, my, 46, 46, 26), { wash: '#FFD36B', ink: null });
  for (let i = 0; i < 14; i++) if (night > .4) {
    const sx = x + hash(i) * w, sy = y + hash(i + 40) * h * .38, tw = .5 + .5 * Math.sin(t * 3 + i * 7);
    paint(starPts(sx, sy, 4 + 3 * tw, .4, 4), { wash: PAL.cream, washOp: 200 * night, ink: null });
  }
  // the Andes: snowy peaks behind the city
  const peaks = [[0, .62], [.12, .38], [.22, .55], [.34, .3], [.47, .5], [.58, .33], [.7, .52], [.83, .36], [.93, .5], [1, .45]];
  const mtn = [[x, y + h]].concat(peaks.map(([px, py]) => [x + px * w, y + py * h])).concat([[x + w, y + h]]);
  paint(mtn, { wash: mixCol('#9FB4D9', '#2B3170', night), ink: null });
  peaks.forEach(([px, py], i) => { if (i % 2 && i < peaks.length - 1) paint([[x + px * w - 38, y + (py + .08) * h], [x + px * w, y + py * h], [x + px * w + 38, y + (py + .08) * h], [x + px * w + 10, y + (py + .06) * h], [x + px * w - 12, y + (py + .09) * h]], { wash: mixCol('#FFFFFF', '#B6C2E6', night), ink: null }); });
  // city blocks with lit windows
  for (let i = 0; i < 11; i++) {
    const bw = w / 11, bx = x + i * bw, bh = h * (.18 + hash(i + 7) * .22);
    paint(rectPts(bx, y + h - bh, bw * .92, bh), { wash: mixCol('#7C86B8', '#1A1D46', night), ink: null });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) if (hash(i * 9 + r * 3 + c) > .45)
      paint(rectPts(bx + 8 + c * bw * .42, y + h - bh + 12 + r * 26, 10, 12), { wash: night > .5 ? '#FFD98A' : '#DDE8F7', washOp: 230, ink: null });
  }
}

function wallClock(x, y, r, hour = 3, o = {}) {
  const sw = clamp(r / 40, .6, 2);
  paint(ellPts(x, y, r, r, 30), { wash: o.face || PAL.cream, ink: PAL.ink, sw: sw * 1.3 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; paint(ellPts(x + Math.cos(a) * r * .78, y + Math.sin(a) * r * .78, r * .05, r * .05, 6), { wash: PAL.ink, ink: null }); }
  const ha = (hour / 12) * TAU - Math.PI / 2, ma = frac(hour) * TAU - Math.PI / 2;
  brushLine([[x, y], [x + Math.cos(ha) * r * .45, y + Math.sin(ha) * r * .45]], sw * 1.8, PAL.ink, 'ink', 0);
  brushLine([[x, y], [x + Math.cos(ma) * r * .7, y + Math.sin(ma) * r * .7]], sw * 1.2, PAL.ink, 'ink', 0);
  paint(ellPts(x, y, r * .07, r * .07, 8), { wash: PAL.coral, ink: null });
}

function wallCalendar(x, y, s = 1, o = {}) {
  const w = 220 * s, h = 230 * s, sw = clamp(s * 1.2, .6, 2);
  paint(rrPts(x - w / 2, y - h / 2, w, h, 14 * s), { wash: PAL.white, ink: PAL.ink, sw });
  paint(rrPts(x - w / 2, y - h / 2, w, 52 * s, 14 * s), { wash: PAL.coral, ink: PAL.ink, sw });
  [-1, 1].forEach(side => paint(ellPts(x + side * 55 * s, y - h / 2, 8 * s, 14 * s, 10), { wash: PAL.steel, ink: PAL.ink, sw: sw * .7 }));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const cx = x - w / 2 + 26 * s + c * 42 * s, cy = y - h / 2 + 82 * s + r * 38 * s;
    paint(rrPts(cx - 15 * s, cy - 13 * s, 30 * s, 26 * s, 5 * s), { wash: '#EEF1F8', ink: null });
    const m = (o.marks || []).find(q => q[0] === c && q[1] === r);
    if (m) { const k = backOut(clamp(m[3] ?? 1)); paint(ellPts(cx, cy, 13 * s * k, 11 * s * k, 14), { wash: m[2] || ANDY.sky, ink: PAL.ink, sw: sw * .6 }); }
  }
}

function counter(x0, x1, top = 640) {
  paint(rectPts(x0, top, x1 - x0, FLOOR_Y + 40 - top), { wash: PAL.wood, fill: PAL.woodDk, fillOp: 60, bleed: .05, tex: .7, border: .5, ink: PAL.ink, sw: 1.3 });
  paint(rectPts(x0 - 20, top - 22, x1 - x0 + 40, 30), { wash: mixCol(PAL.wood, PAL.cream, .35), ink: PAL.ink, sw: 1.3 });
  for (let i = 1; i < 4; i++) brushLine([[x0 + (x1 - x0) * i / 4, top + 20], [x0 + (x1 - x0) * i / 4, FLOOR_Y + 30]], .5, PAL.woodDk, 'inkfine', 0);
}

function register(x, y, s = 1, o = {}) {
  const ding = clamp(o.ding || 0), sw = clamp(s * 1.2, .6, 2), open = backOut(ding) * 26 * s;
  paint(rrPts(x - 80 * s, y - 20 * s + open, 160 * s, 36 * s, 6 * s), { wash: '#E9D9B8', ink: PAL.ink, sw });
  paint([[x - 90 * s, y - 20 * s], [x + 90 * s, y - 20 * s], [x + 70 * s, y - 110 * s], [x - 70 * s, y - 110 * s]], { wash: PAL.mint, ink: PAL.ink, sw });
  paint(rrPts(x - 50 * s, y - 150 * s, 100 * s, 44 * s, 8 * s), { wash: '#26243A', ink: PAL.ink, sw });
  if (ding > .01) {
    letter('$', x, y - 128 * s, 34 * s, PAL.wa, { outline: false, alpha: clamp(ding * 3) });
    [0, 1, 2, 3, 4].forEach(i => { const a = -Math.PI / 2 + (i - 2) * .45, r = (120 + ding * 60) * s; paint(starPts(x + Math.cos(a) * r, y - 120 * s + Math.sin(a) * r, 14 * s * (1 - ding * .6), .35, 4), { wash: PAL.beak, ink: PAL.ink, sw: sw * .6 }); });
  }
}

function salonChair(x, y, s = 1) {
  const sw = clamp(s * 1.2, .6, 2);
  paint(rectPts(x - 12 * s, y - 120 * s, 24 * s, 120 * s), { wash: PAL.steel, ink: PAL.ink, sw });
  paint(ellPts(x, y, 80 * s, 16 * s, 20), { wash: PAL.steel, ink: PAL.ink, sw });
  paint(rrPts(x - 90 * s, y - 175 * s, 180 * s, 60 * s, 24 * s), { wash: PAL.coral, ink: PAL.ink, sw });
  paint(rrPts(x - 80 * s, y - 330 * s, 160 * s, 170 * s, 40 * s), { wash: PAL.coral, ink: PAL.ink, sw });
}

function shopBack(t, o = {}) {
  const night = o.night ?? 1, lamp = o.lamp ?? 0;
  const wall = mixCol(PAL.wall, '#2A2E66', night * .85), wall2 = mixCol('#F2D9BC', '#232657', night * .85);
  paint(rectPts(-700, -500, W + 1400, FLOOR_Y + 500), { wash: wall, ink: null });
  for (let i = 0; i < 6; i++) paint(ellPts(hash(i + 3) * W, 120 + hash(i + 11) * 520, 260 + hash(i) * 220, 160 + hash(i + 5) * 120, 22), { fill: mixCol(wall, i % 2 ? PAL.peach : PAL.plum, .35), fillOp: 55, bleed: .3, tex: .8, border: .6, ink: null });
  paint(rectPts(-700, FLOOR_Y - 190, W + 1400, 190), { wash: wall2, fill: mixCol(wall2, PAL.ink, .2), fillOp: 40, bleed: .08, tex: .7, border: .5, ink: PAL.ink, sw: .8 });                      // wainscot
  for (let i = -8; i < 33; i++) brushLine([[i * 80, FLOOR_Y - 190], [i * 80, FLOOR_Y]], .45, mixCol(wall2, PAL.ink, .25), 'inkfine', 0);
  if (o.window !== false) {
    cityWindow(560, 150, 800, 410, t, night);
    paint(rectPts(560, 150, 800, 410), { ink: PAL.ink, sw: 2 });
    brushLine([[960, 150], [960, 560]], 1.6, PAL.ink, 'ink', 0); brushLine([[560, 355], [1360, 355]], 1.6, PAL.ink, 'ink', 0);
    paint(rectPts(540, 555, 840, 26), { wash: mixCol(PAL.wood, PAL.night, night * .5), ink: PAL.ink, sw: 1.2 });
    [620, 1300].forEach((px, i) => { paint(rrPts(px - 30, 500, 60, 56, 10), { wash: PAL.coral, ink: PAL.ink, sw: 1 }); [0, 1, 2].forEach(j => paint(ellPts(px - 20 + j * 20, 480 - j % 2 * 18, 18, 30, 12, 0, .4 * (j - 1)), { wash: PAL.leaf, ink: PAL.ink, sw: .8 })); });
  }
  wallClock(240, 250, 70, o.hour ?? 3);
  if (o.calendar !== false) wallCalendar(1640, 300, .9, { marks: o.marks });
  // floor
  paint(rectPts(-700, FLOOR_Y, W + 1400, H - FLOOR_Y + 500), { wash: mixCol('#E4B98E', '#3A3470', night * .8), fill: mixCol(PAL.woodDk, PAL.night, night * .6), fillOp: 50, bleed: .05, tex: .6, border: .4, ink: PAL.ink, sw: 1.2 });
  for (let i = -8; i <= 8; i++) brushLine([[960 + i * 130, FLOOR_Y + 2], [960 + i * 220, H + 40]], .45, mixCol(PAL.woodDk, PAL.night, night * .6), 'inkfine', 0);
  if (o.chair !== false) salonChair(380, FLOOR_Y + 10, 1);
  if (o.party) for (let i = 0; i < 12; i++) {
    const px = 60 + i * 160, py = 70 + Math.sin(i * .9) * 10, k = seg(o.party, i / 16, i / 16 + .3);
    if (k > 0) paint([[px, py], [px + 120, py], [px + 60, py + 90 * backOut(k)]], { wash: [PAL.coral, PAL.beak, PAL.mint, ANDY.sky][i % 4], ink: PAL.ink, sw: 1 });
  }
  // the ceiling lamp and its pool of warm light
  brushLine([[960, -20], [960, 70]], 1.2, PAL.ink, 'ink', 0);
  paint([[900, 70], [1020, 70], [1060, 120], [860, 120]], { wash: PAL.beak, ink: PAL.ink, sw: 1.2 });
  if (lamp > .01) {
    paint([[900, 120], [1020, 120], [1320, FLOOR_Y + 40], [600, FLOOR_Y + 40]], { fill: '#FFE3A0', fillOp: 38 * lamp, bleed: .25, tex: .15, border: .05, ink: null });
    glow(960, FLOOR_Y + 40, 420, 70, '#FFE3A0', 90 * lamp, .25);
    glow(960, 110, 120, 50, '#FFF1C4', 140 * lamp, .3);
  }
}

function shopFront(t, o = {}) {
  if (o.counter !== false) counter(1180, 1800, 640);
  if (o.plant !== false) { paint(rrPts(60, FLOOR_Y - 90, 120, 130, 18), { wash: PAL.coral, ink: PAL.ink, sw: 1.2 }); [0, 1, 2, 3].forEach(j => paint(ellPts(90 + j * 22, FLOOR_Y - 130 - (j % 2) * 30, 26, 60, 14, 0, .35 * (j - 1.5)), { wash: PAL.leaf, ink: PAL.ink, sw: 1 })); }
}

function moonSky(t, o = {}) {
  paint(rectPts(-80, -80, W + 160, H + 160), { wash: PAL.night, ink: null });
  paint(ellPts(960, H + 200, 1500, 700, 30), { fill: PAL.dusk, fillOp: 160, bleed: .2, tex: .4, ink: null });
  for (let i = 0; i < 60; i++) {
    const sx = hash(i * 3) * W, sy = hash(i * 7 + 1) * H * .8, tw = .5 + .5 * Math.sin(t * 2.5 + i * 5);
    paint(starPts(sx, sy, 3 + 5 * tw * hash(i), .4, 4), { wash: PAL.cream, washOp: 230, ink: null });
  }
  const mx = o.moonX ?? 1500, my = o.moonY ?? 220;
  glow(mx, my, 220, 220, PAL.moon, 60); paint(ellPts(mx, my, 100, 100, 32), { wash: PAL.moon, ink: null });
  paint(ellPts(mx - 30, my - 20, 16, 14, 12), { wash: mixCol(PAL.moon, '#E6C77A', .5), ink: null });
  paint(ellPts(mx + 26, my + 30, 22, 18, 12), { wash: mixCol(PAL.moon, '#E6C77A', .5), ink: null });
}

function andyLogo(x, y, r, o = {}) {        // the mark: face on a disc, thick black rim
  const u = r / 4;
  push(); translate(x, y); if (o.rot) rotate(o.rot); scale(o.k ?? 1);
  paint(ellPts(0, 0, r * 1.08, r * 1.08, 44), { wash: ANDY.rim, ink: null });
  _gradDisc(0, 0, r, r, clamp(u / 10, .6, 3), 0, 0);
  [-2.1, 2.1].forEach(ex => { paint(ellPts(ex * u, -.9 * u, .9 * u, 1.05 * u, 22, 0), { wash: ANDY.rim, ink: null }); paint(ellPts((ex + .28) * u, -1.3 * u, .24 * u, .28 * u, 12, 0), { wash: ANDY.hi, ink: null }); });
  paint([[-.95 * u, -.2 * u], [-.5 * u, -.5 * u], [.5 * u, -.5 * u], [.95 * u, -.2 * u], [.2 * u, 1.3 * u], [-.2 * u, 1.3 * u]], { wash: ANDY.beak, ink: ANDY.rim, sw: clamp(u / 9, .6, 3), curv: .5 });
  pop();
}
