import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { company } from "../lib/company.ts";

// VP-LEG-002 acceptance: the phone number, address string and email appear
// only in lib/company.ts (docs and the MNC work order may quote them).
const needles = [
  company.phone.whatsapp,
  company.phone.display,
  company.works.street,
  company.works.postalCode,
  company.email,
];

test("company facts are defined only in lib/company.ts", () => {
  for (const needle of needles) {
    let out = "";
    try {
      out = execFileSync(
        "git",
        ["grep", "-lIF", needle, "--", ".", ":!lib/company.ts", ":!package-lock.json", ":!MNC.md", ":!docs", ":!audit.md", ":!test/company-single-source.test.mts"],
        { encoding: "utf8" },
      );
    } catch {
      // git grep exits 1 when there are no matches — that is the pass case.
    }
    assert.equal(out.trim(), "", `"${needle}" is hardcoded outside lib/company.ts:\n${out}`);
  }
});
