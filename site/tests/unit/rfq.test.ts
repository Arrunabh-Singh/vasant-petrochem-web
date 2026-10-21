import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRfq } from "../../src/server/rfq.ts";

const catalog = [
  { slug: "base-oil-sn500", name: "Base Oil SN500", code: "SN-500" },
  { slug: "paving-bitumen-vg30", name: "Paving Bitumen VG30", code: "VG-30" },
];
const base = { type: "quote", name: "Asha Rao", email: "asha@example.com" };
const lines = (n: number, slug = "base-oil-sn500") => JSON.stringify(Array.from({ length: n }, () => ({ slug, qty: "20", unit: "MT", pack: "", notes: "" })));

test("a quote list becomes one enquiry with resolved product names", () => {
  const r = parseRfq({ ...base, lines: JSON.stringify([{ slug: "base-oil-sn500", qty: "20", unit: "MT", pack: "210 L drum", notes: "" }, { slug: "paving-bitumen-vg30", qty: "5", unit: "kL", pack: "", notes: "" }]), docs: ["coa", "sds"] }, catalog, false);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.enquiry.lines.length, 2);
  assert.equal(r.enquiry.product_label, "Base Oil SN500 (SN-500), Paving Bitumen VG30 (VG-30)");
  assert.equal(r.enquiry.quantity, "20 MT SN-500, 5 kL VG-30");
  assert.match(r.enquiry.message, /^Price quote\./);
  assert.match(r.enquiry.message, /Documents wanted: certificate of analysis, SDS/);
});

test("anything outside the contract is refused with a field message", () => {
  const err = (raw: Record<string, unknown>, exportsOn = false) => {
    const r = parseRfq({ ...base, ...raw }, catalog, exportsOn);
    return r.ok ? null : r.errors;
  };
  assert.ok(err({ lines: lines(1, "not-in-catalogue") })?.products_text, "unknown product");
  assert.ok(err({ lines: lines(21) })?.lines, "more than 20 products");
  assert.ok(err({ lines: "{not json" })?.lines);
  assert.ok(err({ products_text: "", lines: "" })?.products_text, "an enquiry must ask for something");
  assert.ok(err({ type: "source", lines: lines(1) })?.product_text, "sourcing needs the grade");
  assert.ok(err({ type: "bribe", lines: lines(1) })?.type);
  assert.ok(err({ email: "not-an-email", lines: lines(1) })?.email);
  assert.ok(err({ message: "<a href=x>hi</a>", lines: lines(1) })?.message, "no HTML");
  assert.ok(err({ required_by: "1999-01-01", lines: lines(1) })?.required_by);
  assert.ok(err({ delivery_country: "UAE", lines: lines(1) })?.delivery_country, "no export enquiries without an IEC");
  assert.equal(err({ delivery_country: "UAE", lines: lines(1) }, true), null, "export fields allowed once exports are on");
  assert.ok(err({ offer_ref: "not-a-uuid", lines: lines(1) })?.offer_ref);
  assert.equal(err({ message: "Sulphur < 1.8 % wt", lines: lines(1) }), null, "a bare < is fine");
});

test("a duplicated product is counted once", () => {
  const r = parseRfq({ ...base, lines: lines(3) }, catalog, false);
  assert.ok(r.ok && r.enquiry.lines.length === 1);
});
