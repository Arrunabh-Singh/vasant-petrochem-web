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
  const gl = canvas?.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  const prog = gl ? compile(gl) : null;
  if (!canvas || !gl || !prog) return;

  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const [uRes, uT, uLevel, uAmp, uTilt] = ["res", "t", "level", "amp", "tilt"].map(u);
  gl.uniform3fv(u("cl"), rgb(el.dataset.light));
  gl.uniform3fv(u("cm"), rgb(el.dataset.mid));
  gl.uniform3fv(u("cd"), rgb(el.dataset.deep));

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
  const goal = (now: number) => {
    if (!scene) return EMPTY + (FULL - EMPTY) * smooth(clamp((now - 200) / 900, 0, 1));
    const r = scene.getBoundingClientRect();
    return LOW + (FULL - LOW) * smooth(clamp(-r.top / Math.max(1, r.height - innerHeight) / 0.8, 0, 1));
  };

  let level = goal(performance.now());
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
    level += (goal(now) - level) * (1 - Math.exp(-dt * 5));
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
