import assert from "node:assert/strict";
import { test } from "node:test";
import { typeset, withUnit } from "../../src/lib/typeset.ts";

test("ranges, minus signs and comparisons are typeset", () => {
  assert.equal(typeset("9,800-10,200"), "9,800–10,200");
  assert.equal(typeset("2.0 - 3.5"), "2.0–3.5");
  assert.equal(typeset("-6 to -9"), "−6 to −9");
  assert.equal(typeset("≈ 10,300"), "≈ 10,300");
  assert.equal(typeset("< 18"), "< 18");
  assert.equal(typeset("+25 min"), "+25 min");
  assert.equal(typeset("SN-500"), "SN-500");
});

test("a unit never wraps away from its number", () => {
  assert.equal(withUnit("20", "kL"), "20 kL");
  assert.equal(withUnit("Hot"), "Hot");
});
