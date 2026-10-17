import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTiming, verifyTurnstile, botCheck, MIN_FILL_MS, MAX_FILL_MS } from "../lib/bot-defence.ts";

const NOW = 1_800_000_000_000;

test("checkTiming rejects missing, malformed, too-fast, future and stale values", () => {
  assert.equal(checkTiming(undefined, NOW), false);
  assert.equal(checkTiming(null, NOW), false);
  assert.equal(checkTiming("", NOW), false);
  assert.equal(checkTiming("abc", NOW), false);
  assert.equal(checkTiming(String(NOW - (MIN_FILL_MS - 1)), NOW), false); // too fast
  assert.equal(checkTiming(String(NOW + 60_000), NOW), false); // from the future
  assert.equal(checkTiming(String(NOW - (MAX_FILL_MS + 1)), NOW), false); // stale
});

test("checkTiming accepts a plausible human fill time", () => {
  assert.equal(checkTiming(String(NOW - MIN_FILL_MS), NOW), true);
  assert.equal(checkTiming(String(NOW - 45_000), NOW), true);
  assert.equal(checkTiming(String(NOW - MAX_FILL_MS), NOW), true);
});

const siteverify = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test("verifyTurnstile is skipped (documented gap) when no secret is configured", async () => {
  assert.deepEqual(await verifyTurnstile(undefined, { secret: "" }), { ok: true, skipped: true });
});

test("verifyTurnstile rejects a missing or oversized token when a secret is configured", async () => {
  const fetchImpl = (async () => { throw new Error("must not call siteverify"); }) as unknown as typeof fetch;
  for (const token of [undefined, null, "", 42, "x".repeat(2049)]) {
    const r = await verifyTurnstile(token, { secret: "s", fetchImpl });
    assert.equal(r.ok, false, String(token));
  }
});

test("verifyTurnstile accepts only an explicit success from Cloudflare", async () => {
  assert.deepEqual(await verifyTurnstile("tok", { secret: "s", fetchImpl: siteverify({ success: true }) }), { ok: true });
  const bad = await verifyTurnstile("tok", { secret: "s", fetchImpl: siteverify({ success: false, "error-codes": ["invalid-input-response"] }) });
  assert.deepEqual(bad, { ok: false, reason: "invalid-input-response" });
  assert.equal((await verifyTurnstile("tok", { secret: "s", fetchImpl: siteverify({ success: "true" }) })).ok, false);
});

test("verifyTurnstile fails closed on a Cloudflare error or network failure", async () => {
  assert.equal((await verifyTurnstile("tok", { secret: "s", fetchImpl: siteverify({}, 500) })).ok, false);
  const boom = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
  assert.equal((await verifyTurnstile("tok", { secret: "s", fetchImpl: boom })).ok, false);
});

test("verifyTurnstile posts the secret and token to the siteverify endpoint", async () => {
  let seen: { url: string; body: string } | undefined;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    seen = { url, body: String(init.body) };
    return new Response(JSON.stringify({ success: true }));
  }) as unknown as typeof fetch;
  await verifyTurnstile("tok123", { secret: "sec456", fetchImpl });
  assert.equal(seen?.url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.match(seen!.body, /secret=sec456/);
  assert.match(seen!.body, /response=tok123/);
});

test("botCheck blocks a form with no startedAt (a scripted POST) before anything else", async () => {
  const fd = new FormData();
  fd.set("name", "bot");
  assert.match((await botCheck(fd)) ?? "", /quick/);
});

test("botCheck passes a slow-enough form when Turnstile is not configured", async () => {
  const saved = process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  try {
    const fd = new FormData();
    fd.set("startedAt", String(Date.now() - 10_000));
    assert.equal(await botCheck(fd), null);
  } finally {
    if (saved !== undefined) process.env.TURNSTILE_SECRET_KEY = saved;
  }
});

test("botCheck blocks a scripted POST without a Turnstile token once a secret is configured", async () => {
  const saved = process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_SECRET_KEY = "configured";
  try {
    const fd = new FormData();
    fd.set("startedAt", String(Date.now() - 10_000)); // forged timing is not enough
    assert.match((await botCheck(fd)) ?? "", /verify you're human/);
  } finally {
    if (saved === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = saved;
  }
});
