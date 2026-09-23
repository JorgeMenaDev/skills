// c2_arrival: C2 · The blue bird (21.4–28.5). One continuous scene in the flooded shop at night, two shots:
//   arrive (21.4): out of C1's flash, the window swings open, Andy flies in across the moon (silhouette → colour,
//                  blue trail) and lands on the counter with a squash on the beat; the whole flood freezes and stares.
//   whirl  (24.43): Andy bounds from critter to critter tapping each with a wing on the eighths; each flips to a
//                  double check, cheers and hops out of the window. A dive + spin clears the rest; on "actitud"
//                  Andy strikes wings-up with sparkles; la Dueña's jaw drops, then heart eyes.
(() => {
  const OX = 990, OS = 20, AU = 20;                       // la Dueña's spot and scale, Andy's unit in the whirl
  const L4 = LYRICS[4], L5 = LYRICS[5];
  const T_OPEN = beatT(beatN(21.9) + 1);                  // 22.036 window bursts open
  const T_LAND = beatT(beatN(23.1) + 1);                  // 23.243 Andy lands on the counter
  const B0 = beatN(24.5);                                 // 24.427
  const eighth = n => { const b = Math.floor(n / 2), f = n / 2 - b; return lerp(beatT(B0 + b), beatT(B0 + b + 1), f); };
  const TAPS = [eighth(1), eighth(2), eighth(3), eighth(4), eighth(5), eighth(6), eighth(6.5), eighth(7)];
  const T_DIVE = eighth(8);                               // 26.842 dive + shockwave clears the rest
  const T_ACT = L5.words[6];                              // 27.06 "actitud": wings up
  const T_HEART = beatT(B0 + 5);                          // 27.423 heart eyes
  const T_OUT = 22.95;                                    // Andy passes the window plane
  const DIVE = [1290, 872];
  const MOON = [1090, 262, 88];
  const WIN = { x: 560, y: 150, w: 800, h: 410 };

  // ---------- the flood ----------
  const GLYPHS = ['dots', 'q', '$', 'clock', 'cal', 'heart', 'dots', 'q'];
  const CR = [];
  const add = (x, y, s, zone, j = 1) => {
    const i = CR.length;
    CR.push({ i, x: x + (hash(i * 3.3) - .5) * 34 * j, y: y + (hash(i * 7.1) - .5) * 16 * j, s, zone,
      kind: ['wa', 'ig', 'web'][Math.floor(hash(i * 5.7 + 1) * 3)], glyph: GLYPHS[Math.floor(hash(i * 2.9 + 4) * GLYPHS.length)],
      ph: hash(i * 1.7 + 9), tail: hash(i * 4.4) > .5 ? 'left' : 'right' });
    return CR[i];
  };
  add(345, 624, 16, 'chair', 0); const chairTap = add(438, 626, 16, 'chair', 0);
  const cntL = add(1250, 575, 17, 'counter', 0), cntR = add(1640, 575, 17, 'counter', 0);
  const headL = add(930, 492, 13, 'head', 0), headR = add(1052, 490, 13, 'head', 0), headT = add(992, 440, 13, 'head', 0);
  for (let i = 0; i < 13; i++) add(470 + i * 100, 735, 17, 'A');
  for (let i = 0; i < 13; i++) add(415 + i * 115, 805, 19, 'B');
  [300, 575, 830, 1085, 1560, 1795].forEach(x => add(x, 890, 21, 'C'));
  const nearest = (zone, x) => CR.filter(c => c.zone === zone).reduce((a, b) => Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a);
  const rowA = nearest('A', 1070), rowB = nearest('B', 645);
  // wing-tip offset from Andy's feet for a raise a (from andy.js wing geometry), in units
  const tip = a => { const th = -(.22 + a); return [2.55 + .3 * Math.cos(th) - 3.6 * Math.sin(th), -5.1 + .3 * Math.sin(th) + 3.6 * Math.cos(th)]; };
  // tap plan: [critter, time, dir (+1 = target on Andy's right), wing raise]
  const PLAN = [[cntR, 1, .55], [cntL, -1, .55], [rowA, -1, .55], [rowB, -1, .55], [chairTap, -1, .55], [headL, 1, .55], [headT, 1, 1.2], [headR, -1, .55]]
    .map(([c, dir, a], k) => { const [tx, ty] = tip(a); c.tf = TAPS[k]; c.tapped = true;
      return { c, t: TAPS[k], dir, a, x: c.x - dir * (2.4 * c.s + tx * AU), y: c.y - ty * AU }; });
  CR.forEach(c => { if (c.tf == null) c.tf = T_DIVE + .05 + Math.hypot(c.x - DIVE[0], c.y - DIVE[1]) * .00032 + hash(c.i * 8.3) * .1; });
  const PILE = ['chair', 'counter', 'A', 'B', 'C'];

  // ---------- Andy's path ----------
  const cr = (p0, p1, p2, p3, k) => { const k2 = k * k, k3 = k2 * k; return .5 * (2 * p1 + (-p0 + p2) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k2 + (-p0 + 3 * p1 - 3 * p2 + p3) * k3); };
  const FLY = [[21.95, 700, 420, 1.2], [22.2, 820, 360, 2.2], [22.55, 985, 300, 4.8], [22.85, 1095, 336, 9.5], [23.02, 1215, 450, 14], [23.14, 1355, 548, 18.5], [T_LAND, 1432, 622, 20], [T_LAND + .2, 1432, 622, 20]];
  function flyAt(t) {
    let i = 0; while (i < FLY.length - 2 && t >= FLY[i + 1][0]) i++;
    const k = clamp((t - FLY[i][0]) / (FLY[i + 1][0] - FLY[i][0])), g = j => FLY[clamp(j, 0, FLY.length - 1)];
    return [1, 2, 3].map(q => cr(g(i - 1)[q], g(i)[q], g(i + 1)[q], g(i + 2)[q], k));
  }
  const PERCH = [1432, 622];
  const WAY = [{ t: 24.5, x: PERCH[0], y: PERCH[1] }, ...PLAN, { t: T_DIVE, x: DIVE[0], y: DIVE[1], dir: -1, a: .3 }];
  // position + pose of Andy during the whirl (t >= 24.43)
  function whirlAt(t) {
    let i = 0; while (i < WAY.length - 2 && t >= WAY[i + 1].t + .05) i++;
    const A = WAY[i], B = WAY[i + 1], leave = A.t + (i ? .05 : 0), arrive = B.t - .035;
    const hold = P => ({ x: P.x, y: P.y, flip: P.dir < 0, hop: 0, dx: 0, a: P.a ?? .55, at: P });
    if (t < leave) return hold(A);
    if (t >= arrive) return hold(B);
    const k = (t - leave) / (arrive - leave), e = ease(k), d = Math.hypot(B.x - A.x, B.y - A.y);
    return { x: lerp(A.x, B.x, e), y: lerp(A.y, B.y, e) - Math.sin(Math.PI * k) * (50 + d * .35), flip: Math.abs(B.x - A.x) > 2 ? B.x < A.x : B.dir < 0,
      hop: Math.sin(Math.PI * k), dx: Math.sign(B.x - A.x) * Math.min(1, d / 200), a: B.a };
  }
  // Andy's world position (feet) and unit at any time, for cameras, trails and critter gazes
  function andyPos(t) {
    if (t < T_LAND) { const [x, y, u] = flyAt(t); return [x, y, u]; }
    if (t < 24.5) return [PERCH[0], PERCH[1], AU];
    const w = whirlAt(t); return [w.x, w.y, AU];
  }

  // ---------- private painters ----------
  function skyView(t) {
    const { x, y, w, h } = WIN;
    paint(rectPts(x, y, w, h), { wash: '#1E2562', ink: null });
    paint(rectPts(x, y + h * .42, w, h * .58), { fill: '#3B3A86', fillOp: 150, bleed: .18, tex: .5, border: .3, ink: null });
    paint(ellPts(x + w * .25, y + h * .25, w * .3, h * .2, 20), { fill: PAL.plum, fillOp: 70, bleed: .3, tex: .7, border: .5, ink: null });
    for (let i = 0; i < 18; i++) {
      const sx = x + 20 + hash(i * 1.3) * (w - 40), sy = y + 14 + hash(i * 2.7 + 40) * h * .42, tw = .5 + .5 * Math.sin(t * 4 + i * 7);
      if (Math.hypot(sx - MOON[0], sy - MOON[1]) > MOON[2] + 20) paint(starPts(sx, sy, 3 + 4 * tw, .38, 4), { wash: PAL.cream, washOp: 220, ink: null });
    }
    const [mx, my, mr] = MOON, mk = 1 + .06 * seg(t, T_OPEN, T_OPEN + .4);
    glow(mx, my, mr * 2.1 * mk, mr * 2.1 * mk, PAL.moon, 70);
    paint(ellPts(mx, my, mr, mr, 36), { wash: PAL.moon, ink: null });
    paint(ellPts(mx + mr * .18, my + mr * .15, mr * .82, mr * .82, 30), { wash: mixCol(PAL.moon, '#F3D27E', .35), washOp: 140, ink: null });
    [[-.35, -.25, .16], [.3, .35, .2], [.4, -.35, .1], [-.2, .45, .09]].forEach(([dx, dy, r]) => paint(ellPts(mx + dx * mr, my + dy * mr, r * mr, r * mr * .85, 12), { wash: '#EBCB7C', washOp: 170, ink: null }));
    const peaks = [[0, .66], [.1, .45], [.2, .58], [.31, .4], [.44, .56], [.56, .43], [.68, .6], [.8, .47], [.92, .58], [1, .5]];
    paint([[x, y + h]].concat(peaks.map(([px, py]) => [x + px * w, y + py * h])).concat([[x + w, y + h]]), { wash: '#2E3478', ink: null });
    peaks.forEach(([px, py], i) => { if (i % 2 && i < 9) paint([[x + px * w - 34, y + (py + .07) * h], [x + px * w, y + py * h], [x + px * w + 34, y + (py + .07) * h], [x + px * w + 8, y + (py + .055) * h], [x + px * w - 10, y + (py + .08) * h]], { wash: '#B8C3EA', ink: null }); });
    for (let i = 0; i < 10; i++) {
      const bw = w / 10, bx = x + i * bw, bh = h * (.16 + hash(i + 7) * .2);
      paint(rectPts(bx, y + h - bh, bw * .9, bh + 2), { wash: '#171A44', ink: null });
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) if (hash(i * 9 + r * 3 + c) > .4)
        paint(rectPts(bx + 12 + c * bw * .42, y + h - bh + 14 + r * 28, 11, 13), { wash: '#FFD98A', washOp: 220, ink: null });
    }
  }
  function pane(hx, side, open, t) {           // casement hinged at x = hx, swinging into the room
    const th = open * 1.12, top = WIN.y, bot = WIN.y + WIN.h, ext = WIN.h * .2 * Math.sin(th);
    const fx = hx + side * (400 * Math.cos(th) - 125 * Math.sin(th)), wob = open > .02 ? Math.sin(t * 9) * .03 * (1 - seg(t, T_OPEN + .3, T_OPEN + 1.4)) : 0;
    const fx2 = fx + side * wob * 200, q = [[hx, top], [fx2, top - ext], [fx2, bot + ext], [hx, bot]];
    const frame = mixCol(PAL.wood, PAL.night, .45);
    const ins = (p, k) => [lerp(p[0], (hx + fx2) / 2, k), lerp(p[1], WIN.y + WIN.h / 2, k * .12)];
    const glass = q.map(p => ins(p, .1));
    paint(glass, { wash: open > .02 ? '#5566B4' : '#9FB6EE', washOp: open > .02 ? 215 : 45, ink: null });
    for (let i = 0; i < 4; i++) paint([q[i], q[(i + 1) % 4], glass[(i + 1) % 4], glass[i]], { wash: frame, ink: null });
    paint(q, { ink: PAL.ink, sw: 1.8 }); paint(glass, { ink: PAL.ink, sw: .9 });
    const my = WIN.y + WIN.h / 2;
    paint([ins([hx, my - 7], .1), ins([fx2, my - 7], .1), ins([fx2, my + 7], .1), ins([hx, my + 7], .1)], { wash: frame, ink: PAL.ink, sw: .9 });
    if (open > .02) brushLine([ins([hx, top + 40], .3), ins([fx2, top - ext + 90], .3)], 1.2, '#C9D8FF', 'inkfine', 0);
  }
  function windowSet(t, outside) {
    skyView(t);
    outside();
    const { x, y, w, h } = WIN;
    paint(rectPts(x, y, w, h), { ink: PAL.ink, sw: 2.2 });
    const open = t < T_OPEN ? 0 : backOut(seg(t, T_OPEN, T_OPEN + .32), 1.2);
    paint(rectPts(540, 555, 840, 26), { wash: mixCol(PAL.wood, PAL.night, .5), ink: PAL.ink, sw: 1.2 });
    [620, 1300].forEach(px => { paint(rrPts(px - 30, 500, 60, 56, 10), { wash: PAL.coral, ink: PAL.ink, sw: 1 });
      [0, 1, 2].forEach(j => paint(ellPts(px - 20 + j * 20, 480 - j % 2 * 18, 18, 30, 12, 0, .4 * (j - 1) + (open > 0 ? Math.sin(t * 7 + j) * .15 * (1 - seg(t, 22.4, 23.5)) : 0)), { wash: PAL.leaf, ink: PAL.ink, sw: .8 })); });
    pane(x, 1, open, t); pane(x + w, -1, open, t);
    return open;
  }

  // chat-bubble critter with its own eyes (gaze, wide, happy) and painted glyphs (no lettering, so depth sorts)
  function critter(x, y, s, kind, o = {}) {
    const [bg, edge] = BUBBLE[kind], w = 5.2 * s, h = 3.3 * s, sw = clamp(s / 11, .5, 2), sq = o.sq || 0;
    push(); translate(x, y); rotate(o.rot || 0); scale((o.fx ?? 1) * (o.k ?? 1) * (1 + sq * .5), (o.k ?? 1) * (1 - sq));
    [-1, 1].forEach((side, i) => { const lift = o.walk != null ? Math.max(0, Math.sin((o.walk + i * .5) * TAU)) * .5 : 0;
      paint(ellPts(side * 1.1 * s, h / 2 + .7 * s - lift * s, .6 * s, .35 * s, 10), { wash: edge, ink: PAL.ink, sw }); });
    paint(bubblePts(-w / 2, -h / 2, w, h, o.tail || 'left', s * .05), { wash: bg, ink: edge, sw: sw * 1.3 });
    if (kind === 'ig') paint(rrPts(-w / 2 + .3 * s, -h / 2 + .3 * s, w - .6 * s, .45 * s, .2 * s), { wash: mixCol(PAL.ig1, PAL.ig2, .5), washOp: 180, ink: null });
    const g = o.glyph || 'dots', gx = -.7 * s, gy = .3 * s;
    switch (g) {
      case 'check': brushLine([[gx - 1.1 * s, gy], [gx - .5 * s, gy + .6 * s], [gx + .3 * s, gy - .5 * s]], sw * 1.7, '#3A8FE8', 'ink', 0);
        brushLine([[gx - .2 * s, gy + .6 * s], [gx + 1 * s, gy - .55 * s]], sw * 1.7, '#3A8FE8', 'ink', 0); break;
      case 'q': brushLine([[gx - .5 * s, gy - .55 * s], [gx - .25 * s, gy - .95 * s], [gx + .3 * s, gy - .9 * s], [gx + .45 * s, gy - .45 * s], [gx, gy - .05 * s], [gx, gy + .25 * s]], sw * 1.6, edge, 'ink', .6);
        paint(ellPts(gx, gy + .7 * s, .2 * s, .2 * s, 8), { wash: edge, ink: null }); break;
      case '$': brushLine([[gx + .5 * s, gy - .55 * s], [gx, gy - .75 * s], [gx - .5 * s, gy - .45 * s], [gx, gy - .02 * s], [gx + .5 * s, gy + .4 * s], [gx, gy + .72 * s], [gx - .55 * s, gy + .5 * s]], sw * 1.5, edge, 'ink', .6);
        brushLine([[gx, gy - 1 * s], [gx, gy + 1 * s]], sw * 1.1, edge, 'ink', 0); break;
      case 'heart': paint(heartPts(gx, gy + .05 * s, .85 * s), { wash: PAL.coral, ink: null }); break;
      case 'clock': paint(ellPts(gx, gy, .85 * s, .85 * s, 16), { wash: PAL.white, ink: edge, sw }); brushLine([[gx, gy], [gx, gy - .55 * s]], sw, edge, 'ink', 0); brushLine([[gx, gy], [gx + .4 * s, gy + .2 * s]], sw, edge, 'ink', 0); break;
      case 'cal': paint(rrPts(gx - .8 * s, gy - .75 * s, 1.6 * s, 1.5 * s, .2 * s), { wash: PAL.white, ink: edge, sw }); paint(rectPts(gx - .8 * s, gy - .75 * s, 1.6 * s, .45 * s), { wash: PAL.coral, ink: null }); break;
      default: [-1, 0, 1].forEach(i => paint(ellPts(gx + i * .8 * s, gy, .28 * s, .28 * s, 8), { wash: edge, ink: null }));
    }
    const ex = w / 2 - 1.35 * s, ey = -h / 2 + 1 * s, lx = (o.lx || 0), ly = (o.ly || 0), eyes = o.eyes || 'dot';
    [-1, 1].forEach(side => {
      const cx = ex + side * .55 * s;
      if (eyes === 'happy') brushLine([[cx - .3 * s, ey + .12 * s], [cx, ey - .2 * s], [cx + .3 * s, ey + .12 * s]], sw * 1.1, PAL.ink, 'ink', .6);
      else if (eyes === 'wide') { paint(ellPts(cx, ey, .4 * s, .46 * s, 12), { wash: PAL.white, ink: PAL.ink, sw: sw * .7 });
        paint(ellPts(cx + lx * .17 * s, ey + ly * .2 * s, .19 * s, .22 * s, 8), { wash: PAL.ink, ink: null }); }
      else paint(ellPts(cx + lx * .14 * s, ey + ly * .1 * s, .27 * s, .33 * s, 10), { wash: PAL.ink, ink: null });
    });
    pop();
  }

  // state of one critter at time t: where it is, which layer, its face
  function crState(c, t) {
    const [ax, ay, au] = andyPos(t), gx = ax - c.x, gy = (ay - 7 * au) - c.y, gd = Math.hypot(gx, gy) || 1;
    let x = c.x, y = c.y, rot = 0, sq = 0, fx = 1, k = 1, eyes = 'dot', lx = 0, ly = 0, walk = null, glyph = c.glyph, layer = 'pile';
    const clamorAt = tt => {
      const bp = bpOf(tt) + c.ph * 2;
      const gust = seg(tt, T_OPEN, T_OPEN + .1) * (1 - seg(tt, T_OPEN + .3, T_OPEN + 1.1));
      return { dy: -Math.abs(Math.sin(bp * Math.PI)) * .45 * c.s, rot: Math.sin((tt * 1.9 + c.ph) * TAU) * .09 + gust * Math.sign(c.x - 960 || 1) * .28,
        sq: Math.exp(-frac(bp) * 7) * .12, walk: tt * 3 + c.ph };
    };
    const ownerLook = () => { const dx = OX - c.x, dy = 520 - c.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
    const a = t - c.tf;
    if (t < T_LAND) {
      const q = clamorAt(t); y += q.dy; rot = q.rot; sq = q.sq; walk = q.walk; [lx, ly] = ownerLook();
      if (c.zone === 'head') { y -= q.dy * .6; }
    } else if (a < 0) {
      const q = clamorAt(T_LAND), f = t - T_LAND, delay = Math.min(.35, Math.hypot(c.x - PERCH[0], c.y - PERCH[1]) * .00035);
      const drop = 1 - ease(seg(f, .45 + c.ph * .2, .62 + c.ph * .2));
      y += q.dy * drop - Math.sin(Math.PI * seg(f, 0, .16)) * .35 * c.s; rot = q.rot * drop; walk = q.walk;
      const turn = ease(seg(f, .1 + delay, .3 + delay));
      eyes = 'wide'; const [ox, oy] = ownerLook(); lx = lerp(ox, gx / gd, turn); ly = lerp(oy, gy / gd, turn);
      rot += turn * clamp(gx / 400, -1, 1) * .12;
      if (f < .25) sq = -.12 * Math.sin(Math.PI * f / .25);
      if (t > 24.5) { const bob = Math.sin((t * 6 + c.ph * 3) * TAU) * .04 * seg(t, 24.5, 25); rot += bob; }
    } else if (a < .16) {
      const k0 = a / .16; fx = Math.abs(Math.cos(Math.PI * k0)); k = 1 + .3 * Math.sin(Math.PI * k0); glyph = k0 > .5 ? 'check' : c.glyph; eyes = k0 > .5 ? 'happy' : 'wide';
      lx = gx / gd; ly = gy / gd;
    } else if (a < .55) {
      const k0 = (a - .16) / .39, hp = Math.abs(Math.sin(k0 * TAU));
      y -= hp * .9 * c.s; sq = (1 - hp) * .15 - hp * .08; glyph = 'check'; eyes = 'happy'; walk = t * 6; rot = Math.sin(k0 * TAU) * .12;
    } else if (a < 1.4) {
      const p = (a - .55) / .85, xw = lerp(660, 1260, hash(c.i * 3.7 + 2)), yw = 300 + hash(c.i * 6.1) * 140, Hh = 140 + hash(c.i * 2.2) * 160;
      x = lerp(c.x, xw, p); y = lerp(c.y, yw, p) - Math.sin(Math.PI * p) * Hh; k = lerp(1, .6, p); glyph = 'check'; eyes = 'happy'; walk = t * 8;
      rot = Math.sin(p * Math.PI) * .25 * Math.sign(xw - c.x); layer = p < .3 ? 'fly' : 'flyBack';
    } else if (a < 2.1) {
      const p = (a - 1.4) / .7, xw = lerp(660, 1260, hash(c.i * 3.7 + 2)), yw = 300 + hash(c.i * 6.1) * 140;
      x = lerp(xw, lerp(xw, MOON[0], .35), p); y = lerp(yw, yw - 80 - hash(c.i) * 50, p) - Math.abs(Math.sin(p * 2 * Math.PI)) * 40;
      k = lerp(.6, .12, p); glyph = 'check'; eyes = 'happy'; walk = t * 8; layer = 'out';
    } else layer = 'gone';
    return { x, y, rot, sq, fx, k, eyes, lx, ly, walk, glyph, layer, a };
  }
  const drawCr = (c, st) => critter(st.x, st.y, c.s, c.kind, { rot: st.rot, sq: st.sq, fx: st.fx, k: st.k, eyes: st.eyes, lx: st.lx, ly: st.ly, walk: st.walk, glyph: st.glyph, tail: c.tail });

  function singMouth(t) {
    for (const L of [L4, L5]) for (let j = 0; j < L.words.length; j++) {
      const a = L.words[j], b = Math.min(L.words[j + 1] ?? L.end, a + .42);
      if (b > a && t >= a && t < b) return seg(t, a, b) < .78 ? ['o', 'O', 'grin'][j % 3] : 'smile';
    }
    return null;
  }

  function trail(t, t0, fn) {                  // a blue sparkle ribbon behind Andy
    for (let k = 14; k >= 1; k--) {
      const tt = t - k * .028; if (tt < t0) continue;
      const [px, py, pu0] = fn(tt), pu = Math.max(pu0, 5), f = 1 - k / 15;
      paint(ellPts(px + jit(1), py - 6.5 * pu0, pu * 2.6 * f, pu * 2.2 * f, 12), { wash: mixCol(ANDY.sky, PAL.cream, .25), washOp: 150 * f, ink: null });
      if (k % 4 === 1) paint(starPts(px + (hash(k + Math.floor(tt * 12)) - .5) * pu * 6, py - 6.5 * pu0 + (hash(k * 3 + Math.floor(tt * 12)) - .5) * pu * 6, pu * 1.3 * f, .35, 4), { wash: PAL.cream, ink: null });
    }
  }
  function speedLines(t, w) {
    if (!w.hop) return;
    const [x0, y0] = andyPos(t - .09), [x1, y1] = andyPos(t);
    for (let i = -1; i <= 1; i++) brushLine([[x0, y0 - (7 + i * 3) * AU], [lerp(x0, x1, .6), lerp(y0, y1, .6) - (7 + i * 3) * AU]], 1.1, '#CFE9FF', 'inkfine', .5);
  }
  function tapBurst(c, t) {
    const a = t - c.tf; if (a < 0 || a > .28) return;
    const k = a / .28, r = c.s * (3 + k * 3);
    if (c.tapped) for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + c.ph;
      brushLine([[c.x + Math.cos(an) * r * .7, c.y + Math.sin(an) * r * .7], [c.x + Math.cos(an) * r, c.y + Math.sin(an) * r]], 1.3 * (1 - k) + .3, PAL.beak, 'ink', 0); }
    brushLine(ellPts(c.x, c.y, c.s * (2 + k * 3.5), c.s * (1.5 + k * 2.6), 20), 1.8 * (1 - k) + .2, '#DDF2FF', 'ink', .6);
    if (c.tapped) paint(starPts(c.x - 2.4 * c.s * Math.sign(c.x - andyPos(c.tf)[0]), c.y, c.s * 1.6 * (1 - k), .35, 4), { wash: PAL.cream, ink: PAL.ink, sw: .7 });
  }
  function moonSpill(open) {
    if (open < .02) return;
    paint([[620, 560], [1330, 560], [1620, 1080], [380, 1080]], { fill: '#AFC8FF', fillOp: 30 * open, bleed: .2, tex: .2, border: .1, ink: null });
  }

  // ---------- the scene ----------
  function scene(t, cam) {             // p5.brush drops paint outside world 0..W x 0..H, so keep the view inside it
    const [cx0, cy0, z, r] = cam, mx = 960 / z + 1200 * Math.abs(r), my = 540 / z + 1200 * Math.abs(r);
    camBegin(clamp(cx0, mx, W - mx), clamp(cy0, my, H - my), z, r);
    const ap = andyPos(t);
    const states = CR.map(c => [c, crState(c, t)]);
    shopBack(t, { night: 1, lamp: 1, window: false });
    // Andy far away, and answered critters hopping off over the rooftops
    const inFly = t >= 21.95 && t < T_LAND;
    const open = windowSet(t, () => {
      states.forEach(([c, st]) => { if (st.layer === 'out') drawCr(c, st); });
      if (inFly && t < T_OUT) drawFlyingAndy(t);
    });
    moonSpill(open);
    states.forEach(([c, st]) => { if (st.layer === 'flyBack') drawCr(c, st); });
    states.forEach(([c, st]) => { if (c.zone === 'chair' && st.layer === 'pile') drawCr(c, st); });
    drawOwner(t, open);
    states.forEach(([c, st]) => { if (c.zone === 'head' && st.layer === 'pile') drawCr(c, st); });
    shopFront(t, {});
    PILE.slice(1).forEach(z => states.forEach(([c, st]) => { if (c.zone === z && st.layer === 'pile') drawCr(c, st); }));
    states.forEach(([c, st]) => { if (st.layer === 'fly') drawCr(c, st); });
    if (inFly && t >= T_OUT) drawFlyingAndy(t);
    if (t >= T_LAND) drawAndy(t);
    CR.forEach(c => { if (c.tapped || t - c.tf < .2) tapBurst(c, t); });
    fxLate(t);
    const f = t - T_LAND;
    if (f > .05 && f < 1.1) [cntL, cntR, rowA, nearest('A', 1560), nearest('B', 1300)].forEach((c, i) => {
      const st = crState(c, t); if (st.layer === 'pile') emote('!', st.x + c.s * 1.2, st.y - c.s * 3.4, c.s * 1.25, seg(f, .05 + i * .06, .25 + i * .06) * (1 - seg(f, .85, 1.1)));
    });
    camEnd();
  }

  function drawFlyingAndy(t) {
    const [x, y, u] = flyAt(t), dim = 1 - ease(seg(t, 22.9, 23.12)), glowK = lerp(.45, 1.1, seg(t, 22.85, 23.12));
    trail(t, 21.95, tt => flyAt(tt));
    const v = flyAt(t + .02), lean = clamp((v[0] - x) / 40, -1, 1) * .18 + clamp((v[1] - y) / 40, -1, 1) * .12;
    if (t < 23.08) andy(x, y, u, { fly: t * 4.6, dim, glowK, rot: lean, shadow: false });
    else {                                     // legs down, wings flaring for the landing
      const ph = Math.sin(t * 4.6 * TAU) * (1 - seg(t, 23.08, 23.2)), wa = lerp(1.5, 1.95, seg(t, 23.08, 23.2)) + ph * 1.05;
      andy(x, y, u, { aL: wa, aR: wa, dim, glowK, rot: lean * .6, sq: -.1, shadow: seg(t, 23.12, 23.24) > .5 });
    }
  }

  function drawAndy(t) {
    if (t < 24.5) {                            // perched on the counter
      const a = t - T_LAND, [x, y, u] = andyPos(t);
      let sq = a < .7 ? .34 * Math.exp(-a * 6) * Math.cos(a * 17) : 0, aL = lerp(1.95, .15, ease(seg(a, 0, .4))), aR = aL, tilt = 0, dy = 0;
      const wave = seg(t, 23.82, 24.2); if (wave > 0 && wave < 1) { aR = .15 + Math.sin(Math.PI * wave) * 1.9 + Math.sin(wave * 30) * .2 * Math.sin(Math.PI * wave); tilt = -.12 * Math.sin(Math.PI * wave); }
      tilt += Math.sin(Math.PI * seg(t, 23.45, 23.8)) * .15;
      if (t > 24.22) { const c = seg(t, 24.22, 24.45); sq += .2 * ease(c); aL = aR = lerp(.15, .9, c); }
      if (a < .35) for (let i = 0; i < 5; i++) { const an = Math.PI + i / 4 * Math.PI, r = u * (3 + a * 14);   // landing puffs
        paint(ellPts(x + Math.cos(an) * r * 1.4, y - 4 + Math.sin(an) * r * .25, u * .9 * (1 - a / .35), u * .6 * (1 - a / .35), 10), { wash: PAL.cream, washOp: 200, ink: null }); }
      andy(x, y, u, { sq, aL, aR, tilt, dy, glowK: lerp(.8, .25, seg(a, 0, .8)) });
      return;
    }
    const w = whirlAt(t);
    trail(t, 24.5, tt => andyPos(tt)); speedLines(t, w);
    if (t < T_DIVE) {
      let aR = .4, aL = .6 + Math.sin(t * 22) * .5, sq = -.1 * w.hop, rot = w.dx * .25 * w.hop;
      if (w.at && w.at.c) {                    // wound-up wing slaps down onto the critter exactly on the tap
        const age = t - w.at.t, hit = age < 0 ? easeIn(seg(age, -.035, 0)) : 1 - ease(seg(age, .03, .09)) * .6;
        aR = lerp(w.a + 1.25, w.a, hit); sq = age >= 0 && age < .08 ? .1 : 0; rot += (w.flip ? -1 : 1) * .14 * hit;
      } else if (w.hop) aR = w.a + 1.25 + Math.sin(t * 30) * .12;
      if (t < 24.6) sq = .2 * (1 - seg(t, 24.5, 24.6));
      andy(w.x, w.y, AU, { flip: w.flip, aL, aR, sq, rot, glowK: .3, shadow: w.y > 800 || Math.abs(w.y - 630) < 4 });
      return;
    }
    // the dive: squash on the beat, a spin, then wings up on "actitud"
    const a = t - T_DIVE, [x, y] = DIVE;
    if (t < T_ACT) {
      const s = seg(t, T_DIVE + .04, T_ACT), sq0 = a < .1 ? .3 * Math.sin(Math.PI * a / .1) : 0;
      andy(x, y, AU, { sx: Math.cos(s * TAU * 2), dy: -Math.sin(Math.PI * s) * 1.6, sq: sq0, aL: .8 + s, aR: .8 + s, glowK: .5 });
      return;
    }
    const m = andyMove('wingsUp', t), k = t - T_ACT;
    const pop = k < .3 ? -.16 * Math.sin(Math.PI * k / .3) : 0;
    andy(x, y, AU, { ...m, dx: 0, aL: lerp(1.3, 2.2 + .12 * Math.sin(t * 9), backOut(seg(k, 0, .14))), aR: lerp(1.3, 2.2 + .12 * Math.sin(t * 9 + 1), backOut(seg(k, 0, .14))), sq: m.sq + pop, glowK: .45 + .35 * pulse(t, 4),
      emote: 'spark', emoteK: seg(k, 0, .25) });
  }

  function fxLate(t) {
    // dive shockwave
    const a = t - T_DIVE;
    if (a > 0 && a < .45) { const r = 60 + a * 1900; brushLine(ellPts(DIVE[0], DIVE[1] - 10, r, r * .22, 30), 2.2 * (1 - a / .45) + .3, '#CFE9FF', 'ink', .5); }
    // whirlwind curls orbiting Andy while he works
    const wk = seg(t, 24.55, 24.8) * (1 - seg(t, T_ACT, T_ACT + .3));
    if (wk > .02) { const [ax, ay, au] = andyPos(t - .03);
      for (let i = 0; i < 3; i++) {
        const a0 = t * 9 + i * TAU / 3, pts = [];
        for (let j = 0; j < 5; j++) { const an = a0 + j * .26; pts.push([ax + Math.cos(an) * au * 7.5, ay - 6.5 * au + Math.sin(an) * au * 3.2]); }
        brushLine(pts, 2 * wk, i % 2 ? '#E3F3FF' : '#9FD8FF', 'ink', .6);
      } }
    // sparkles on "actitud"
    const k = t - T_ACT;
    if (k > 0) for (let i = 0; i < 8; i++) {
      const an = i / 8 * TAU + .3, r = AU * (7 + backOut(seg(k, 0, .35)) * 5 + Math.sin(t * 5 + i) * .6), tw = .6 + .4 * Math.sin(t * 14 + i * 2);
      paint(starPts(DIVE[0] + Math.cos(an) * r, DIVE[1] - 7 * AU + Math.sin(an) * r * .85, AU * (.8 + (i % 2) * .5) * tw * seg(k, 0, .15), .33, 4), { wash: i % 3 ? PAL.beak : PAL.cream, ink: PAL.ink, sw: .7 });
    }
    // her hearts float up
    const h = t - T_HEART;
    if (h > .05) for (let i = 0; i < 4; i++) {
      const hk = frac((h - .05) * .9 + i * .25), hx = OX - 90 + i * 60 + Math.sin(t * 4 + i) * 12;
      if (h - .05 > i * .18) paint(heartPts(hx, 480 - hk * 260, 18 * (1 - hk * .4)), { wash: PAL.coral, washOp: 255 * (1 - hk), ink: PAL.ink, sw: .8 });
    }
  }

  function drawOwner(t, open) {
    const [ax] = andyPos(t);
    const o = { eyes: 'tired', brows: 'worried', mouth: 'flat', frizz: 1, lookX: 0, tilt: 0, aL: .12, aR: .55, bendR: 2.35, dy: 0, sq: 0, blush: 0 };
    o.handR = (s, sw) => phone(0, -.5 * s, s * .5, { glowK: .5 * (1 - seg(t, 23.3, 24)), rot: -.2,
      screen: (w, h) => [0, 1, 2].forEach(i => paint(rrPts(-w * .38 + (i % 2) * w * .18, -h * .38 + i * h * .27, w * .56, h * .18, 3), { wash: [PAL.wa, PAL.ig2, ANDY.sky][i], ink: null })) });
    const bp = bpOf(t);
    o.dy = -Math.abs(Math.sin(bp * Math.PI)) * .08;
    if (t >= 21.76) { o.eyes = 'dot'; o.brows = 'worried'; }
    if (t >= T_OPEN) { o.eyes = 'wide'; o.brows = 'up'; o.lookX = .4; o.tilt = -.06 * seg(t, T_OPEN, T_OPEN + .3); o.frizz = 1 + .4 * (1 - seg(t, T_OPEN + .2, T_OPEN + .8)); }
    if (t >= T_LAND) { const f = t - T_LAND; o.lookX = 1; o.tilt = 0; o.sq = f < .2 ? .06 * Math.sin(Math.PI * f / .2) : 0; }
    if (t >= 24.5) { o.eyes = 'dot'; o.lookX = clamp((ax - OX) / 250, -1, 1); o.brows = 'up'; }
    const headLeft = [headL, headT, headR].filter(c => t < c.tf + .3).length;
    if (t >= 24.5) o.frizz = .3 + headLeft * .23;
    [headL, headT, headR].forEach(c => { const f = t - c.tf; if (f > 0 && f < .15) o.sq = .05 * Math.sin(Math.PI * f / .15); });
    const m = singMouth(t);
    if (t >= 21.7) o.mouth = m || (t >= T_LAND ? 'smile' : 'flat');
    if (t >= T_ACT) {                         // jaw drop
      const f = t - T_ACT; o.mouth = 'O'; o.eyes = 'wide'; o.brows = 'up'; o.lookX = 1; o.frizz = 0;
      o.dy = -Math.sin(Math.PI * seg(f, 0, .2)) * .35; o.aL = lerp(.12, .7, ease(seg(f, 0, .15))); o.aR = lerp(.55, .9, ease(seg(f, 0, .15)));
    }
    if (t >= T_HEART + .04) {                 // heart eyes, hands clasped with the phone at the chest
      const f = t - T_HEART - .04; o.eyes = 'heart'; o.blush = seg(f, 0, .2); o.mouth = f < .25 ? 'O' : (singMouth(t) || 'grin'); o.lookX = .8;
      o.aL = .55; o.bendL = 2.2; o.aR = .55; o.bendR = 2.2; o.tilt = Math.sin(t * 3.2) * .07; o.dy = -Math.abs(Math.sin(bpOf(t) * Math.PI)) * .25;
      o.emote = 'heart'; o.emoteK = seg(f, 0, .25);
    }
    owner(OX, FLOOR_Y, OS, o);
  }

  // ---------- shots ----------
  function arrive(t) {
    const cam = kf(t, [[21.4, [960, 520, 1.0]], [21.95, [965, 470, 1.1]], [22.3, [1010, 400, 1.35]], [22.62, [1070, 330, 1.78]], [22.88, [1100, 325, 1.85]],
      [23.08, [1210, 430, 1.45]], [T_LAND, [1200, 520, 1.28]], [24.43, [1240, 505, 1.45]]]);
    const [sx, sy] = t > T_LAND && t < T_LAND + .3 ? shakeXY(t, 9 * (1 - seg(t, T_LAND, T_LAND + .3))) : [0, 0];
    scene(t, [cam[0] + sx, cam[1] + sy, cam[2], 0]);
    flash(1 - easeOut(seg(t, 21.4, 21.85)), '#EAF6FF');
  }
  function whirl(t) {
    let cx = 0, cy = 0; [.04, .14, .24].forEach(d => { const [x, y, u] = andyPos(t - d); cx += x / 3; cy += (y - 6 * u) / 3; });
    const follow = [lerp(cx, 1080, .42), lerp(cy, 580, .42), 1.32];
    const wide = [1000, 520, 1.04], end = [1140, 640, 1.55];
    const k1 = ease(seg(t, T_DIVE - .12, T_DIVE + .12)), k2 = ease(seg(t, T_ACT - .02, T_ACT + .45));
    let cam = [0, 1, 2].map(i => lerp(lerp(follow[i], wide[i], k1), end[i], k2));
    if (t < 24.9) { const k0 = ease(seg(t, 24.43, 24.9)); cam = cam.map((v, i) => lerp([1240, 505, 1.45][i], v, k0)); }
    const [a1] = andyPos(t - .05), [a0] = andyPos(t - .15), rot = clamp((a1 - a0) / 600, -1, 1) * .025 * (1 - k2);
    const [sx, sy] = t > T_DIVE && t < T_DIVE + .25 ? shakeXY(t, 10 * (1 - seg(t, T_DIVE, T_DIVE + .25))) : [0, 0];
    scene(t, [cam[0] + sx, cam[1] + sy, cam[2] + .02 * pulse(t, 5) * k2, rot]);
  }

  chapter('arrival', 21.4, 28.5, [[21.4, arrive], [24.43, whirl]]);
})();
