// cast.js: la Dueña (the owner who sings the song), customers, phones and chat bubbles.
//
// owner(x, y, s, o): (x, y) = ground point between the feet; s = unit. About 16.5s tall (bun included), 6s wide (head).
//   s ≈ 0.95u puts her eyes level with Andy's eyes when they stand side by side.
//   Pose:  dy, sq, rot, flip, aL / aR (arm raise: 0 = hanging, 1.6 = straight out, 2.6 = overhead),
//          bendL / bendR (elbow bend, radians, + bends the forearm up/in), walk (step phase), sit (0..1).
//   Face:  eyes: dot, closed (asleep), happy, wide, tired, heart, star, look (+ lookX -1..1)
//          brows: none, up, worried, angry;  mouth: smile, grin, o, O, flat, wobble, yawn
//          blush (0..1), frizz (0..1 stress hair), sweat (0..1), tilt (head only)
//   Hooks: handL(s, sw) / handR(s, sw) at the hand centre (hold a phone, a coffee cup, a calendar),
//          draw(s, sw) in body-local space (feet at 0, head centre at (0, -11.4s), head radius ~2.8s).
//   Also:  emote / emoteK like Andy ('heart', 'spark', 'zzz', 'note', '!', '?', 'sweat', 'check').
// client(x, y, s, o): simple round customers. o.seed picks skin, hair and shirt; o.phone = true holds a phone.
// phone(x, y, s, o): hand phone centred at (x, y), 2.2s x 4s. o.buzz 0..1 shakes it, o.glowK lights it,
//   o.screen(w, h) paints on the screen in screen-centred coords, o.rot.
// msgBubble(x, y, s, kind, o): chat bubble centred at (x, y), kind 'wa' | 'ig' | 'web'. o.glyph: '?', '$', 'clock',
//   'dots', 'heart', 'check', 'cal'. o.critter adds eyes and little feet (the flood of messages), o.pop 0..1, o.tail.

const SKIN = ['#C98B63', '#E7B48F', '#8E5B3E', '#F2CBA8', '#A8704C'];
const HAIR = ['#3A2530', '#6B3E26', '#1F1B2A', '#B5651D', '#8C8C99'];
const SHIRT = ['#E86F5C', '#58B39A', '#F2B84B', '#7D6BD6', '#F29BB0', '#4F8FD8'];

