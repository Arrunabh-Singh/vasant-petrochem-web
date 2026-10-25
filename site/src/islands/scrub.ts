/**
 * Scroll-driven animations for browsers without them (Firefox, Safari before
 * 26), so the home film and the page reveals play the same everywhere.
 *
 * Every scroll-linked rule in styles/film.css and styles/motion.css declares
 * its timeline as --tl (a named view timeline such as --film, or view()) and
 * its range as --ar (e.g. "contain 15% contain 23%"); native CSS reads the
 * same two properties. This engine finds each CSS animation that has them,
 * holds it at a time, and sets that time from the scroll position on every
 * frame, using the spec's view-progress ranges. A named timeline's subject
 * carries data-timeline="--name" in the markup. Only the scroll position is
 * read: scrolling itself is never touched (design-system/README.md, "Motion").
 */

import { parseRange, rangeOffsets, splitTop, type Point } from "../lib/scroll-range.ts";

const DURATION = 1000;
type Track = { anim: Animation; subject: HTMLElement; from: Point; to: Point; last: number };

// ------------------------------------------------------------------ engine

let tracks: Track[] = [];
const geometry = new Map<HTMLElement, { top: number; h: number }>();
let viewport = 0;

/** Layout position, ignoring transforms (an element's own animation must not move its timeline). */
function layoutTop(el: HTMLElement): number {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}

function measure() {
  viewport = document.documentElement.clientHeight;
  geometry.clear();
  for (const t of tracks) if (!geometry.has(t.subject)) geometry.set(t.subject, { top: layoutTop(t.subject), h: t.subject.offsetHeight });
  for (const t of tracks) t.last = -1;
}

function collect() {
  const found: Track[] = [];
  for (const anim of document.getAnimations()) {
    if (!(anim instanceof CSSAnimation)) continue;
    const effect = anim.effect as KeyframeEffect | null;
    const target = effect?.target as HTMLElement | null;
    if (!effect || !target) continue;
    const style = getComputedStyle(target, effect.pseudoElement ?? undefined);
    const ranges = splitTop(style.getPropertyValue("--ar"));
    if (ranges.length === 0 || ranges[0] === "initial") continue;
    const timelines = splitTop(style.getPropertyValue("--tl"));
    // Lists repeat to match animation-name, as in CSS.
    const index = Math.max(0, style.animationName.split(",").map((n) => n.trim()).indexOf(anim.animationName));
    const range = parseRange(ranges[index % ranges.length] ?? "");
    const tl = timelines[index % Math.max(1, timelines.length)] ?? "view()";
    const subject = tl === "view()" || !tl ? target : target.closest<HTMLElement>(`[data-timeline="${tl}"]`);
    if (!range || !subject) continue;
    try {
      // Where the browser does have scroll timelines (?film=scrub), take the animation over.
      if (anim.timeline !== document.timeline) anim.timeline = document.timeline;
    } catch {
      /* read-only timeline: the CSS block already paused it */
    }
    effect.updateTiming({ duration: DURATION, fill: "both" });
    anim.pause();
    found.push({ anim, subject, from: range[0], to: range[1], last: -1 });
  }
  tracks = found;
  measure();
}

function frame() {
  pending = false;
  const y = scrollY;
  for (const t of tracks) {
    const g = geometry.get(t.subject);
    if (!g) continue;
    const [a0, a1] = rangeOffsets(t.from.name, g.top, g.h, viewport);
    const [b0, b1] = rangeOffsets(t.to.name, g.top, g.h, viewport);
    const start = a0 + ((a1 - a0) * t.from.pct) / 100;
    const end = b0 + ((b1 - b0) * t.to.pct) / 100;
    const p = end > start ? Math.min(1, Math.max(0, (y - start) / (end - start))) : y >= end ? 1 : 0;
    if (p === t.last) continue;
    t.last = p;
    t.anim.currentTime = p * DURATION;
  }
}

let pending = false;
const schedule = () => {
  if (!pending) {
    pending = true;
    requestAnimationFrame(frame);
  }
};
const refresh = () => {
  measure();
  schedule();
};
// Focus changes add and remove animations (a grade with keyboard focus holds still).
const rescan = () => requestAnimationFrame(() => (collect(), frame()));

collect();
frame();
addEventListener("scroll", schedule, { passive: true });
addEventListener("resize", refresh);
addEventListener("load", refresh);
addEventListener("pageshow", refresh);
document.addEventListener("focusin", rescan);
document.addEventListener("focusout", rescan);
void document.fonts?.ready.then(refresh);
new ResizeObserver(refresh).observe(document.body);
document.documentElement.classList.add("vp-scrub");

export {};
