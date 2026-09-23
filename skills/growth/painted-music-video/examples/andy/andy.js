// andy.js: Andy the bird. The face IS the logo and never changes (no mouth, fixed eyes and beak);
// Andy acts only with his body: bounce, squash, lean, tilt, wings, feet, and small emotes by the head.
//
// andy(x, y, u, o): (x, y) = ground point between the feet; u = body unit. Total height ~14.2u, width ~8u (head).
//   Body-local space (for o.draw): feet at y 0, body centre (0, -3.7u) radii 3.1 x 3.2u, head centre (0, -10.1u) radius 4u.
// Pose:  dy (units, negative = up), sq (squash, negative stretches), rot (whole body), tilt (head only),
//        flip, sx (horizontal scale, spin), aL / aR (wing raise, 0 = folded, ~1.6 = straight out, 2.05 max = raised V),
//        fly: flap phase (wings beat, feet tuck), walk: step phase.
// Face:  lid 0..1 (half-closed "handled / sleepy"), the ONLY face change allowed.
// Hooks: wingL(u, sw) / wingR(u, sw) are called at the wing tip in wing space (+y runs out along the wing),
//        draw(u, sw) in body-local space (hats, headphones, a pencil behind the "ear").
// Extras: emote + emoteK (0..1): 'heart', 'spark', 'zzz', 'note', '!', '?', 'check', 'sweat'. shadow: false to skip.
// Colour: dim 0..1 darkens toward night (for silhouettes), glowK adds a soft blue aura.

const ANDY = { sky: '#4BC0F4', peri: '#616FF7', beak: '#F7BA44', rim: '#16161C', hi: '#FFFFFF' };

function _ellBelow(cx, cy, rx, ry, lvl, n = 22) {            // part of an ellipse below a horizontal chord
  const a0 = Math.asin(clamp(lvl / ry, -1, 1)), a1 = Math.PI - a0, p = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
}
// The logo's vertical sky-to-periwinkle gradient as stacked flat bands, then one rim stroke that joins at the bottom.
function _gradDisc(cx, cy, rx, ry, sw, J, dim) {
  const top = mixCol(ANDY.sky, PAL.night, dim), bot = mixCol(ANDY.peri, PAL.night, dim);
  paint(ellPts(cx, cy, rx, ry, 40, J), { wash: top, ink: null });
  for (let i = 1; i <= 7; i++) paint(_ellBelow(cx, cy, rx * .995, ry * .995, lerp(-.78, .8, i / 7) * ry), { wash: mixCol(top, bot, i / 7), ink: null });
  paint(ellPts(cx, cy, rx, ry, 40, J, Math.PI / 2), { ink: ANDY.rim, sw });
}