function owner(x, y, s, o = {}) {
  const sw = clamp(s / 13, .5, 2.4), J = s * .03, skin = SKIN[0], hair = HAIR[0];
  const shirt = o.shirt || '#E86F5C', apron = o.apron || PAL.cream, jeans = '#39457A';
  const sit = clamp(o.sit || 0), sq = o.sq || 0, dy = (o.dy || 0) * s;
  if (o.shadow !== false) paint(ellPts(x, y + s * .2, s * 3.6, s * .7, 20), { wash: PAL.ink, washOp: 45, ink: null });
  push(); translate(x, y + dy); if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (1 + sq * .5), 1 - sq);
  const hipY = -4.2 * s + sit * 1.6 * s;

  // legs + shoes
  [-1, 1].forEach((side, i) => {
    let lift = 0; if (o.walk != null) lift = Math.max(0, Math.sin((o.walk + i * .5) * TAU)) * .9;
    if (sit > .5) {
      paint(rrPts(side * .2 * s - (side < 0 ? 1.3 * s : 0), hipY - .6 * s, 1.3 * s, 1.3 * s, .5 * s, J), { wash: jeans, ink: PAL.ink, sw });
      paint(rrPts(side * 1.2 * s - .65 * s, hipY + .4 * s, 1.3 * s, -hipY - .6 * s, .5 * s, J), { wash: jeans, ink: PAL.ink, sw });
      paint(ellPts(side * 1.2 * s + .3 * s, -.35 * s, 1 * s, .5 * s, 14, J), { wash: PAL.coral, ink: PAL.ink, sw });
    } else {
      paint(rrPts(side * 1.05 * s - .65 * s, hipY, 1.3 * s, -hipY - .5 * s - lift * s, .55 * s, J), { wash: jeans, ink: PAL.ink, sw });
      paint(ellPts(side * 1.05 * s + side * .25 * s, -.4 * s - lift * s, 1 * s, .5 * s, 14, J), { wash: PAL.coral, ink: PAL.ink, sw });
    }
  });

  // arms (drawn before the torso so sleeves tuck under the shoulders)
  const arm = (side, a, bend, hook) => {
    push(); translate(side * 2.05 * s, -7.9 * s + sit * 1.6 * s); rotate(side < 0 ? a : -a);
    paint(rrPts(-.7 * s, -.4 * s, 1.4 * s, 2.1 * s, .65 * s, J), { wash: shirt, ink: PAL.ink, sw });
    translate(0, 1.8 * s); rotate((side < 0 ? -1 : 1) * (bend || 0));
    paint(rrPts(-.52 * s, -.2 * s, 1.04 * s, 1.8 * s, .52 * s, J), { wash: skin, ink: PAL.ink, sw });
    translate(0, 1.85 * s);
    paint(ellPts(0, 0, .68 * s, .66 * s, 14, J), { wash: skin, ink: PAL.ink, sw });
    if (hook) { if (side < 0) scale(-1, 1); hook(s, sw); }
    pop();
  };
  arm(-1, o.aL ?? .12, o.bendL, o.handL); arm(1, o.aR ?? .12, o.bendR, o.handR);

  // torso: shirt, apron with a pocket (comb + pencil peeking out)
  const ty = sit * 1.6 * s;
  paint([[-2.2 * s, -8.3 * s + ty], [2.2 * s, -8.3 * s + ty], [2.6 * s, hipY + .2 * s], [-2.6 * s, hipY + .2 * s]], { wash: shirt, ink: PAL.ink, sw, curv: .15 });
  paint([[-1.7 * s, -7.3 * s + ty], [1.7 * s, -7.3 * s + ty], [2.1 * s, hipY + 1.4 * s], [-2.1 * s, hipY + 1.4 * s]], { wash: apron, ink: PAL.ink, sw, curv: .1 });
  paint(rrPts(-1 * s, -5.6 * s + ty, 2 * s, 1.2 * s, .3 * s, J), { wash: mixCol(apron, PAL.peach, .5), ink: PAL.ink, sw: sw * .8 });
  brushLine([[-.5 * s, -5.6 * s + ty], [-.4 * s, -6.5 * s + ty]], sw * 1.4, '#F2B84B', 'ink', 0);
  paint(rrPts(.1 * s, -6.3 * s + ty, .7 * s, .75 * s, .15 * s), { wash: PAL.rose, ink: PAL.ink, sw: sw * .6 });

  // head
  paint(rectPts(-.6 * s, -9.4 * s + ty, 1.2 * s, 1.3 * s, J), { wash: skin, ink: PAL.ink, sw: sw * .8 });   // neck
  push(); translate(0, -11.4 * s + ty); if (o.tilt) rotate(o.tilt); scale(1.22);
  // hair back mass + bun with a pencil
  paint(ellPts(0, -.4 * s, 2.75 * s, 2.6 * s, 26, J), { wash: hair, ink: PAL.ink, sw });
  brushLine([[.4 * s, -3.6 * s], [1.9 * s, -5.2 * s]], sw * 2.2, '#F2B84B', 'ink', 0);
  paint(ellPts(0, -3.2 * s, 1.55 * s, 1.3 * s, 20, J), { wash: hair, ink: PAL.ink, sw });
  [[-.7, -3.6], [.6, -3.7], [0, -2.6], [-1, -2.8], [1, -2.9]].forEach(([cx, cy]) => brushLine(ellPts(cx * s, cy * s, .38 * s, .32 * s, 8), sw * .5, mixCol(hair, PAL.plum, .6), 'inkfine', .8));
  // face
  paint(ellPts(0, .1 * s, 2.25 * s, 2.35 * s, 26, J), { wash: skin, ink: PAL.ink, sw });
  // fringe curls
  [[-1.6, -1.3], [-.8, -1.8], [0, -1.95], [.85, -1.8], [1.6, -1.3]].forEach(([cx, cy]) => paint(ellPts(cx * s, cy * s, .62 * s, .5 * s, 12, J), { wash: hair, ink: null }));
  if (o.frizz) for (let i = 0; i < 7; i++) { const a = -Math.PI * (.1 + i * .13), r = 2.9 * s; brushLine([[Math.cos(a) * r, Math.sin(a) * r - .4 * s], [Math.cos(a) * (r + o.frizz * 1.1 * s) + jit(.3 * s), Math.sin(a) * (r + o.frizz * 1.1 * s) - .4 * s]], sw * .9, hair, 'ink', 0); }
  // hoop earrings
  [-1, 1].forEach(side => brushLine(ellPts(side * 2.25 * s, .9 * s, .38 * s, .45 * s, 12), sw * .9, '#E8B23A', 'ink', .7));
  _ownerFace(s, sw, o);
  pop();

  if (o.draw) o.draw(s, sw);
  pop();
  if (o.emote && (o.emoteK ?? 1) > .01) emote(o.emote, x + (o.flip ? -1 : 1) * 3.8 * s, y + dy - (15.4 - sit * 1.6) * s, s * .95, o.emoteK ?? 1);
}

