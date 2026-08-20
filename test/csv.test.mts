import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsvValue } from "../lib/csv.ts";

test("toCsvValue prefixes a formula-injection payload with an apostrophe (audit.md M9)", () => {
  assert.equal(toCsvValue("=HYPERLINK(\"http://evil.example\")"), `"'=HYPERLINK(""http://evil.example"")"`);
});

test("toCsvValue escapes each dangerous leading character", () => {
  for (const prefix of ["=", "+", "-", "@"]) {
    const input = `${prefix}SUM(A1:A9)`;
    const out = toCsvValue(input);
    assert.ok(out.startsWith(`"'${prefix}`), `expected ${out} to start with "'${prefix}`);
  }
});

test("toCsvValue leaves ordinary values untouched (besides quoting)", () => {
  assert.equal(toCsvValue("Acme Industries"), `"Acme Industries"`);
});

test("toCsvValue escapes embedded double quotes", () => {
  assert.equal(toCsvValue('Say "hello"'), `"Say ""hello"""`);
});

test("a leading minus in an ordinary negative-looking string is still escaped (safe default)", () => {
  assert.equal(toCsvValue("-500 units"), `"'-500 units"`);
});
