/**
 * Loads islands/scrub.ts only where the browser has no scroll-driven
 * animations (Firefox, Safari before 26), so Chrome and Safari 26+ pay
 * nothing for it. ?film=scrub forces it, for testing the engine anywhere.
 */
import { filmPlays } from "../lib/film.ts";

const forced = new URLSearchParams(location.search).get("film") === "scrub";
if (filmPlays() && (forced || !CSS.supports("animation-timeline: view()"))) void import("./scrub.ts");

export {};
