/**
 * The home film's checks, run inside the page. Shared by the Playwright tests
 * (tests/e2e/film.spec.ts) and the iOS Simulator rig (tests/ios/film.mjs),
 * which sends each function's source to Mobile Safari: so every function here
 * is self-contained (no imports, no closures) and takes one plain argument.
 */

/** Scroll to a share (0 to 1) of the film's pinned stretch, with the page's snapping off so any frame can be checked. */
export function scrollFilm(share: number): void {
  document.documentElement.style.scrollSnapType = "none";
  const film = document.querySelector<HTMLElement>(".vp-film")!;
  const top = film.getBoundingClientRect().top + scrollY;
  scrollTo({ top: top + share * (film.offsetHeight - innerHeight), behavior: "instant" });
}

/** Back to the top of the page, with the page's own snapping. */
export function filmTop(_: null): void {
  document.documentElement.style.scrollSnapType = "";
  scrollTo({ top: 0, behavior: "instant" });
}

/**
 * What is wrong with the frame on screen: more than one grade at once, words
 * on the drop, under the phone's action bar or cut off at the top, and on
 * phones the drop off centre.
 */
export function filmProblems(phone: boolean): string[] {
  const box = (e: Element) => e.getBoundingClientRect();
  const seen = (e: Element) => {
    let o = 1;
    for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  const film = document.querySelector<HTMLElement>(".vp-film")!;
  const share = Math.round((-film.getBoundingClientRect().top / Math.max(1, film.offsetHeight - innerHeight)) * 1000) / 1000;
  const out: string[] = [];
  const grades = [...document.querySelectorAll(".vp-oil")].filter((e) => seen(e) > 0.05);
  if (grades.length > 1) out.push(`${grades.length} grades at once`);
  const drop = box(document.querySelector(".vp-film-float")!);
  const dropShown = seen(document.querySelector(".vp-film-drop")!) > 0.3;
  const bar = document.querySelector(".vp-actionbar");
  const barTop = bar && getComputedStyle(bar).display !== "none" ? box(bar).top : innerHeight;
  const words = document.querySelectorAll(
    ".vp-film-copy .vp-eyebrow, .vp-film-copy h1, .vp-film-copy .vp-lead, .vp-film-copy .vp-actions, .vp-film-title, .vp-oil-count, .vp-oil-name, .vp-oil-meta, .vp-oil .vp-link, .vp-film-skip, .vp-scroll-cue",
  );
  for (const e of [...words].filter((w) => seen(w) > 0.3)) {
    const b = box(e);
    const name = e.className.toString().split(" ")[0] || e.tagName;
    const ix = Math.min(b.right, drop.right) - Math.max(b.left, drop.left);
    const iy = Math.min(b.bottom, drop.bottom) - Math.max(b.top, drop.top);
    if (dropShown && ix > 8 && iy > 8) out.push(`${name} on the drop`);
    if (b.bottom > barTop + 1 && b.top < innerHeight) out.push(`${name} under the action bar`);
    if (b.top < -1 && b.bottom > 0) out.push(`${name} cut off at the top`);
  }
  if (phone && share > 0.2 && share < 0.9 && Math.abs(drop.left + drop.width / 2 - innerWidth / 2) > 2) out.push("drop off centre");
  return out.map((p) => `${p} at ${share}`);
}

/** Where the film rests: the grade on screen (-1 for none), who plays it, whether the page snaps, and the screen's height (a phone's toolbar changes it). */
export function filmState(_: null): { y: number; vh: number; share: number; grade: number; engine: boolean; native: number; touch: boolean; reduced: boolean; tall: number; snap: boolean } {
  const seen = (e: Element) => {
    let o = 1;
    for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  const film = document.querySelector<HTMLElement>(".vp-film");
  const share = film ? -film.getBoundingClientRect().top / Math.max(1, film.offsetHeight - innerHeight) : 0;
  const shown = [...document.querySelectorAll(".vp-oil")].map(seen);
  const best = Math.max(0, ...shown);
  return {
    y: Math.round(scrollY),
    vh: innerHeight,
    share: Math.round(share * 1000) / 1000,
    grade: best > 0.5 ? shown.indexOf(best) : -1,
    engine: document.documentElement.classList.contains("vp-scrub"),
    native: document.getAnimations().filter((a) => a.timeline !== null && a.timeline !== document.timeline).length,
    touch: CSS.supports("-webkit-touch-callout", "none"),
    // With reduced motion (or the still page) nothing pins: the film is barely taller than the screen.
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    tall: film ? Math.round((film.offsetHeight / innerHeight) * 10) / 10 : 0,
    snap: getComputedStyle(document.documentElement).scrollSnapType.includes("mandatory"),
  };
}

/** Start recording requestAnimationFrame times, to find the frames the page dropped. */
export function startFrameLog(_: null): void {
  const w = window as unknown as { __vpFrames: number[] };
  w.__vpFrames = [];
  const tick = (t: number) => {
    w.__vpFrames.push(t);
    if (w.__vpFrames.length < 50_000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Frames since the last call, and how many took longer than 50 ms (three dropped frames at 60 Hz). */
export function frameGaps(_: null): { frames: number; slow: number; worst: number } {
  const w = window as unknown as { __vpFrames?: number[] };
  const f = w.__vpFrames ?? [];
  let slow = 0;
  let worst = 0;
  for (let i = 1; i < f.length; i++) {
    const d = (f[i] ?? 0) - (f[i - 1] ?? 0);
    if (d > 50) slow++;
    worst = Math.max(worst, d);
  }
  w.__vpFrames = f.slice(-1);
  return { frames: f.length, slow, worst: Math.round(worst) };
}
