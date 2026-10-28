/**
 * Real-time liquid inside the drop (components/LiquidDrop.astro). One WebGL
 * triangle covers the drop; its fragment shader draws the liquid below a
 * moving surface, and a CSS mask clips it to the drop's silhouette while the
 * SVG chrome and highlight stay the brand's own artwork.
 *
 * It starts only after first paint, when motion is welcome, WebGL works and
 * Save-Data is off. It pauses off screen and in hidden tabs, draws at 30 fps
 * on touch screens, and hands back to the SVG liquid if frames are slow in
 * its first second or the GPU drops the context.
 */

import { filmPlays } from "../lib/film.ts";

// Drop units, as in lib/drop.ts: x 0..100 across, y 0..176.26 from the tip down.
const H = 176.26;
const FULL = 107.07; // the brand level (LEVEL in lib/drop.ts)
const LOW = 146; // the round base filled as the film opens
const EMPTY = H + 4;

const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
// The surface is the level plus two slow waves whose height grows with the slosh;
// below it, the design system's liquid gradient, a caustic shimmer, darker edges
// where the drop curves away, and a meniscus line.
const FRAG = `precision mediump float;
uniform vec2 res;
uniform float t, level, amp, tilt;
uniform vec3 cl, cm, cd;
void main() {
  vec2 d = vec2(gl_FragCoord.x / res.x * 100., (1. - gl_FragCoord.y / res.y) * ${H});
  float s = level + tilt * (d.x - 50.) + amp * (sin(d.x * .09 + t * 1.7) + .5 * sin(d.x * .17 - t * 2.3)) + .35 * sin(d.x * .05 + t * .8);
  float a = smoothstep(s - .6, s + .6, d.y);
  if (a <= 0.) { gl_FragColor = vec4(0.); return; }
  float k = clamp((d.y - s) / max(${H} - s, 1.), 0., 1.);
  vec3 c = mix(cl, cm, smoothstep(0., .08, k));
  c = mix(c, cl, smoothstep(.08, .33, k));
  c = mix(c, cm, smoothstep(.33, .58, k));
  c = mix(c, cd, smoothstep(.58, .84, k));
  c += .045 * sin(d.x * .21 + t * .9 + 2. * sin(d.y * .13 - t * .6)) * sin(d.y * .17 + t * .7);
  c = mix(c, cd, .3 * smoothstep(30., 50., abs(d.x - 50.)));
  c = mix(c, vec3(1.), .32 * (1. - smoothstep(0., 2.2, d.y - s)));
  gl_FragColor = vec4(c * a, a);
}`;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (x: number) => x * x * (3 - 2 * x);
const rgb = (hex = "#000000") => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
/** components/LiquidDrop.astro's `data-scale`: [light, mid, deep] hex per grade. */
const parseScale = (json = "[]"): number[][][] => {
  try {
    return (JSON.parse(json) as string[][]).map((c) => c.map((hex) => rgb(hex)));
  } catch {
    return [];
  }
};

function compile(gl: WebGLRenderingContext): WebGLProgram | null {
  const prog = gl.createProgram();
  if (!prog) return null;
  for (const [type, src] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, FRAG],
  ] as const) {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null;
}

