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
        const before = css.slice(Math.max(0, m.index! - 300), m.index);
        const last = [...before.matchAll(new RegExp(`${copy}:\\s*([^;]+);`, "g"))].at(-1);
        assert.equal(last?.[1]?.trim(), m[1]!.trim(), `${prop}: ${m[1]} has no matching ${copy}`);
        assert.ok(!/^var\(/.test(m[1]!.trim()), `${prop} must be literal, not var(): WebKit drops it`);
      }
    }
  });
}
