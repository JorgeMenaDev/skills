// Scroll-scrubbed film. Stops are [data-film-stop] articles; clip k runs from stop k-1 to stop k.
// `position` is where the visitor is in the film: 0 at the first stop, 2.5 halfway between the third and fourth,
// and `last` at the final stop, where the final clip holds its last frame. Nothing plays: scroll sets currentTime.

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function mountFilm(root: HTMLElement, { reduceMotion }: { reduceMotion: boolean }) {
  const stage = root.querySelector<HTMLElement>('[data-film-stage]');
  if (!stage) return;
  const stops = [...root.querySelectorAll<HTMLElement>('[data-film-stop]')];
  const posters = [...stage.querySelectorAll<HTMLElement>('[data-film-poster]')];
  const clips = [...stage.querySelectorAll<HTMLVideoElement>('[data-film-clip]')];
  const rail = [...stage.querySelectorAll<HTMLAnchorElement>('[data-film-goto]')];
  const last = stops.length - 1;
  const focus = stops.map((stop) => Number(stop.dataset.focus ?? 50));
  const ready = clips.map(() => false);

  let tops: number[] = [];
  let position = 0;
  let active = 0;
  let wanted = 0;
  let current = -1;

  const measure = () => {
    tops = stops.map((stop) => stop.getBoundingClientRect().top + window.scrollY);
  };

  const positionAt = (y: number) => {
    if (y <= tops[0]) return 0;
    for (let i = 1; i < tops.length; i++) {
      if (y < tops[i]) return i - 1 + (y - tops[i - 1]) / (tops[i] - tops[i - 1]);
    }
    return last;
  };

  // A clip is shown only once it sits on the wanted frame; until then the poster underneath stays visible.
  const seek = () => {
    const clip = clips[active];
    if (!clip || !ready[active]) {
      stage.dataset.mode = 'poster';
      return;
    }
    if (clip.seeking) return; // `seeked` calls back into seek()
    if (Math.abs(clip.currentTime - wanted) > 0.01) {
      clip.currentTime = wanted;
      return;
    }
    clips.forEach((c, i) => c.classList.toggle('is-on', i === active));
    stage.dataset.mode = 'video';
  };
  clips.forEach((clip, i) => clip.addEventListener('seeked', () => i === active && seek()));

  const render = () => {
    position = positionAt(window.scrollY);
    const near = Math.round(position);
    if (near !== current) {
      current = near;
      stops.forEach((stop, i) => stop.toggleAttribute('data-current', i === near));
      rail.forEach((link, i) => link.setAttribute('aria-current', String(i === near)));
    }
    const from = Math.min(Math.floor(position), last);
    const to = Math.min(from + 1, last);
    stage.style.setProperty('--film-focus', `${focus[from] + (focus[to] - focus[from]) * (position - from)}%`);
    // Poster i is the frame shown at stop i. It fades in over the second half of the segment before it.
    posters.forEach((poster, i) => {
      poster.style.opacity = i === 0 ? '1' : String(clamp01((position - i + 0.5) * 2));
    });
    if (!clips.length) return;
    active = Math.min(clips.length - 1, from);
    const duration = clips[active].duration || 0;
    wanted = Math.max(0, Math.min((position - active) * duration, duration - 0.05));
    seek();
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  };
  const refresh = () => {
    measure();
    render();
  };
  root.dataset.ready = '';
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh, { once: true });
  refresh();

  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (!clips.length || reduceMotion || saveData) return; // posters carry the film

  // Load one clip at a time, nearest to the visitor first; at equal distance the one ahead wins.
  const pending = new Set(clips.map((_, i) => i));
  const distance = (i: number) => Math.abs(i + 0.5 - position) - (i + 0.5 >= position ? 0.01 : 0);
  const small = window.matchMedia('(max-width: 767px)').matches;

  const load = async (i: number) => {
    const clip = clips[i];
    const url = (small && clip.dataset.srcSmall) || clip.dataset.src || '';
    // Fetch the whole file first so scrubbing never waits on range requests.
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      clip.src = URL.createObjectURL(await res.blob());
    } catch {
      clip.src = url;
    }
    const ok = await new Promise<boolean>((resolve) => {
      clip.addEventListener('loadeddata', () => resolve(true), { once: true });
      clip.addEventListener('error', () => resolve(false), { once: true });
    });
    if (!ok) return;
    // iOS Safari paints sought frames only after the video has played once.
    await clip.play().catch(() => {});
    clip.pause();
    ready[i] = true;
    render();
  };

  const run = async () => {
    while (pending.size) {
      const next = [...pending].sort((a, b) => distance(a) - distance(b))[0];
      pending.delete(next);
      await load(next);
    }
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
