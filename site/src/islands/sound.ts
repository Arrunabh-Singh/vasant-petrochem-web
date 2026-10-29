/**
 * Optional sound, composed in the browser with Web Audio: no files, nothing
 * plays until the visitor turns it on with a [data-sound] button, the choice
 * is remembered on this device, and the sound stops while the tab is hidden.
 * play("add") is a soft thud as a grade joins the quote; play("sent") a deep
 * bass note with a bright chime as the request lands; play("enter") a low
 * note settling under a high shimmer, as the opening hands over to the film;
 * play("tick") a short woody click with a little weight, as a door of the
 * ring comes round to the front; play("pour") a deep rising glug, as a grade
 * pours into the film's drop. Under the film and the marketplace's lineup
 * ([data-bed], while one is on screen) a low bed hums: it swells as the
 * visitor scrolls and settles when they stop.
 */
const KEY = "vp-sound";
let on = false;
try {
  on = localStorage.getItem(KEY) === "on";
} catch {
  /* blocked storage: sound stays off */
}
let ctx: AudioContext | null = null;

/** One oscillator: its wave, a pitch glide (Hz), when it starts (s), its peak level and how long it rings (s). */
type Voice = [type: OscillatorType, from: number, to: number, delay: number, peak: number, ring: number];
const SOUNDS: Record<"add" | "sent" | "enter" | "tick" | "pour", Voice[]> = {
  add: [
    ["sine", 160, 58, 0, 0.55, 0.24],
    ["triangle", 880, 440, 0, 0.05, 0.05],
  ],
  sent: [
    ["sine", 82.4, 55, 0, 0.7, 1.9],
    ["sine", 110, 110, 0, 0.22, 1.4],
    ["triangle", 1318.5, 1318.5, 0.09, 0.05, 0.6],
    ["triangle", 1760, 1760, 0.18, 0.04, 0.7],
  ],
  enter: [
    ["sine", 65.4, 49, 0, 0.6, 2.4],
    ["sine", 98, 98, 0.05, 0.18, 1.8],
    ["triangle", 1046.5, 1046.5, 0.28, 0.035, 1.2],
    ["triangle", 1568, 1568, 0.42, 0.025, 1],
  ],
  tick: [
    ["sine", 150, 90, 0, 0.16, 0.07],
    ["triangle", 2400, 1700, 0, 0.022, 0.03],
  ],
  pour: [
    ["sine", 62, 124, 0, 0.32, 0.36],
    ["sine", 180, 360, 0.05, 0.07, 0.18],
    ["triangle", 480, 960, 0.11, 0.018, 0.09],
  ],
};

// The bed: two sines a breath apart beating slowly, a fifth above for body and a little air, all under a low-pass.
let bed: GainNode | null = null;
let near = false; // a [data-bed] is on screen
const REST = 0.05;
function hum(c: AudioContext) {
  if (bed) return;
  bed = c.createGain();
  bed.gain.value = 0;
  const low = c.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 180;
  low.connect(bed).connect(c.destination);
  for (const [hz, level] of [[41.2, 0.5], [41.5, 0.5], [61.7, 0.16]]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = hz ?? 0;
    g.gain.value = level ?? 0;
    o.connect(g).connect(low);
    o.start();
  }
  const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const air = c.createBufferSource();
  air.buffer = noise;
  air.loop = true;
  const g = c.createGain();
  g.gain.value = 0.06;
  air.connect(g).connect(low);
  air.start();
}
/** Moves the bed toward a level, settling with that time constant (s). */
const swell = (level: number, settle: number) => bed?.gain.setTargetAtTime(level, bed.context.currentTime, settle);

// Browsers start audio only inside a tap or key press on the page, so the context starts at the first one.
function audio(): AudioContext | null {
  if (!on || document.hidden || typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  if (near && !bed) {
    hum(ctx);
    swell(REST, 1);
  }
  return ctx;
}

export function play(name: keyof typeof SOUNDS): void {
  const c = audio();
  if (!c) return;
  const out = c.createGain();
  out.gain.value = 0.5;
  out.connect(c.destination);
  for (const [type, from, to, delay, peak, ring] of SOUNDS[name]) {
    const t = c.currentTime + 0.01 + delay;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + Math.min(0.3, ring));
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    osc.connect(amp).connect(out);
    osc.start(t);
    osc.stop(t + ring + 0.05);
  }
}

const sync = () => {
  for (const b of document.querySelectorAll("[data-sound]")) b.setAttribute("aria-pressed", String(on));
};

/** Turns sound on or off, remembered on this device. Call it inside a tap or key press, so the browser lets it play. */
export function setSound(value: boolean): void {
  on = value;
  if (!on) swell(0, 0.2);
  else if (near) swell(REST, 1);
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* not remembered */
  }
  sync();
}

document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element) || !e.target.closest("[data-sound]")) return;
  setSound(!on);
  play("add"); // so the visitor hears what they turned on
});
// pointerup too: on a touch screen a tap's pointerup, not its pointerdown, is what lets a page start sound.
for (const type of ["pointerdown", "pointerup", "keydown"]) addEventListener(type, () => void audio(), { capture: true, passive: true });

const beds = [...document.querySelectorAll("[data-bed]")];
if (beds.length > 0) {
  const seen = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target);
    near = seen.size > 0;
    if (near && on) void audio();
    swell(near && on ? REST : 0, near ? 1 : 0.6);
  });
  beds.forEach((b) => io.observe(b));
  let lastY = scrollY;
  let lastT = performance.now();
  let quiet = 0;
  addEventListener("scroll", () => {
    const now = performance.now();
    const speed = Math.abs(scrollY - lastY) / Math.max(16, now - lastT); // px per ms
    lastY = scrollY;
    lastT = now;
    if (!on || !near || !bed) return;
    swell(Math.min(0.3, REST + speed * 0.12), 0.08);
    clearTimeout(quiet);
    quiet = window.setTimeout(() => swell(REST, 0.8), 140);
  }, { passive: true });
}
document.addEventListener("visibilitychange", () => void (document.hidden ? ctx?.suspend() : on && ctx?.resume()));
sync();
