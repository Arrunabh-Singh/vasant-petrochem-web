/**
 * The product drop: the logo's chrome-and-gold drop, refilled with each
 * product's own liquid. A port of `dropMarkup` in design-system/components/
 * bundle.js; the geometry and tints are the design system's.
 */
import type { TINTS as TintList } from "../content/schema.ts";

export type Tint = (typeof TintList)[number];

export const DROP_PATH = "M50 0C47.62 4.39 0 117.26 0 126.26A50 50 0 0 0 100 126.26C100 117.26 52.38 4.39 50 0Z";
export const DROP_H = 176.26;
export const LEVEL = 107.07;
/** The liquid's level in a drop filled to the brim ("Request received"). */
export const BRIM = 4;
export const HIGHLIGHT = "M10.1 130.3C11.2 141.5 16.2 153.2 24.2 159.6C31.4 165.3 39.4 168 47.5 167.7";
const CHROME: [number, string][] = [
  [0, "#979797"], [0.1, "#999b9b"], [0.19, "#b1b3b2"], [0.28, "#d8dadc"], [0.33, "#f3f4f5"], [0.37, "#f5f7f9"],
  [0.42, "#d9dbdd"], [0.465, "#c0c2c3"], [0.51, "#a6a8aa"], [0.56, "#b3b5b6"], [0.61, "#c6c8c9"],
];
export const TINT_COLOURS: Record<Tint, { mid: string; light: string; deep: string; rim?: true }> = {
  gold: { mid: "#daad4a", light: "#f8d166", deep: "#a16e27" },
  straw: { mid: "#ecd27c", light: "#fbe8a6", deep: "#c7a650" },
  amber: { mid: "#c17a2f", light: "#eaa65a", deep: "#7b4318" },
  brown: { mid: "#835530", light: "#b98552", deep: "#4b2d16" },
  fuel: { mid: "#3b2c22", light: "#6e5644", deep: "#16100c" },
  bitumen: { mid: "#242221", light: "#4d4a47", deep: "#0c0b0b" },
  clear: { mid: "#e9eded", light: "#ffffff", deep: "#c5ccce", rim: true },
  white: { mid: "#f5efe1", light: "#fffdf8", deep: "#dacfb7", rim: true },
};

/** Each tint's place on the colour scale, lightest to darkest (the oil trade grades by colour, ASTM D1500). */
const SCALE: Record<Tint, number> = { clear: 0, white: 1, straw: 2, gold: 3, amber: 4, brown: 5, fuel: 6, bitumen: 7 };

/**
 * Grades from darkest to lightest by their illustrated colour, so the site's
 * colour scale ends in light (design-system/README.md, "Vastu"); grades that
 * share a tint keep their order.
 */
export const byColour = <T extends { data: { tint: Tint } }>(grades: readonly T[]): T[] =>
  [...grades].sort((a, b) => SCALE[b.data.tint] - SCALE[a.data.tint]);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const stop = (offset: number, colour: string, opacity?: number) =>
  `<stop offset="${offset}" stop-color="${colour}"${opacity == null ? "" : ` stop-opacity="${opacity}"`}/>`;

/**
 * SVG markup for one drop. `id` must be unique on the page (gradients and the
 * clip path are referenced by id). With `title` the drop is an image with that
 * accessible name; without it, decoration. `level` is where the liquid stops (LEVEL, or BRIM).
 */
export function dropSvg(tint: Tint, opts: { id: string; title?: string; animate?: boolean; level?: number }): string {
  const t = TINT_COLOURS[tint];
  const id = opts.id;
  const level = opts.level ?? LEVEL;
  const chrome = CHROME.map(([o, c]) => stop(o, c)).join("");
  const liquid = [stop(0, t.light, 0.95), stop(0.08, t.mid), stop(0.33, t.light), stop(0.58, t.mid), stop(0.84, t.deep), stop(1, t.deep)].join("");
  const a11y = opts.title ? `role="img" aria-label="${esc(opts.title)}"` : `aria-hidden="true" focusable="false"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${DROP_H}" ${a11y} class="vp-drop-svg${opts.animate ? " vp-drop-animate" : ""}">` +
    `<defs>` +
    `<linearGradient id="${id}-c" x1="0" y1="0" x2="0" y2="${DROP_H}" gradientUnits="userSpaceOnUse">${chrome}</linearGradient>` +
    `<linearGradient id="${id}-l" x1="0" y1="${level}" x2="0" y2="${DROP_H}" gradientUnits="userSpaceOnUse">${liquid}</linearGradient>` +
    `<clipPath id="${id}-k"><path d="${DROP_PATH}"/></clipPath>` +
    `</defs>` +
    `<path d="${DROP_PATH}" fill="url(#${id}-c)"/>` +
    `<g clip-path="url(#${id}-k)"><g class="vp-drop-liquid">` +
    `<rect x="-2" y="${level}" width="104" height="${(DROP_H - level + 2).toFixed(2)}" fill="url(#${id}-l)"/>` +
    `<rect x="-2" y="${level}" width="104" height="2.2" fill="#ffffff" opacity="0.32"/>` +
    `<path d="${HIGHLIGHT}" fill="none" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round" opacity="0.9"/>` +
    `</g></g>` +
    (t.rim ? `<path d="${DROP_PATH}" fill="none" stroke="#8f9496" stroke-width="1.3"/>` : "") +
    `</svg>`
  );
}