function start(el: HTMLElement) {
  const canvas = el.querySelector("canvas");
  // No context where WebGL would run in software (no GPU, or a blocklisted one): the CSS liquid stays.
  const gl = canvas?.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
  const prog = gl ? compile(gl) : null;
  if (!canvas || !gl || !prog) return;

  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const [uRes, uT, uLevel, uAmp, uTilt, uCl, uCm, uCd] = ["res", "t", "level", "amp", "tilt", "cl", "cm", "cd"].map(u);
  const own = [rgb(el.dataset.light), rgb(el.dataset.mid), rgb(el.dataset.deep)];
  const paint = ([l, m, d]: number[][]) => {
    gl.uniform3fv(uCl ?? null, l ?? []);
    gl.uniform3fv(uCm ?? null, m ?? []);
    gl.uniform3fv(uCd ?? null, d ?? []);
  };
  paint(own);

  const touch = matchMedia("(pointer: coarse)").matches;
  const dpr = Math.min(devicePixelRatio || 1, touch ? 1.5 : 2);
  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes ?? null, canvas.width, canvas.height);
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  // Where the surface should be: on the home film it follows the opening
  // scene's scroll (as the CSS fallback does); elsewhere it fills once, in
  // step with the SVG drop's own fill as the page opens.
  const scene = el.dataset.liquid === "scroll" ? el.closest<HTMLElement>("[data-fill-scene]") : null;
  // The scene's timing comes from its own CSS (styles/film.css), so the film and the liquid never drift.
  const css = scene ? getComputedStyle(scene) : null;
  const pct = (name: string, fallback: number) => {
    const v = parseFloat(css?.getPropertyValue(name) ?? "");
    return Number.isFinite(v) ? v / 100 : fallback;
  };
  const fillEnd = pct("--fill-end", 0.8);
  const from = pct("--scale-from", 0);
  const span = pct("--scale-span", 1);
  // The colour scale the film plays (each grade's light, mid and deep), only where the film itself runs.
  const scale = scene && filmPlays() ? parseScale(el.dataset.scale) : [];
  // Scroll through the scene's pinned stretch, 0 to 1: CSS's `contain` range.
  // Measured on resize, not every frame, so a frame never forces a layout.
  let sceneTop = 0;
  let sceneSpan = 1;
  const measure = () => {
    if (!scene) return;
    const r = scene.getBoundingClientRect();
    sceneTop = r.top + scrollY;
    sceneSpan = Math.max(1, r.height - innerHeight);
  };
  measure();
  if (scene) {
    addEventListener("resize", measure);
    new ResizeObserver(measure).observe(scene);
  }
  const progress = () => (scene ? (scrollY - sceneTop) / sceneSpan : 0);
  const goal = (now: number, p: number) =>
    scene ? LOW + (FULL - LOW) * smooth(clamp(p / fillEnd, 0, 1)) : EMPTY + (FULL - EMPTY) * smooth(clamp((now - 200) / 900, 0, 1));
  // Grade k holds through its slot of the scale, blending in from the one before over the slot's first quarter.
  const shade = (p: number): number[][] => {
    const n = scale.length;
    const x = ((p - from) / span) * n;
    if (n === 0 || x <= 0) return own;
    const k = Math.min(n - 1, Math.floor(x));
    const prev = k === 0 ? own : (scale[k - 1] ?? own);
    const next = scale[k] ?? own;
    const t = smooth(clamp((x - k) / 0.25, 0, 1));
    return prev.map((c, i) => c.map((v, j) => v + ((next[i]?.[j] ?? v) - v) * t));
  };

  let level = goal(performance.now(), progress());
  let energy = 0;
  let tilt = 0;
  let lastY = scrollY;
  let drawn = 0;
  let prev = 0;
  let ticks = 0;
  let total = 0;
  let raf = 0;
  let onScreen = true;
  let stopped = false;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    // Watchdog: if the first second averages under ~40 fps, the SVG liquid is the better drop here.
    if (ticks < 60) {
      total += now - prev;
      if (++ticks === 60 && total / 60 > 24) return stop();
    }
    prev = now;
    if (touch && now - drawn < 30) return;
    const dt = Math.min(0.05, (now - drawn) / 1000);
    drawn = now;
    const dy = scrollY - lastY;
    lastY = scrollY;
    const was = level;
    const p = progress();
    level += (goal(now, p) - level) * (1 - Math.exp(-dt * 5));
    if (scale.length > 0) paint(shade(p));
    energy = Math.min(3, energy * Math.exp(-dt * 1.4) + Math.abs(level - was) * 0.08 + Math.abs(dy) * 0.004);
    tilt += (clamp(dy * 0.002, -0.05, 0.05) - tilt) * (1 - Math.exp(-dt * 3));
    gl.uniform1f(uT ?? null, (now / 1000) % 1000);
    gl.uniform1f(uLevel ?? null, level);
    gl.uniform1f(uAmp ?? null, 0.35 + energy);
    gl.uniform1f(uTilt ?? null, tilt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    el.classList.add("is-live");
  };
  const run = (on: boolean) => {
    if (on && !raf && !stopped) {
      prev = drawn = performance.now();
      lastY = scrollY;
      raf = requestAnimationFrame(frame);
    } else if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  function stop() {
    run(false);
    stopped = true;
    el.classList.remove("is-live");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stop();
  });
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    run(onScreen && !document.hidden);
  }).observe(el);
  document.addEventListener("visibilitychange", () => run(onScreen && !document.hidden));
}

const drops = [...document.querySelectorAll<HTMLElement>("[data-liquid]")];
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
if (drops.length > 0 && !saveData && matchMedia("(prefers-reduced-motion: no-preference)").matches) {
  const go = () => drops.forEach(start);
  if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 1500 });
  else setTimeout(go, 300);
}

export {};
