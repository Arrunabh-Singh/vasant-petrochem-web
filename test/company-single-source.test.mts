import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { company } from "../lib/company.ts";

// VP-LEG-002 acceptance: the phone number, address string and email appear
// only in content/company.json, the single source the hub (lib/company.ts)
// and the public site (site/) both read. Docs and the MNC work order may quote
// them; design-system/ is the brand book's preview data, mirrored from the
// published design system, not something the site renders.
const needles = [
  company.phone.whatsapp,
  company.phone.display,
  company.works.street,
  company.works.postalCode,
  company.email,
];

test("company facts are defined only in content/company.json", () => {
  for (const needle of needles) {
    let out = "";
    try {
      out = execFileSync(
        "git",
        ["grep", "-lIF", needle, "--", ".", ":!content/company.json", ":!package-lock.json", ":!site/package-lock.json", ":!MNC.md", ":!docs", ":!audit.md", ":!design-system", ":!test/company-single-source.test.mts"],
        { encoding: "utf8" },
      );
    } catch {
      // git grep exits 1 when there are no matches — that is the pass case.
    }
    assert.equal(out.trim(), "", `"${needle}" is hardcoded outside content/company.json:\n${out}`);
  }
});
