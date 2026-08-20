import { test } from "node:test";
import assert from "node:assert/strict";
import { coerceSpecs, coerceStringArray } from "../lib/validate.ts";

test("coerceSpecs keeps well-formed entries", () => {
  const input = [{ label: "Viscosity", value: "380 cSt" }, { label: "Flash Point", value: ">66°C" }];
  assert.deepEqual(coerceSpecs(input), input);
});

test("coerceSpecs drops malformed entries instead of throwing (audit.md M20)", () => {
  const input = [
    { label: "ok", value: "ok" },
    {}, // missing both fields
    { label: "only label" },
    null,
    "not an object",
    { label: 5, value: "wrong type" },
  ];
  assert.deepEqual(coerceSpecs(input), [{ label: "ok", value: "ok" }]);
});

test("coerceSpecs returns [] for non-array input (NULL from a bad admin paste)", () => {
  assert.deepEqual(coerceSpecs(null), []);
  assert.deepEqual(coerceSpecs(undefined), []);
  assert.deepEqual(coerceSpecs("garbage"), []);
  assert.deepEqual(coerceSpecs({ label: "not", value: "an array" }), []);
});

test("coerceStringArray keeps only string entries", () => {
  assert.deepEqual(coerceStringArray(["Boilers", "Furnaces"]), ["Boilers", "Furnaces"]);
  assert.deepEqual(coerceStringArray(["ok", 5, null, {}]), ["ok"]);
  assert.deepEqual(coerceStringArray(null), []);
});
