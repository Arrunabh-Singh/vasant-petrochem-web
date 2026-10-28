/**
 * Loads islands/scrub.ts where the film should not rely on the browser's own
 * scroll-driven animations:
 * - browsers without them (Firefox);
 * - desktop Safari, whose scroll timelines showed grades and titles out of
 *   their slots (Safari 27); the engine plays the same CSS animations there.
 * iPhones and iPads play natively: since Safari 26.4 their scroll timelines run
 * on the compositor, in step with the finger, where the engine trailed it.
 * Chrome, Edge and Android browsers play natively too and download nothing
 * extra. ?film=scrub forces the engine, for testing.
 */
import { filmPlays, iosWebKit } from "../lib/film.ts";

const forced = new URLSearchParams(location.search).get("film") === "scrub";
const desktopSafari = /Apple/.test(navigator.vendor) && !iosWebKit();
if (filmPlays() && (forced || desktopSafari || !CSS.supports("animation-timeline: view()"))) void import("./scrub.ts");

export {};