function _ownerFace(s, sw, o) {
  const ex = .85 * s, ey = -.1 * s, eyes = o.eyes || 'dot', lx = (o.lookX || 0) * .25 * s;
  const eye = side => {
    const cx = side * ex + lx;
    switch (eyes) {
      case 'closed': brushLine([[cx - .4 * s, ey], [cx, ey + .25 * s], [cx + .4 * s, ey]], sw * .9, PAL.ink, 'ink', .6); break;
      case 'happy': brushLine([[cx - .4 * s, ey + .15 * s], [cx, ey - .25 * s], [cx + .4 * s, ey + .15 * s]], sw * .9, PAL.ink, 'ink', .6); break;
      case 'wide': paint(ellPts(cx, ey, .48 * s, .55 * s, 14), { wash: PAL.white, ink: PAL.ink, sw: sw * .7 }); paint(ellPts(cx, ey + .05 * s, .2 * s, .22 * s, 10), { wash: PAL.ink, ink: null }); break;
      case 'tired': paint(ellPts(cx, ey + .1 * s, .2 * s, .2 * s, 10), { wash: PAL.ink, ink: null });
        brushLine([[cx - .38 * s, ey - .05 * s], [cx + .38 * s, ey - .05 * s]], sw * .8, PAL.ink, 'ink', 0);
        brushLine([[cx - .35 * s, ey + .45 * s], [cx, ey + .58 * s], [cx + .35 * s, ey + .45 * s]], sw * .5, PAL.plum, 'inkfine', .6); break;
      case 'heart': paint(heartPts(cx, ey, .45 * s), { wash: PAL.coral, ink: PAL.ink, sw: sw * .6 }); break;
      case 'star': paint(starPts(cx, ey, .5 * s, .45, 5), { wash: PAL.beak, ink: PAL.ink, sw: sw * .6 }); break;
      default: paint(ellPts(cx, ey, .22 * s, .26 * s, 10), { wash: PAL.ink, ink: null }); paint(ellPts(cx + .08 * s, ey - .1 * s, .07 * s, .07 * s, 6), { wash: PAL.white, ink: null });
    }
    const b = o.brows;
    if (b && b !== 'none') {
      const by = ey - .75 * s, inY = { worried: -.22, angry: .2, up: -.2 }[b] ?? 0, outY = { worried: .05, angry: -.12, up: -.2 }[b] ?? 0;
      brushLine([[cx - side * .38 * s, by + inY * s], [cx + side * .38 * s, by + outY * s]], sw * .9, HAIR[0], 'ink', 0);
    }
  };
  eye(-1); eye(1);
  if (o.blush) [-1, 1].forEach(side => paint(ellPts(side * 1.35 * s, .75 * s, .45 * s, .25 * s, 12), { fill: PAL.coral, fillOp: 150 * o.blush, bleed: .1, ink: null }));
  const my = 1.05 * s, m = o.mouth || 'smile';
  switch (m) {
    case 'grin': paint([[-.65 * s, my - .1 * s], [.65 * s, my - .1 * s], [.35 * s, my + .55 * s], [-.35 * s, my + .55 * s]], { wash: '#7A2E3A', ink: PAL.ink, sw: sw * .8, curv: .5 });
      paint(rectPts(-.45 * s, my - .1 * s, .9 * s, .2 * s), { wash: PAL.white, ink: null }); break;
    case 'o': paint(ellPts(0, my + .1 * s, .25 * s, .3 * s, 12), { wash: '#7A2E3A', ink: PAL.ink, sw: sw * .7 }); break;
    case 'O': case 'yawn': paint(ellPts(0, my + .2 * s, .45 * s, m === 'yawn' ? .7 * s : .55 * s, 14), { wash: '#7A2E3A', ink: PAL.ink, sw: sw * .8 }); break;
    case 'flat': brushLine([[-.4 * s, my], [.4 * s, my]], sw * .9, PAL.ink, 'ink', 0); break;
    case 'wobble': brushLine([[-.5 * s, my], [-.25 * s, my - .12 * s], [0, my], [.25 * s, my - .12 * s], [.5 * s, my]], sw * .9, PAL.ink, 'ink', .5); break;
    default: brushLine([[-.5 * s, my - .1 * s], [0, my + .25 * s], [.5 * s, my - .1 * s]], sw * .95, PAL.ink, 'ink', .6);
  }
  if (o.sweat) paint([[1.9 * s, -1.2 * s], [2.2 * s, -.5 * s], [1.9 * s, -.2 * s], [1.6 * s, -.5 * s]], { wash: '#BFE6FA', washOp: 255 * o.sweat, ink: PAL.ink, sw: sw * .6, curv: .6 });
}

