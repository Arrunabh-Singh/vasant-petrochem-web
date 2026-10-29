import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * Every scroll-linked rule writes its timeline and range twice: literally for
 * the browser (WebKit drops a whole `animation-range: var(...)`, which showed
 * every grade at once on iPhones) and as --tl/--ar for islands/scrub.ts.
 * The two copies must never differ.
 */
for (const file of ["film.css", "motion.css"]) {
  test(`${file}: each animation-timeline and animation-range has an identical --tl/--ar beside it`, () => {
    const css = readFileSync(new URL(`../../src/styles/${file}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const pairs = [
      { prop: "animation-timeline", copy: "--tl" },
      { prop: "animation-range", copy: "--ar" },
    ];
    for (const { prop, copy } of pairs) {
      const uses = [...css.matchAll(new RegExp(`(?<![-\\w(])${prop}:\\s*([^;{}()]+(?:\\([^;{}]*\\))?[^;{}]*);`, "g"))];
      assert.ok(uses.length > 0, `${prop} not found`);
      for (const m of uses) {
        // Safari's override back to a time animation (motion.css) is not a scroll-linked rule.
        if (m[1]!.includes("!important")) continue;
        const before = css.slice(Math.max(0, m.index! - 300), m.index);
        const last = [...before.matchAll(new RegExp(`${copy}:\\s*([^;]+);`, "g"))].at(-1);
        assert.equal(last?.[1]?.trim(), m[1]!.trim(), `${prop}: ${m[1]} has no matching ${copy}`);
        assert.ok(!/^var\(/.test(m[1]!.trim()), `${prop} must be literal, not var(): WebKit drops it`);
      }
    }
  });
}

/** Every @keyframes block in a stylesheet, as frames of selector and declarations. */
function keyframes(css: string): Map<string, { keys: string; body: string }[]> {
  const out = new Map<string, { keys: string; body: string }[]>();
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    while (depth > 0 && i < css.length) depth += css[i] === "{" ? 1 : css[i] === "}" ? -1 : 0, i++;
    const frames = [...css.slice(start, i - 1).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((f) => ({ keys: f[1]!.trim(), body: f[2]! }));
    out.set(m[1]!, frames);
  }
  return out;
}

/**
 * Since Safari 26.4, iPhones run scroll-driven animations on the compositor, in
 * step with the finger, but only for properties it can move there. A keyframe
 * that also changes z-index or pointer-events keeps that work on the main
 * thread, so those go in an animation of their own (vp-hit, vp-gone).
 * WebKit bug 327193: a `translate` keyframe that is omitted or `none` is drawn
 * wrongly on iOS 27, so every animation that moves by `translate` names it at
 * both ends.
 */
for (const file of ["film.css", "motion.css"]) {
  const css = readFileSync(new URL(`../../src/styles/${file}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  test(`${file}: keyframes that move never also change z-index or pointer-events`, () => {
    for (const [name, frames] of keyframes(css)) {
      const all = frames.map((f) => f.body).join(";");
      if (!/\b(opacity|transform|translate|scale|rotate|filter)\s*:/.test(all)) continue;
      assert.ok(!/\b(z-index|pointer-events)\s*:/.test(all), `@keyframes ${name} mixes motion with z-index or pointer-events`);
    }
  });
  test(`${file}: every translate animation names both ends, never none`, () => {
    for (const [name, frames] of keyframes(css)) {
      const moving = frames.filter((f) => /\btranslate\s*:/.test(f.body));
      if (moving.length === 0) continue;
      const has = (end: RegExp) => moving.some((f) => f.keys.split(",").some((k) => end.test(k.trim())));
      assert.ok(has(/^(from|0%)$/) && has(/^(to|100%)$/), `@keyframes ${name} must set translate at both ends`);
      assert.ok(!moving.some((f) => /\btranslate\s*:\s*none\b/.test(f.body)), `@keyframes ${name} uses translate: none`);
    }
  });
}

test("film.css: no media query on the screen's height inside the film (a phone's toolbar changes it)", () => {
  const css = readFileSync(new URL("../../src/styles/film.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const heights = [...css.matchAll(/@media[^{]*\b(min|max)-height\s*:\s*(\d+)px/g)].map((m) => `${m[1]}-height: ${m[2]}px`);
  assert.deepEqual(heights, ["min-height: 480px"], "only the film's own gate may test the screen's height; size by @container on the 100svh stage");
});

test("the iOS detector is the same in the stylesheets and the islands", () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  assert.match(read("../../src/lib/film.ts"), /CSS\.supports\("-webkit-touch-callout", "none"\)/);
  for (const file of ["film.css", "motion.css"]) assert.match(read(`../../src/styles/${file}`), /not \(-webkit-touch-callout: none\)/, file);
});

test("film.css: the snap points' plain shares match the film's timing", () => {
  const css = readFileSync(new URL("../../src/styles/film.css", import.meta.url), "utf8");
  const film = css.match(/\.vp-film \{ --n: 1;([^}]*)\}/)?.[1] ?? "";
  const value = (name: string) => Number(film.match(new RegExp(`${name}:\\s*([\\d.]+)%?;`))?.[1]);
  assert.equal(value("--sfn") * 100, value("--scale-from"), "--sfn is --scale-from as a number");
  assert.equal(value("--ssn") * 100, value("--scale-span"), "--ssn is --scale-span as a number");
});
