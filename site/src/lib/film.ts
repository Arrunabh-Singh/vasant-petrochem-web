/**
 * Whether the home film and the page reveals play here: motion is welcome and
 * the browser has container queries. Natively where scroll-driven animations
 * exist, through islands/scrub.ts elsewhere (styles/film.css, motion.css).
 */
export const filmPlays = (): boolean =>
  matchMedia("(prefers-reduced-motion: no-preference)").matches && CSS.supports("container-type: size");