function andy(x, y, u, o = {}) {
  const dim = o.dim || 0, sq = (o.sq || 0) + (o.take || 0), sw = clamp(u / 16, .5, 2.8) * (o.swMul || 1), J = u * .022;
  const fly = o.fly != null, flap = fly ? Math.sin(o.fly * TAU) : 0;
  const dy = (o.dy || 0) * u;
  if (o.shadow !== false) {
    const f = 1 - Math.min(.6, Math.abs(o.dy || 0) * .06);
    paint(ellPts(x, y + u * .2, u * 4 * f, u * .75 * f, 22), { wash: PAL.ink, washOp: 45 * f, ink: null });
  }
  if (o.glowK) glow(x, y + dy - 7 * u, 10 * u, 9 * u, ANDY.sky, 90 * o.glowK, .35);

  push();
  translate(x, y + dy);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6), 1 - sq);
  const bodyC = mixCol(mixCol(ANDY.sky, ANDY.peri, .25), PAL.night, dim), wingC = mixCol(mixCol(ANDY.sky, ANDY.peri, .15), PAL.night, dim);

  // tail fan (behind everything)
  [-.45, 0, .45].forEach(a => { push(); translate(2.3 * u, -1.9 * u); rotate(a - .35 + (fly ? .5 : 0));
    paint(ellPts(1.3 * u, 0, 1.4 * u, .5 * u, 16, J), { wash: mixCol(bodyC, ANDY.peri, .3), ink: ANDY.rim, sw }); pop(); });

  // wings: pivot at the shoulder, hang down when folded; raising swings them out and up.
  const wing = (side, a, hook) => {
    push(); translate(side * 2.55 * u, -5.1 * u);
    rotate(side < 0 ? .22 + a : -(.22 + a));
    paint(ellPts(side * .3 * u, 1.7 * u, 1.05 * u, 2.05 * u, 18, J), { wash: wingC, ink: ANDY.rim, sw });
    paint([[side * -.1 * u, 2.4 * u], [side * .55 * u, 3.2 * u], [side * .95 * u, 2.3 * u]], { ink: mixCol(ANDY.rim, wingC, .45), sw: sw * .55, br: 'inkfine' });
    if (hook) { translate(side * .3 * u, 3.6 * u); if (side < 0) scale(-1, 1); hook(u, sw); }
    pop();
  };
  // past ~2.05 a wing would slide behind the big head, so raised wings stop there (a V, still readable)
  const aL = Math.min(2.05, fly ? 1.5 + flap * 1.05 : (o.aL ?? .1)), aR = Math.min(2.05, fly ? 1.5 + flap * 1.05 : (o.aR ?? .1));
  wing(-1, aL, o.wingL); wing(1, aR, o.wingR);

  // feet (tucked when flying, stepping when walking)
  [-1.5, 1.5].forEach((fx, i) => {
    let fy = -.45, lift = 0;
    if (o.walk != null) { const ph = Math.sin((o.walk + i * .5) * TAU); lift = Math.max(0, ph) * .8; }
    if (fly) { fy = -.9; lift = .3; }
    paint(ellPts(fx * u * (fly ? .7 : 1), (fy - lift) * u, (fly ? .95 : 1.35) * u, .55 * u, 16, J), { wash: mixCol(ANDY.peri, PAL.night, dim), ink: ANDY.rim, sw });
  });

  _gradDisc(0, -3.7 * u, 3.1 * u, 3.2 * u, sw, J, dim);

  // head: the logo face
  push(); translate(0, -10.1 * u); if (o.tilt) rotate(o.tilt);
  _gradDisc(0, 0, 4 * u, 4 * u, sw * 1.35, J, dim);
  const lid = clamp(o.lid || 0);
  [-2.1, 2.1].forEach(ex => {
    paint(ellPts(ex * u, -.9 * u + lid * .25 * u, .9 * u, 1.05 * u * (1 - lid * .62), 20, 0), { wash: ANDY.rim, ink: null });
    if (lid < .6) paint(ellPts((ex + .28) * u, -1.3 * u + lid * .3 * u, .24 * u, .28 * u, 12, 0), { wash: ANDY.hi, ink: null });
  });
  paint([[-.95 * u, -.2 * u], [-.5 * u, -.5 * u], [.5 * u, -.5 * u], [.95 * u, -.2 * u], [.2 * u, 1.3 * u], [-.2 * u, 1.3 * u]],
    { wash: mixCol(ANDY.beak, PAL.night, dim * .7), ink: ANDY.rim, sw: sw * 1.1, curv: .5 });
  pop();

  if (o.draw) o.draw(u, sw);
  pop();

  if (o.emote && (o.emoteK ?? 1) > .01) emote(o.emote, x + (o.flip ? -1 : 1) * 4.6 * u, y + dy - 13.2 * u, u, o.emoteK ?? 1);
}

// Little reaction marks by the head. k 0..1 pops them in (overshoot) and fades them.
function emote(kind, x, y, u, k) {
  const s = backOut(clamp(k * 1.6)) * u, a = clamp(k * 3);
  if (s < .05) return;
  push(); translate(x, y);
  const sw = clamp(u / 18, .5, 2);
  switch (kind) {
    case 'heart': paint(heartPts(0, 0, 1.3 * s), { wash: PAL.coral, ink: ANDY.rim, sw }); break;
    case 'spark': [[0, 0, 1.2], [1.5, 1.1, .6], [-1.2, 1.3, .45]].forEach(([dx, dy, r]) => paint(starPts(dx * s, dy * s, r * s, .35, 4), { wash: ANDY.beak, ink: ANDY.rim, sw: sw * .8 })); break;
    case 'zzz': [0, 1, 2].forEach(i => { const zx = i * .9 * s, zy = -i * 1.1 * s, h = (.5 + i * .18) * s;
      brushLine([[zx - h, zy - h], [zx + h, zy - h], [zx - h, zy + h], [zx + h, zy + h]], sw * 1.3, PAL.cream, 'ink', 0); }); break;
    case 'note': paint(ellPts(-.4 * s, .8 * s, .55 * s, .42 * s, 14, 0, -.4), { wash: ANDY.rim, ink: null }); brushLine([[.1 * s, .7 * s], [.1 * s, -1.2 * s], [.9 * s, -.8 * s]], sw * 1.2, ANDY.rim, 'ink', 0); break;
    case 'check': paint(ellPts(0, 0, 1.2 * s, 1.2 * s, 24), { wash: PAL.wa, ink: ANDY.rim, sw }); brushLine([[-.55 * s, 0], [-.1 * s, .45 * s], [.6 * s, -.45 * s]], sw * 1.6, PAL.white, 'ink', 0); break;
    case 'sweat': paint([[0, -1 * s], [.55 * s, .2 * s], [0, .7 * s], [-.55 * s, .2 * s]], { wash: '#BFE6FA', ink: ANDY.rim, sw, curv: .6 }); break;
    case '!': paint(rrPts(-.3 * s, -1.4 * s, .6 * s, 1.7 * s, .3 * s), { wash: ANDY.beak, ink: ANDY.rim, sw }); paint(ellPts(0, .9 * s, .34 * s, .34 * s, 12), { wash: ANDY.beak, ink: ANDY.rim, sw }); break;
    case '?': brushLine([[-.6 * s, -.7 * s], [-.3 * s, -1.3 * s], [.4 * s, -1.25 * s], [.55 * s, -.6 * s], [0, -.1 * s], [0, .35 * s]], sw * 2.4, ANDY.beak, 'ink', .6); paint(ellPts(0, 1 * s, .3 * s, .3 * s, 12), { wash: ANDY.beak, ink: ANDY.rim, sw }); break;
  }
  pop();
}

