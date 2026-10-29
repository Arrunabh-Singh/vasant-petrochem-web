/**
 * iOS and iPadOS WebKit: Safari and every other browser on an iPhone or iPad.
 * Only it knows -webkit-touch-callout, in CSS as in script, so the stylesheets
 * (styles/film.css, motion.css) and the islands always agree.
 */
export const iosWebKit = (): boolean => CSS.supports("-webkit-touch-callout", "none");

/**
 * Whether the home film and the page reveals play here: motion is welcome, the
 * screen is at least 480px tall (a phone held sideways gets the still page),
 * the browser has container queries, and an iPhone has scroll-driven
 * animations (iOS 26 and later). Natively where those exist, through
 * islands/scrub.ts in Firefox and desktop Safari (styles/film.css, motion.css).
 */
export const filmPlays = (): boolean =>
  matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 480px)").matches &&
  CSS.supports("container-type: size") &&
  (CSS.supports("animation-timeline: view()") || !iosWebKit());
