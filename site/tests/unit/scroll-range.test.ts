import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parseRange, rangeOffsets, splitTop } from "../../src/lib/scroll-range.ts";

test("calc() arithmetic over percentages, as the film's slots compute them", () => {
  assert.equal(evaluate("22%"), 22);
  assert.equal(evaluate("calc(22% + 0 * 72% / 8)"), 22);
  assert.equal(evaluate("calc(22% + (0 + 1) * 72% / 8)"), 31);
  assert.equal(evaluate("calc(22% + (2 + .25) * 72% / 8)"), 42.25);
  assert.equal(evaluate("calc(100% - 4%)"), 96);
});

test("a range is two named points; one point runs to its range's end", () => {
  assert.deepEqual(parseRange("contain 15% contain 23%"), [{ name: "contain", pct: 15 }, { name: "contain", pct: 23 }]);
  assert.deepEqual(parseRange("entry 45% entry 85%"), [{ name: "entry", pct: 45 }, { name: "entry", pct: 85 }]);
  assert.deepEqual(parseRange("contain calc(22% + 1 * 72% / 8) contain 40%"), [{ name: "contain", pct: 31 }, { name: "contain", pct: 40 }]);
  assert.deepEqual(parseRange("cover 30%"), [{ name: "cover", pct: 30 }, { name: "cover", pct: 100 }]);
  assert.equal(parseRange("nonsense"), null);
});

test("lists split at top-level commas only", () => {
  assert.deepEqual(splitTop("contain 10% contain 17%, contain calc(94% + 0%) contain 100%"), ["contain 10% contain 17%", "contain calc(94% + 0%) contain 100%"]);
  assert.deepEqual(splitTop(""), []);
});

test("view-progress offsets for a subject taller and shorter than the screen", () => {
  // A 3000px film whose top is at 100px, on an 800px screen: pinned from 100 to 2300.
  assert.deepEqual(rangeOffsets("contain", 100, 3000, 800), [100, 2300]);
  assert.deepEqual(rangeOffsets("cover", 100, 3000, 800), [-700, 3100]);
  // A 200px card at 2000px: enters from 1200, fully in at 1400, leaves from 2000.
  assert.deepEqual(rangeOffsets("entry", 2000, 200, 800), [1200, 1400]);
  assert.deepEqual(rangeOffsets("contain", 2000, 200, 800), [1400, 2000]);
  assert.deepEqual(rangeOffsets("exit", 2000, 200, 800), [2000, 2200]);
});
