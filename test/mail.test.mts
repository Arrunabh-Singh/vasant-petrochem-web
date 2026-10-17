import { test } from "node:test";
import assert from "node:assert/strict";
import { sendEmail, salesDeskEmail, oneLine, type Enquiry } from "../lib/mail.ts";

const enquiry: Enquiry = {
  reference: "VP-ENQ-202610-0007",
  name: "A Buyer",
  email: "buyer@example.com",
  company: "ABC Industries",
  phone: "+91 98765 43210",
  product: "Base Oil SN500 (SN-500)",
  quantity: "20 kL / month",
  message: "Need delivery to Pithampur.",
  sourcePage: "/contact",
};

test("sales-desk email carries the reference, every field, and replies to the buyer", () => {
  const m = salesDeskEmail(enquiry);
  assert.equal(m.subject, "New enquiry VP-ENQ-202610-0007 — Base Oil SN500 (SN-500)");
  assert.equal(m.replyTo, "buyer@example.com");
  for (const v of ["VP-ENQ-202610-0007", "A Buyer", "ABC Industries", "buyer@example.com", "+91 98765 43210", "20 kL / month", "/contact", "Need delivery to Pithampur."]) {
    assert.ok(m.text.includes(v), v);
  }
});

test("a missing reference or product degrades gracefully", () => {
  const m = salesDeskEmail({ ...enquiry, reference: undefined, product: "", company: "", message: "" });
  assert.equal(m.subject, "New enquiry");
  assert.match(m.text, /Company: —/);
});

test("header values can never be split into extra headers", () => {
  assert.equal(oneLine("a\r\nBcc: evil@example.com"), "a Bcc: evil@example.com");
  const m = salesDeskEmail({ ...enquiry, reference: "X\r\nBcc: evil@example.com" });
  assert.ok(!/[\r\n]/.test(oneLine(m.subject)));
});

test("sendEmail is skipped, not guessed, without an API key or sender", async () => {
  const boom = (async () => { throw new Error("must not be called"); }) as unknown as typeof fetch;
  assert.deepEqual(
    await sendEmail({ to: "a@b.co", subject: "s", text: "t" }, { apiKey: "", from: "x@y.co", fetchImpl: boom }),
    { ok: false, skipped: true, reason: "RESEND_API_KEY / MAIL_FROM not set" },
  );
  assert.equal((await sendEmail({ to: "a@b.co", subject: "s", text: "t" }, { apiKey: "k", from: "", fetchImpl: boom })).ok, false);
});

test("sendEmail posts the right payload to Resend and reports success/failure", async () => {
  let seen: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | undefined;
  const ok = (async (url: string, init: RequestInit) => {
    seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  const r = await sendEmail({ to: "desk@example.com", subject: "Hi\r\nBcc: x@y.co", text: "body", replyTo: "buyer@example.com" }, { apiKey: "key", from: "Vasant <enq@example.com>", fetchImpl: ok });
  assert.deepEqual(r, { ok: true });
  assert.equal(seen?.url, "https://api.resend.com/emails");
  assert.equal(seen?.headers.Authorization, "Bearer key");
  assert.deepEqual(seen?.body, { from: "Vasant <enq@example.com>", to: ["desk@example.com"], subject: "Hi Bcc: x@y.co", text: "body", reply_to: "buyer@example.com" });

  const fail = (async () => new Response("{}", { status: 422 })) as unknown as typeof fetch;
  assert.deepEqual(await sendEmail({ to: "a@b.co", subject: "s", text: "t" }, { apiKey: "k", from: "f@y.co", fetchImpl: fail }), { ok: false, reason: "Resend HTTP 422" });
  const down = (async () => { throw new Error("network"); }) as unknown as typeof fetch;
  assert.equal((await sendEmail({ to: "a@b.co", subject: "s", text: "t" }, { apiKey: "k", from: "f@y.co", fetchImpl: down })).ok, false);
});