function client(x, y, s, o = {}) {
  const k = Math.floor(hash((o.seed || 0) + 1) * 97), sw = clamp(s / 13, .45, 2), J = s * .03;
  const skin = SKIN[k % SKIN.length], hair = HAIR[(k >> 2) % HAIR.length], shirt = o.shirt || SHIRT[(k >> 1) % SHIRT.length];
  const dy = (o.dy || 0) * s, sq = o.sq || 0;
  if (o.shadow !== false) paint(ellPts(x, y + s * .2, s * 3, s * .6, 18), { wash: PAL.ink, washOp: 40, ink: null });
  push(); translate(x, y + dy); if (o.rot) rotate(o.rot); scale((o.flip ? -1 : 1) * (1 + sq * .5), 1 - sq);
  [-1, 1].forEach((side, i) => { let lift = o.walk != null ? Math.max(0, Math.sin((o.walk + i * .5) * TAU)) * .8 : 0;
    paint(rrPts(side * .9 * s - .55 * s, -3 * s, 1.1 * s, 2.6 * s - lift * s, .5 * s, J), { wash: '#3D3A55', ink: PAL.ink, sw }); });
  paint(ellPts(0, -4.6 * s, 2.5 * s, 2.3 * s, 22, J), { wash: shirt, ink: PAL.ink, sw });
  const armA = o.aR ?? (o.phone ? 1.1 : .2);
  push(); translate(1.9 * s, -5.3 * s); rotate(-armA);
  paint(rrPts(-.45 * s, 0, .9 * s, 2.6 * s, .45 * s, J), { wash: shirt, ink: PAL.ink, sw });
  translate(0, 2.7 * s); paint(ellPts(0, 0, .5 * s, .5 * s, 12), { wash: skin, ink: PAL.ink, sw });
  if (o.phone) { rotate(armA); phone(0, -.6 * s, s * .55, { buzz: o.buzz || 0, glowK: o.glowK ?? .6, screen: o.screen }); }
  pop();
  push(); translate(0, -8.6 * s); if (o.tilt) rotate(o.tilt);
  const style = (k >> 3) % 3;
  if (style === 0) paint(ellPts(0, -.6 * s, 2.3 * s, 2.2 * s, 20, J), { wash: hair, ink: PAL.ink, sw });
  paint(ellPts(0, 0, 2 * s, 2.05 * s, 22, J), { wash: skin, ink: PAL.ink, sw });
  if (style === 1) paint(ellPts(0, -1.3 * s, 2 * s, 1 * s, 16, J), { wash: hair, ink: PAL.ink, sw });
  if (style === 2) { paint(ellPts(0, -1.4 * s, 1.9 * s, .8 * s, 16, J), { wash: hair, ink: PAL.ink, sw }); paint(ellPts(0, -2.3 * s, .8 * s, .7 * s, 12, J), { wash: hair, ink: PAL.ink, sw }); }
  const lx = (o.lookX || 0) * .3 * s;
  [-1, 1].forEach(side => {
    if (o.eyes === 'happy') brushLine([[side * .7 * s - .3 * s + lx, 0], [side * .7 * s + lx, -.3 * s], [side * .7 * s + .3 * s + lx, 0]], sw * .8, PAL.ink, 'ink', .6);
    else paint(ellPts(side * .7 * s + lx, -.1 * s, .2 * s, .24 * s, 10), { wash: PAL.ink, ink: null });
  });
  if (o.mouth === 'o') paint(ellPts(lx, .9 * s, .25 * s, .3 * s, 10), { wash: '#7A2E3A', ink: PAL.ink, sw: sw * .7 });
  else brushLine([[-.4 * s + lx, .75 * s], [lx, 1.05 * s], [.4 * s + lx, .75 * s]], sw * .85, PAL.ink, 'ink', .6);
  pop();
  pop();
}