// Dance moves: pose offsets in body units, locked to the song's beat grid.
function andyMove(style, t, seed = 0) {
  const bp = bpOf(t) + seed * .5, bi = Math.floor(bp), bf = bp - bi, hit = Math.max(0, 1 - bf * 3.2), s1 = Math.sin(bp * Math.PI), ab = Math.abs(s1);
  const o = { dy: 0, sq: 0, aL: .15, aR: .15, rot: 0, tilt: 0, sx: 1, dx: 0 };
  switch (style) {
    case 'bounce': o.dy = -ab * 1.4; o.sq = hit * .12; o.aL = .5 + .5 * s1; o.aR = .5 - .5 * s1; o.tilt = s1 * .08; break;
    case 'hop': o.dy = -ab * 3.6; o.sq = hit * .18 - ab * .06; o.aL = o.aR = .4 + ab * 1.2; break;
    case 'wingsUp': o.dy = -ab * 1.1; o.sq = hit * .1; o.aL = o.aR = 1.85 + .2 * Math.sin(bp * TAU); o.tilt = s1 * .1; break;
    case 'sway': o.dx = s1 * 2.4; o.rot = s1 * .12; o.tilt = -s1 * .1; o.aL = .6 + .7 * s1; o.aR = .6 - .7 * s1; o.sq = hit * .07; break;
    case 'spin': { const ph = (((bi % 4) + 4) % 4 === 3) ? bf : 0; o.sx = Math.cos(ph * TAU); o.dy = -Math.sin(ph * Math.PI) * 3 - ab * .8; o.aL = o.aR = .6 + ph * 1.5; o.sq = hit * .1; break; }
    case 'point': o.dy = -ab * .8; o.aR = 1.5 + hit * .4; o.aL = .2; o.rot = -.06; o.tilt = .1; o.sq = hit * .08; break;
    case 'shimmy': o.dx = Math.sin(bp * TAU * 2) * .5; o.rot = Math.sin(bp * TAU * 2) * .05; o.aL = 1 + .5 * Math.sin(bp * TAU * 2); o.aR = 1 - .5 * Math.sin(bp * TAU * 2); o.dy = -ab * .4; break;
    case 'stomp': o.dy = -Math.max(0, Math.sin(bp * TAU)) * 1.3; o.sq = hit * .2; o.rot = (bi % 2 ? 1 : -1) * .07 * hit; o.aL = o.aR = hit * 1.1; break;
    case 'idle': o.dy = -ab * .35; o.sq = hit * .04; o.tilt = Math.sin(bp * Math.PI * .5) * .05; break;
    case 'walk': o.walk = bp / 2; o.dy = -ab * .5; o.aL = .25 * s1 + .2; o.aR = -.25 * s1 + .2; break;
    case 'mix': return andyMove(['bounce', 'wingsUp', 'sway', 'spin', 'hop', 'shimmy'][(Math.floor(bp / 8) + seed) % 6], t);
  }
  return o;
}
function andyDancer(x, y, u, style, t, extra = {}) { const m = andyMove(style, t, extra.seed || 0); andy(x + m.dx * u, y, u, { ...m, ...extra }); }

// A body "take" between two states (anticipation squash, stretch, settle) + an emote that pops and fades.
// keys: [[t0, emote|null], [t1, emote], ...]. Spread into andy(): andy(x, y, u, { ...react(t, keys) }).
function react(t, keys) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [t0, em] = keys[i], age = t - t0;
  let take = 0;
  if (i > 0 && age < .14) take = .12 * Math.sin(age / .14 * Math.PI);
  else if (i > 0 && age < .42) take = -.1 * Math.sin((age - .14) / .28 * Math.PI) * (1 - (age - .14) / .28);
  return { take, emote: em, emoteK: em ? seg(age, 0, .25) * (1 - seg(age, 1.3, 1.6)) : 0 };
}
