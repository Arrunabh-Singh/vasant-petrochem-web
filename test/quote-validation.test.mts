import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuoteForm, parseEmail } from "../lib/validate.ts";

const ok = { name: "A Buyer", email: "buyer@example.com", company: "", phone: "", product: "", quantity: "", message: "" };

function fails(over: Record<string, unknown>, pattern: RegExp) {
  const r = parseQuoteForm({ ...ok, ...over });
  assert.equal(r.ok, false, JSON.stringify(over));
  if (!r.ok) assert.match(r.message, pattern);
}

test("a minimal valid enquiry passes and is trimmed", () => {
  const r = parseQuoteForm({ ...ok, name: "  A Buyer  ", quantity: " 20 kL / month " });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.data.name, "A Buyer");
    assert.equal(r.data.quantity, "20 kL / month");
  }
});

test("name and email are required", () => {
  fails({ name: "" }, /required/);
  fails({ name: "   " }, /required/);
  fails({ email: "" }, /required/);
});

test("email must be a real address, not CRLF-injectable", () => {
  fails({ email: "not-an-email" }, /valid email/);
  fails({ email: "a@b" }, /valid email/);
  fails({ email: "a@b.com\r\nBcc: x@evil.test" }, /valid email/);
  fails({ email: `${"a".repeat(320)}@x.com` }, /too long|valid email/);
});

test("HTML is rejected in every free-text field", () => {
  for (const f of ["name", "company", "phone", "product", "quantity", "message"]) {
    const r = parseQuoteForm({ ...ok, [f]: "<script>alert(1)</script>" });
    assert.equal(r.ok, false, f);
  }
  fails({ message: "hello <b>world</b>" }, /HTML/);
  fails({ message: "<!-- x -->" }, /HTML/);
});

test("bare < and > in specs are allowed", () => {
  const r = parseQuoteForm({ ...ok, message: "Need sulphur < 1.8 % wt and flash point > 66 C" });
  assert.ok(r.ok);
});

test("length caps match the database CHECK constraints", () => {
  fails({ name: "n".repeat(201) }, /too long/);
  fails({ company: "c".repeat(201) }, /too long/);
  fails({ product: "p".repeat(201) }, /too long/);
  fails({ quantity: "q".repeat(101) }, /too long/);
  fails({ message: "m".repeat(5001) }, /too long/);
  assert.ok(parseQuoteForm({ ...ok, name: "n".repeat(200), message: "m".repeat(5000) }).ok);
});

test("phone accepts typed formats and rejects junk", () => {
  for (const good of ["+91 98765 43210", "(0731) 2444-0000", "9876543210"]) {
    assert.ok(parseQuoteForm({ ...ok, phone: good }).ok, good);
  }
  fails({ phone: "call me maybe" }, /phone/);
  fails({ phone: "12" }, /phone/);
});

test("control characters are stripped, newlines kept in the message", () => {
  const r = parseQuoteForm({ ...ok, name: "Bu\u0000yer\u0007", message: "line1\nline2" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.data.name, "Buyer");
    assert.equal(r.data.message, "line1\nline2");
  }
});

test("non-string values (e.g. a File part) are rejected, not coerced", () => {
  fails({ name: { not: "a string" } }, /not valid/);
  fails({ message: 42 }, /not valid/);
});

test("parseEmail (TDS gate)", () => {
  assert.deepEqual(parseEmail(" a@b.co "), { ok: true, email: "a@b.co" });
  assert.equal(parseEmail("nope").ok, false);
  assert.equal(parseEmail("").ok, false);
  assert.equal(parseEmail(null).ok, false);
});
