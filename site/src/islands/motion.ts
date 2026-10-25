/**
 * Loads islands/scrub.ts where the film should not rely on the browser's own
 * scroll-driven animations:
 * - browsers without them (Firefox, Safari before 26);
 * - Safari and every iPhone browser (Apple's WebKit), whose scroll timelines
 *   have shown grades and titles out of their slots (desktop Safari 27);
 *   the engine plays the same CSS animations from scroll position instead.
 * Chrome, Edge and Android browsers keep the native, compositor-run film and
 * download nothing extra. ?film=scrub forces the engine, for testing.
 */
import { filmPlays } from "../lib/film.ts";

const forced = new URLSearchParams(location.search).get("film") === "scrub";
const appleWebKit = /Apple/.test(navigator.vendor);
if (filmPlays() && (forced || appleWebKit || !CSS.supports("animation-timeline: view()"))) void import("./scrub.ts");

export {};