function phone(x, y, s, o = {}) {
  const buzz = o.buzz || 0, [bx, by] = buzz ? shakeXY(T * 1.7 + x, 3 * s * buzz) : [0, 0], sw = clamp(s / 12, .5, 2);
  push(); translate(x + bx, y + by); if (o.rot) rotate(o.rot + (buzz ? Math.sin(T * 80) * .08 * buzz : 0));
  if (o.glowK) glow(0, 0, 2.6 * s, 3.4 * s, '#CFEFFF', 110 * o.glowK, .35);
  paint(rrPts(-1.1 * s, -2 * s, 2.2 * s, 4 * s, .45 * s), { wash: '#26243A', ink: PAL.ink, sw });
  paint(rrPts(-.95 * s, -1.8 * s, 1.9 * s, 3.55 * s, .3 * s), { wash: o.screenCol || '#EAF6FF', ink: null });
  if (o.screen) o.screen(1.9 * s, 3.55 * s);
  if (buzz > .2) [-1, 1].forEach(side => { brushLine([[side * 1.5 * s, -.8 * s], [side * 1.8 * s, 0], [side * 1.5 * s, .8 * s]], sw, PAL.ink, 'ink', .5); brushLine([[side * 1.9 * s, -1.1 * s], [side * 2.3 * s, 0], [side * 1.9 * s, 1.1 * s]], sw * .8, PAL.ink, 'ink', .5); });
  pop();
}

