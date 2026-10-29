/**
 * Optional sound, composed in the browser with Web Audio: no files, nothing
 * plays until the visitor turns it on with a [data-sound] button, the choice
 * is remembered on this device, and the sound stops while the tab is hidden.
 * play("add") is a soft thud as a grade joins the quote; play("sent") a deep
 * bass note with a bright chime as the request lands.
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
const SOUNDS: Record<"add" | "sent", Voice[]> = {
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
};

// Browsers start audio only inside a tap or key press on the page, so the context starts at the first one.
function audio(): AudioContext | null {
  if (!on || document.hidden || typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
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

document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element) || !e.target.closest("[data-sound]")) return;
  on = !on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* not remembered */
  }
  sync();
  play("add"); // so the visitor hears what they turned on
});
for (const type of ["pointerdown", "keydown"]) addEventListener(type, () => void audio(), { capture: true, passive: true });
document.addEventListener("visibilitychange", () => void (document.hidden ? ctx?.suspend() : on && ctx?.resume()));
sync();
