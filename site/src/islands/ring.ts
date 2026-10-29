/**
 * "Want more?": the doors into the site as a ring you turn (styles/film.css, .vp-ring).
 *
 * Each door gets its place in the ring, --d (0 in front, negative to the left,
 * wrapped so the ring has no ends), and CSS draws the arc from it. Until the
 * reader touches the ring, reading the sentence above turns it: each door's
 * word, once read (past the middle of the screen, as it lights), brings that
 * door to the front. Then it is theirs: drag or swipe it sideways (never from
 * the screen's edges, which belong to the browser's back gesture), use the
 * buttons or the arrow keys, tab through the doors, or tap a door at the side
 * to bring it round; a tap on the door in front opens it.
 *
 * Reading the scroll never moves it: scrolling itself is never scripted.
 * Without this island, or with reduced motion, the doors stay a plain grid.
 */
import { play } from "./sound.ts";

const ring = document.querySelector<HTMLElement>("[data-ring]");
const list = ring?.querySelector<HTMLElement>(".vp-doors");
const doors = [...(list?.querySelectorAll<HTMLElement>(".vp-door") ?? [])];
const n = doors.length;

if (ring && list && n > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const finale = ring.closest<HTMLElement>(".vp-finale");
  const words = [...(finale?.querySelectorAll<HTMLElement>(".vp-finale-text [data-door]") ?? [])];
  const tints = [...(finale?.querySelectorAll<HTMLElement>(".vp-finale-tints > span") ?? [])];
  const count = ring.querySelector<HTMLElement>("[data-ring-count]");
  const live = ring.querySelector<HTMLElement>("[data-ring-live]");
  const names = doors.map((d) => d.querySelector(".vp-door-name")?.textContent?.trim() ?? "");
  const pad = (i: number) => String(i).padStart(2, "0");
  /** x wrapped into [-n/2, n/2): a door's place, whichever way round is shorter. */
  const wrap = (x: number) => ((((x + n / 2) % n) + n) % n) - n / 2;
  const index = (x: number) => ((Math.round(x) % n) + n) % n;

  let k = Number(words[0]?.dataset.door ?? 0); // the ring's turn: which door is in front, fractional while it moves
  let goal = k; // where it is heading
  let front = -1;
  let driven = words.length > 0; // the sentence turns it until the reader does
  let anim = 0;

  function set(next: number) {
    k = next;
    doors.forEach((door, i) => {
      const d = wrap(i - k);
      door.style.setProperty("--d", d.toFixed(3));
      door.style.setProperty("--z", String(100 - Math.round(Math.abs(d) * 10)));
      door.classList.toggle("is-far", Math.abs(d) > 3.4);
    });
    const now = index(k);
    if (now === front) return;
    if (front >= 0) play("tick");
    front = now;
    doors.forEach((door, i) => door.classList.toggle("is-front", i === now));
    words.forEach((w) => w.classList.toggle("is-on", Number(w.dataset.door) === now));
    tints.forEach((t, i) => t.classList.toggle("is-on", i === now));
    if (count) count.textContent = `${pad(now + 1)} / ${pad(n)}`;
  }

  /** Turns the ring to door i (or by a fractional amount, for a drag's settle), the short way round, easing out. */
  function turn(to: number, say = false) {
    goal = to;
    cancelAnimationFrame(anim);
    const from = k;
    const ms = Math.min(700, 300 + Math.abs(to - from) * 90);
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      set(from + (to - from) * (1 - (1 - p) ** 3));
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    if (say && live) live.textContent = (ring!.dataset.at ?? "{name}").replace("{name}", names[index(to)] ?? "").replace("{i}", String(index(to) + 1)).replace("{n}", String(n));
  }
  const toDoor = (i: number, say = false) => turn(goal + wrap(i - goal), say);
  /** The reader has the ring now: the sentence stops turning it, and the hint goes. */
  const take = () => {
    driven = false;
    ring.classList.add("is-used");
  };

  ring.querySelector("[data-ring-prev]")?.addEventListener("click", () => (take(), turn(Math.round(goal) - 1, true)));
  ring.querySelector("[data-ring-next]")?.addEventListener("click", () => (take(), turn(Math.round(goal) + 1, true)));

  // The keyboard: tabbing to a door brings it round; the arrow keys move along the ring.
  list.addEventListener("focusin", (e) => {
    const i = doors.findIndex((d) => d.contains(e.target as Node));
    if (i < 0 || !(e.target as Element).matches(":focus-visible")) return;
    take();
    ring.scrollLeft = 0;
    if (index(goal) !== i) toDoor(i);
  });
  list.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = (index(goal) + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    doors[i]?.querySelector("a")?.focus({ preventScroll: true });
  });

  // A drag or swipe turns it with the finger, then it settles where the flick would carry it.
  let drag: { id: number; x: number; y: number; k: number; t: number; v: number; on: boolean } | null = null;
  let dropped = -1e9; // when the last drag ended: the click that follows it never opens a door
  const spacing = () => {
    const css = getComputedStyle(ring);
    return parseFloat(css.getPropertyValue("--cw")) * parseFloat(css.getPropertyValue("--p1")) || 240;
  };
  let px = spacing();
  list.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.clientX < 24 || e.clientX > innerWidth - 24) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, k, t: e.timeStamp, v: 0, on: false };
  });
  list.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.on) {
      if (Math.abs(e.clientY - drag.y) > Math.abs(dx)) drag = null; // the page is scrolling
      if (!drag || Math.abs(dx) < 8) return;
      drag.on = true;
      drag.k = k + dx / px; // from wherever the ring is now, without a jump
      take();
      cancelAnimationFrame(anim);
      list.setPointerCapture(e.pointerId);
    }
    const next = drag.k - dx / px;
    const dt = e.timeStamp - drag.t;
    if (dt > 0) drag.v = 0.7 * ((next - k) / dt) + 0.3 * drag.v;
    drag.t = e.timeStamp;
    set(next);
  });
  const release = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { on, v } = drag;
    drag = null;
    if (!on) return;
    dropped = e.timeStamp;
    turn(Math.round(k + Math.max(-3, Math.min(3, v * 220))), true);
  };
  list.addEventListener("pointerup", release);
  list.addEventListener("pointercancel", release);
  list.addEventListener("dragstart", (e) => e.preventDefault());
  // A trackpad's sideways swipe turns it too.
  let settle = 0;
  list.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    take();
    cancelAnimationFrame(anim);
    set(k + e.deltaX / px);
    clearTimeout(settle);
    settle = window.setTimeout(() => turn(Math.round(k), true), 120);
  }, { passive: false });

  // A tap on a door at the side brings it round; on the door in front, it opens. A drag never opens one.
  list.addEventListener("click", (e) => {
    const i = doors.findIndex((d) => d.contains(e.target as Node));
    const fromDrag = e.timeStamp - dropped < 500;
    if (fromDrag || (i >= 0 && i !== index(goal))) e.preventDefault();
    if (fromDrag || i < 0 || i === index(goal)) return;
    take();
    toDoor(i, true);
  });

  // The sentence's door words, read in turn, bring their doors round: measured once and on resize, then only arithmetic as the page scrolls.
  let tops: number[] = [];
  const measure = () => {
    tops = words.map((w) => w.getBoundingClientRect().top + scrollY);
    px = spacing();
  };
  let queued = 0;
  const read = () => {
    queued = 0;
    if (!driven) return;
    const line = scrollY + innerHeight * 0.55;
    let j = 0;
    tops.forEach((top, w) => (top < line ? (j = w) : 0));
    const door = Number(words[j]?.dataset.door ?? 0);
    if (door !== index(goal)) toDoor(door);
  };
  const onScroll = () => void (queued ||= requestAnimationFrame(read));
  if (finale && words.length) {
    new IntersectionObserver(([e]) => {
      // A jump straight to the finale reads the sentence at once, not at the next scroll.
      if (e?.isIntersecting) {
        addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      } else removeEventListener("scroll", onScroll);
    }, { rootMargin: "50% 0px" }).observe(finale);
  }
  new ResizeObserver(measure).observe(document.body);
  void document.fonts?.ready.then(measure);

  set(k);
  ring.classList.add("is-live");
}

export {};
