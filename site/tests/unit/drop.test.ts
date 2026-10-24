import assert from "node:assert/strict";
import { test } from "node:test";
import { byColour } from "../../src/lib/drop.ts";

test("byColour orders grades lightest to darkest and keeps catalogue order within a tint", () => {
  const g = (id: string, tint: "clear" | "white" | "straw" | "gold" | "amber" | "brown" | "fuel" | "bitumen") => ({ id, data: { tint } });
  const sorted = byColour([g("vg30", "bitumen"), g("sn500", "gold"), g("mto", "clear"), g("ifo", "fuel"), g("sn150", "straw"), g("gold-b", "gold")]);
  assert.deepEqual(sorted.map((p) => p.id), ["mto", "sn150", "sn500", "gold-b", "ifo", "vg30"]);
});
