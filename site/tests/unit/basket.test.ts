import { test } from "node:test";
import assert from "node:assert/strict";
import { addLine, decodeLines, encodeLines, MAX_LINES, parseLines, readBasket, removeLine, validLine, writeBasket } from "../../src/islands/basket.ts";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), raw: m };
};

test("a line is validated field by field, never trusted", () => {
  assert.equal(validLine({ slug: "Base Oil" }), null, "slug must be a catalogue slug");
  assert.equal(validLine({ slug: "<script>" }), null);
  assert.deepEqual(validLine({ slug: "base-oil-sn500", qty: "20", unit: "kL", pack: "drum\u0000<b>", notes: "n" }), {
    slug: "base-oil-sn500",
    qty: "20",
    unit: "kL",
    pack: "drumb",
    notes: "n",
  });
  assert.equal(validLine({ slug: "x", qty: "1e9", unit: "barrels" })?.qty, "", "a quantity that is not a plain number is dropped");
  assert.equal(validLine({ slug: "x", unit: "barrels" })?.unit, "MT", "an unknown unit falls back to MT");
});

test("a list keeps each product once and at most 20 products", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ slug: `p-${i}` }));
  assert.equal(parseLines(many).length, MAX_LINES);
  assert.deepEqual(parseLines([{ slug: "a" }, { slug: "a" }, null, "x"]).map((l) => l.slug), ["a"]);
  assert.deepEqual(parseLines("not an array"), []);
});

test("the stored list survives a round trip and ignores anything else in storage", () => {
  const s = memory();
  addLine("base-oil-sn150", s);
  addLine("base-oil-sn150", s);
  addLine("paving-bitumen-vg30", s);
  assert.deepEqual(readBasket(s).map((l) => l.slug), ["base-oil-sn150", "paving-bitumen-vg30"]);
  removeLine("base-oil-sn150", s);
  assert.deepEqual(readBasket(s).map((l) => l.slug), ["paving-bitumen-vg30"]);
  s.raw.set("vp-basket", "{broken");
  assert.deepEqual(readBasket(s), []);
  s.raw.set("vp-basket", JSON.stringify({ v: 2, lines: [{ slug: "a" }] }));
  assert.deepEqual(readBasket(s), [], "an unknown version is ignored");
  writeBasket([{ slug: "a", qty: "1", unit: "MT", pack: "", notes: "" }], null);
});

test("a shared link carries the list, including non-English notes, and rejects garbage", () => {
  const lines = parseLines([{ slug: "base-oil-sn500", qty: "12.5", unit: "kL", pack: "210 L drum" }]);
  assert.deepEqual(decodeLines(encodeLines(lines)), lines.map((l) => ({ ...l, notes: "" })));
  assert.match(encodeLines(lines), /^[A-Za-z0-9_-]+$/, "URL-safe");
  assert.deepEqual(decodeLines(encodeLines(parseLines([{ slug: "a", pack: "ड्रम" }])))[0]?.pack, "ड्रम");
  assert.deepEqual(decodeLines("%%%"), []);
  assert.deepEqual(decodeLines(null), []);
});
