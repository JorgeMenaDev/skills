// gallery.js: the model sheet. Paint every rig in every expression and the set by day and night, one page per
// integer of loop time, and check it before any chapter is painted:
//   node render.mjs --loop=gallery --sheet=0.1,1.1,2.1,3.1 --cols=2 --w=960 --out=out/check/gallery.jpg
(() => {
  function gallery(t) {
    const page = Math.floor(t), lt = frac(t) * 2;
    paint(rectPts(-80, -80, W + 160, H + 160), { wash: PAL.paper, ink: null });
    if (page === 0) { /* the set by day with the hero and the singer side by side */ }
    else if (page === 1) { /* the set at its most dramatic lighting, with the problem props */ }
    else if (page === 2) { /* the singer in every eyes/mouth combination, in a row */ }
    else { /* the hero in every pose, emote and move, in a row */ }
  }
  LOOPS.gallery = gallery; LOOPS.gallery.len = 4;
})();