const BUBBLE = { wa: ['#E4F9E8', PAL.wa], ig: ['#FDE6F1', PAL.ig2], web: ['#E3F2FF', PAL.sky] };
function msgBubble(x, y, s, kind = 'wa', o = {}) {
  const k = o.pop == null ? 1 : backOut(clamp(o.pop)); if (k < .02) return;
  const [bg, edge] = BUBBLE[kind] || BUBBLE.wa, w = 5.2 * s * k, h = 3.3 * s * k, sw = clamp(s / 11, .5, 2);
  push(); translate(x, y); if (o.rot) rotate(o.rot);
  if (o.critter) [-1, 1].forEach((side, i) => { const lift = o.walk != null ? Math.max(0, Math.sin((o.walk + i * .5) * TAU)) * .5 : 0;
    paint(ellPts(side * 1.1 * s * k, h / 2 + .7 * s * k - lift * s, .6 * s * k, .35 * s * k, 10), { wash: edge, ink: PAL.ink, sw }); });
  paint(bubblePts(-w / 2, -h / 2, w, h, o.tail || 'left', s * .05), { wash: bg, ink: edge, sw: sw * 1.3 });
  if (kind === 'ig') paint(rrPts(-w / 2 + .3 * s, -h / 2 + .3 * s, w - .6 * s, .45 * s * k, .2 * s), { wash: mixCol(PAL.ig1, PAL.ig2, .5), washOp: 180, ink: null });
  const g = o.glyph || 'dots', gs = s * k, gx = o.critter ? -1.2 * gs : 0;
  switch (g) {
    case '?': brushLine([[-.55 * gs, -.55 * gs], [-.25 * gs, -1 * gs], [.35 * gs, -.95 * gs], [.5 * gs, -.45 * gs], [0, 0], [0, .3 * gs]], sw * .9, edge, 'ink', .6); paint(ellPts(0, .85 * gs, .2 * gs, .24 * gs, 10), { wash: edge, ink: null }); break;
    case '$': brushLine([[.6 * gs, -.6 * gs], [0, -.85 * gs], [-.55 * gs, -.45 * gs], [0, 0], [.55 * gs, .45 * gs], [0, .85 * gs], [-.6 * gs, .6 * gs]], sw * .85, edge, 'ink', .6); brushLine([[0, -1.15 * gs], [0, 1.15 * gs]], sw * .6, edge, 'ink', 0); break;
    case 'heart': paint(heartPts(0, .1 * gs, .95 * gs), { wash: PAL.coral, ink: null }); break;
    case 'check': brushLine([[-1.1 * gs, 0], [-.5 * gs, .6 * gs], [.3 * gs, -.5 * gs]], sw * 1.5, '#4BA3F4', 'ink', 0); brushLine([[-.3 * gs, .6 * gs], [.9 * gs, -.5 * gs]], sw * 1.5, '#4BA3F4', 'ink', 0); break;
    case 'clock': paint(ellPts(0, 0, .95 * gs, .95 * gs, 18), { wash: PAL.white, ink: edge, sw }); brushLine([[0, 0], [0, -.6 * gs]], sw, edge, 'ink', 0); brushLine([[0, 0], [.45 * gs, .2 * gs]], sw, edge, 'ink', 0); break;
    case 'cal': paint(rrPts(-.9 * gs, -.8 * gs, 1.8 * gs, 1.7 * gs, .2 * gs), { wash: PAL.white, ink: edge, sw }); paint(rectPts(-.9 * gs, -.8 * gs, 1.8 * gs, .5 * gs), { wash: PAL.coral, ink: null }); break;
    default: [-1, 0, 1].forEach(i => paint(ellPts(i * .95 * gs, 0, .33 * gs, .33 * gs, 10), { wash: edge, ink: null }));
  }
  if (o.critter) [-1, 1].forEach(side => { paint(ellPts(w / 2 - 1.4 * gs + side * .55 * gs, -h / 2 + .9 * gs, .28 * gs, .34 * gs, 10), { wash: PAL.ink, ink: null }); });
  pop();
}
