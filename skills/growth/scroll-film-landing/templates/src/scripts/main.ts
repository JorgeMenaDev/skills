import Lenis from 'lenis';
import { mountFilm } from './film';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Lenis smooths the scroll; it moves the real window scroll, so film.ts just listens to `scroll`.
if (!reduceMotion) {
  const lenis = new Lenis({ autoRaf: true, anchors: true });
  (window as Window & { lenis?: Lenis }).lenis = lenis;
}

const root = document.querySelector<HTMLElement>('[data-film]');
if (root) mountFilm(root, { reduceMotion });
