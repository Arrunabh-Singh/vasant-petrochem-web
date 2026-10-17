import { test } from "node:test";
import assert from "node:assert/strict";
import { copyrightYears } from "../lib/company.ts";

test("copyrightYears is a single year in the founding year and a range after", () => {
  assert.equal(copyrightYears(2025, 2025), "2025");
  assert.equal(copyrightYears(2025, 2026), "2025–2026");
  assert.equal(copyrightYears(2025, 2031), "2025–2031");
});
