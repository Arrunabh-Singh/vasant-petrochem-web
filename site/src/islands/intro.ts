/**
 * The opening (components/Intro.astro), when islands/intro-gate.js has marked
 * the page html.vp-opening. Opens the dialog as a modal; fills the drop and
 * rolls the counter as the fonts, the page's light (its styles and images)
 * and the drop's real-time liquid get ready, taking at least MIN and at most
 * MAX; then shows Enter. Enter flies the drop to the hero's and lets the hero's
 * title resolve as the ivory lifts; Enter with sound also turns sound on.
 * Skip intro and Escape go straight in. However it closes, the visit is
 * remembered for this tab.
 */
import { play, setSound } from "./sound.ts";

const MIN = 1400;
const MAX = 3200;
const PARTS = { fonts: 0.4, light: 0.3, liquid: 0.3 };
type Part = keyof typeof PARTS;

const root = document.documentElement;
const dialog = document.querySelector<HTMLDialogElement>("[data-intro]");
if (dialog && root.classList.contains("vp-opening")) open(dialog);

function open(d: HTMLDialogElement) {
  d.showModal();
  // Focus on the dialog itself, which a screen reader announces by name; Tab reaches Skip intro, then Enter.
  d.focus();
  // The hero's title resolves as the visitor goes in, not unseen beneath the opening.
  const title = [...(document.querySelector("main h1")?.getAnimations() ?? [])];
  for (const a of title) {
    a.pause();
    a.currentTime = 0;
  }

  const done = new Set<Part>();
  const mark = (part: Part) => {
    done.add(part);
    d.querySelector(`[data-part="${part}"]`)?.classList.add("is-done");
  };
  void document.fonts.ready.then(() => mark("fonts"));
  if (document.readyState === "complete") mark("light");
  else addEventListener("load", () => mark("light"), { once: true });
  const liquid = document.querySelector(".vp-film .vp-liquid");

  const wheels = [...d.querySelectorAll<HTMLElement>("[data-wheel]")];
  const show = (p: number) => {
    d.style.setProperty("--p", p.toFixed(3));
    const n = Math.round(p * 100);
    const [h, t, o] = [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
    // Cell 0 is blank: no leading zeros.
    [h ? h + 1 : 0, h || t ? t + 1 : 0, o + 1].forEach((cell, i) => wheels[i]?.style.setProperty("--d", String(cell)));
  };

  const t0 = performance.now();
  let shown = 0;
  let last = t0;
  let raf = 0;
  const tick = (now: number) => {
    const elapsed = now - t0;
    if (!done.has("liquid") && (!liquid || liquid.matches(".is-live, .is-off") || elapsed > MAX)) mark("liquid");
    const target = Math.min(elapsed >= MAX ? 1 : [...done].reduce((n, p) => n + PARTS[p], 0), elapsed / MIN);
    shown += (target - shown) * (1 - Math.exp(-(now - last) / 150));
    last = now;
    if (target >= 1 && shown > 0.995) shown = 1;
    show(shown);
    if (shown < 1) raf = requestAnimationFrame(tick);
    else ready();
  };
  raf = requestAnimationFrame(tick);

  const enter = d.querySelector<HTMLElement>('[data-intro-go="enter"]');
  function ready() {
    d.classList.add("is-ready");
    const state = d.querySelector("[data-intro-state]");
    if (state) state.textContent = d.dataset.ready ?? "";
    // Focus moves to Enter unless the visitor has already moved it.
    if (document.activeElement === d) enter?.focus();
  }

  let leaving = false;
  const go = (how: string) => {
    if (leaving) return;
    leaving = true;
    cancelAnimationFrame(raf);
    for (const a of title) a.play();
    if (how === "skip") {
      d.classList.add("is-skipping");
      setTimeout(() => d.close(), 200);
      return;
    }
    if (how === "sound") {
      setSound(true);
      play("enter");
    }
    void handoff(d).finally(() => {
      d.classList.add("is-gone");
      setTimeout(() => d.close(), 200);
    });
  };

  d.addEventListener("click", (e) => {
    const how = e.target instanceof Element && e.target.closest<HTMLElement>("[data-intro-go]")?.dataset.introGo;
    if (how) go(how);
  });
  // Enter goes in from anywhere but a control (a control's own click says how); Escape skips.
  d.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !(e.target instanceof Element && e.target.closest("button, a"))) {
      e.preventDefault();
      go("enter");
    }
  });
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    go("skip");
  });
  d.addEventListener("close", () => {
    cancelAnimationFrame(raf);
    // Only a title still held: play() on a finished animation would run it again.
    for (const a of title) if (a.playState === "paused") a.play();
    try {
      sessionStorage.setItem("vp-entered", "1");
    } catch {
      /* not remembered: the next visit opens with it again */
    }
    root.classList.remove("vp-opening");
    d.remove();
  });
}

/** The drop flies from the opening to the hero's own and its liquid settles to the hero's level, while the ivory lifts (styles/intro.css). */
async function handoff(d: HTMLDialogElement): Promise<void> {
  d.classList.add("is-leaving");
  d.style.setProperty("--p", "0.45");
  const drop = d.querySelector<HTMLElement>(".vp-intro-drop svg");
  const a = drop?.getBoundingClientRect();
  const b = document.querySelector(".vp-film-float")?.getBoundingClientRect();
  if (!drop || !a || !b || b.width === 0 || b.bottom < 0 || b.top > innerHeight) {
    await new Promise((r) => setTimeout(r, 700));
    return;
  }
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  await drop.animate([{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${b.width / a.width})` }], {
    duration: 950,
    easing: "cubic-bezier(.65, 0, .2, 1)",
    fill: "forwards",
  }).finished;
}
