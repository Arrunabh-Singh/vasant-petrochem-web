/**
 * Real-time liquid inside the drop (components/LiquidDrop.astro). One WebGL
 * triangle covers the drop; its fragment shader draws the liquid below a
 * moving surface, and a CSS mask clips it to the drop's silhouette while the
 * SVG chrome and highlight stay the brand's own artwork.
 *
 * The drop held to the light: the liquid is a body of revolution, the drop's
 * own outline turned about its axis, so every point knows which way it faces.
 * The morning light comes from the north-east, over the reader's right
 * shoulder: a highlight where the glass faces it, a bright rim where the glass
 * turns away from the eye, and the light gathered through the liquid into a
 * warm caustic low on the far side, where the logo's own glint sits. The
 * liquid's top is a disc seen from a little above, a lighter ellipse that
 * climbs the glass at its walls; it rocks with how fast the reader scrolls,
 * and deepens in colour as the design system's liquid gradient does. As each
 * grade pours in, the drop turns a quarter, and the light moving through the
 * liquid turns with it.
 *
 * It starts only after first paint, when motion is welcome, WebGL works and
 * Save-Data is off. It pauses off screen and in hidden tabs, draws at 30 fps
 * on touch screens, and hands back to the SVG liquid if frames are slow in
 * its first second or the GPU drops the context. A drop it won't run in is
 * marked is-off (the opening, islands/intro.ts, stops waiting for it).
 */

import { filmPlays } from "../lib/film.ts";
import { play } from "./sound.ts";

// Drop units, as in lib/drop.ts: x 0..100 across, y 0..176.26 from the tip down.
const H = 176.26;
const FULL = 107.07; // the brand level (LEVEL in lib/drop.ts)
const LOW = 146; // the round base filled as the film opens
const EMPTY = H + 4;

const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
// Drop units throughout: x across, y down from the tip; in 3D, x right, y up, z toward the reader.
// B is where the cone meets the round base, the centre of its circle (radius 50).
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 res;
uniform float t, level, amp, tilt, turn;
uniform vec3 cl, cm, cd;
const float B = 126.26;
const vec3 L = vec3(.621, .661, .421);
const vec3 HV = vec3(.368, .392, .843);
float rad(float y) { return y < B ? 50. * pow(max(y, .01) / B, .92) : sqrt(max(2500. - (y - B) * (y - B), 0.)); }
void main() {
  vec2 d = vec2(gl_FragCoord.x / res.x * 100., (1. - gl_FragCoord.y / res.y) * ${H});
  float x = d.x - 50.;
  float R = max(rad(level), 1.);
  float us = clamp(x / R, -1., 1.);
  float s = level + tilt * x + amp * (sin(d.x * .09 + t * 1.7) + .5 * sin(d.x * .17 - t * 2.3)) + .35 * sin(d.x * .05 + t * .8) - 1.8 * pow(abs(us), 8.);
  float h = .12 * R * sqrt(1. - us * us);
  float a = smoothstep(s - h - .6, s - h + .6, d.y);
  if (a <= 0.) { gl_FragColor = vec4(0.); return; }
  float r = max(rad(d.y), .5);
  float u = clamp(x / r, -.999, .999);
  float z = sqrt(1. - u * u);
  vec3 n = normalize(d.y < B ? vec3(u, .4 - .4 * pow(d.y / B, 49.), z) : vec3(u * r, B - d.y, z * r));
  float k = clamp((d.y - s) / max(${H} - s, 1.), 0., 1.);
  vec3 c = mix(cl, cm, smoothstep(0., .08, k));
  c = mix(c, cl, smoothstep(.08, .33, k));
  c = mix(c, cm, smoothstep(.33, .58, k));
  c = mix(c, cd, smoothstep(.58, .84, k));
  c *= .8 + .3 * dot(n, L);
  c = mix(c, cd, .35 * smoothstep(.6, 1., abs(u)));
  c += .28 * cl * smoothstep(.45, .95, -.6 * n.x - .8 * n.y);
  float f = asin(u) + turn;
  c += .05 * sin(3. * f + t * .5 + 2. * sin(d.y * .13 - t * .6)) * sin(d.y * .17 + 2. * f + t * .7);
  vec3 top = mix(mix(cl, vec3(1.), .55), cl, .6 * clamp((d.y - s + h) / max(2. * h, .01), 0., 1.));
  c = mix(top, c, smoothstep(s + h - .6, s + h + .6, d.y));
  c = mix(c, vec3(1.), .32 * (1. - smoothstep(0., 2.2, abs(d.y - s - h))));
  c = mix(c, vec3(1.), .45 * pow(1. - n.z, 4.));
  float g = max(dot(n, HV), 0.);
  c += .3 * pow(g, 24.) + .7 * pow(g, 240.);
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
  if (!canvas || !gl || !prog) return void el.classList.add("is-off");

  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const [uRes, uT, uLevel, uAmp, uTilt, uTurn, uCl, uCm, uCd] = ["res", "t", "level", "amp", "tilt", "turn", "cl", "cm", "cd"].map(u);
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
  // Where the film is on the scale, as k + t: grade k holds through its slot, blending in from the one before over the slot's first quarter.
  const place = (p: number) => {
    const x = ((p - from) / span) * scale.length;
    if (scale.length === 0 || x <= 0) return 0;
    const k = Math.min(scale.length - 1, Math.floor(x));
    return k + smooth(clamp((x - k) / 0.25, 0, 1));
  };
  const shade = (g: number): number[][] => {
    const k = Math.ceil(g) - 1;
    if (k < 0) return own;
    const prev = k === 0 ? own : (scale[k - 1] ?? own);
    const next = scale[k] ?? own;
    return prev.map((c, i) => c.map((v, j) => v + ((next[i]?.[j] ?? v) - v) * (g - k)));
  };

  let level = goal(performance.now(), progress());
  let energy = 0;
  let tilt = 0;
  let turn = 0; // a quarter-turn for each grade poured in
  let poured: number | null = null; // the grade pouring in, from the first frame on
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
    if (scale.length > 0) {
      const g = place(p);
      paint(shade(g));
      turn += ((g * Math.PI) / 2 - turn) * (1 - Math.exp(-dt * 4));
      const k = Math.ceil(g) - 1;
      if (poured !== null && k !== poured) play("pour");
      poured = k;
    }
    energy = Math.min(3, energy * Math.exp(-dt * 1.4) + Math.abs(level - was) * 0.08 + Math.abs(dy) * 0.004);
    tilt += (clamp(dy * 0.002, -0.05, 0.05) - tilt) * (1 - Math.exp(-dt * 3));
    gl.uniform1f(uT ?? null, (now / 1000) % 1000);
    gl.uniform1f(uLevel ?? null, level);
    gl.uniform1f(uAmp ?? null, 0.35 + energy);
    gl.uniform1f(uTilt ?? null, tilt);
    gl.uniform1f(uTurn ?? null, turn);
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
    el.classList.add("is-off");
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
} else for (const el of drops) el.classList.add("is-off");

export {};
