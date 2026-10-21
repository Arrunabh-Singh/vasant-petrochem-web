import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTiming, MIN_FILL_MS, verifyTurnstile } from "../../src/server/bot.ts";
import { readForm, readText, sameOrigin, sourcePage } from "../../src/server/http.ts";
import { clientIp, hashIp } from "../../src/server/ip.ts";
import { contentSecurityPolicy, headersFile, securityHeaders, workerHeaders } from "../../src/server/headers.ts";

test("time to submit: too fast, too slow and forged values are refused", () => {
  const now = 1_800_000_000_000;
  assert.equal(checkTiming(String(now - MIN_FILL_MS), now), true);
  assert.equal(checkTiming(String(now - 500), now), false);
  assert.equal(checkTiming(String(now - 25 * 3600_000), now), false);
  assert.equal(checkTiming("abc", now), false);
  assert.equal(checkTiming(undefined, now), false);
});

test("Turnstile is skipped without a secret and fails closed with one", async () => {
  const ok = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  assert.deepEqual(await verifyTurnstile("t", undefined), { ok: true, skipped: true });
  assert.equal((await verifyTurnstile("", "s")).ok, false);
  assert.equal((await verifyTurnstile("t", "s", { fetchImpl: ok({ success: true }) })).ok, true);
  assert.equal((await verifyTurnstile("t", "s", { fetchImpl: ok({ success: false, "error-codes": ["timeout-or-duplicate"] }) })).ok, false);
  assert.equal((await verifyTurnstile("t", "s", { fetchImpl: ok({}, 500) })).ok, false);
  const boom = (async () => {
    throw new Error("network");
  }) as unknown as typeof fetch;
  assert.equal((await verifyTurnstile("t", "s", { fetchImpl: boom })).ok, false);
});

test("the visitor address comes only from Cloudflare's header, and is stored only as a keyed hash", async () => {
  assert.equal(clientIp(new Headers({ "cf-connecting-ip": "203.0.113.7" })), "203.0.113.7");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7" })), null);
  assert.equal(clientIp(new Headers({ "cf-connecting-ip": "1.2.3.4'; drop table" })), null);
  assert.equal(clientIp(new Headers({ "cf-connecting-ip": "2001:db8::1" })), "2001:db8::1");
  const a = await hashIp("203.0.113.7", "k1");
  assert.match(a ?? "", /^[0-9a-f]{64}$/);
  assert.equal(a, await hashIp("203.0.113.7", "k1"));
  assert.notEqual(a, await hashIp("203.0.113.7", "k2"), "a different key gives a different hash");
  assert.equal(await hashIp("203.0.113.7", undefined), null);
});

test("forms are accepted only from this site, within size, as JSON or a form", async () => {
  const req = (headers: Record<string, string>, body = "") => new Request("https://www.vasantpetrochem.com/api/rfq", { method: "POST", headers, body });
  assert.equal(sameOrigin(req({ origin: "https://www.vasantpetrochem.com" })), true);
  assert.equal(sameOrigin(req({ origin: "https://evil.example" })), false);
  assert.equal(sameOrigin(req({})), false, "no Origin, no entry");
  assert.deepEqual(await readForm(req({ "content-type": "application/json" }, '{"a":1}')), { a: 1 });
  assert.deepEqual(await readForm(req({ "content-type": "application/x-www-form-urlencoded" }, "docs=coa&docs=sds&name=A")), { docs: ["coa", "sds"], name: "A" });
  assert.equal(await readForm(req({ "content-type": "application/json" }, "[1]")), null);
  assert.equal(await readForm(req({ "content-type": "text/plain" }, "x")), null);
  assert.equal(await readForm(req({ "content-type": "application/json" }, JSON.stringify({ a: "x".repeat(70_000) }))), null, "over the size cap");
  // A streamed body without Content-Length is cut off at the cap, not read whole.
  let pulled = 0;
  const endless = new ReadableStream({ pull: (c) => void (pulled++ < 1000 ? c.enqueue(new Uint8Array(1024)) : c.close()) });
  const streamed = new Request("https://www.vasantpetrochem.com/api/click", { method: "POST", body: endless, duplex: "half" } as RequestInit);
  assert.equal(await readText(streamed, 2048), null);
  assert.ok(pulled < 10, `stopped reading after ${pulled} chunks`);
  assert.equal(await readText(req({}, "hello"), 2048), "hello");
  assert.equal(sourcePage(req({ referer: "https://www.vasantpetrochem.com/products/base-oil-sn500" })), "/products/base-oil-sn500");
  assert.equal(sourcePage(req({ referer: "https://evil.example/products/x" })), "/quote");
});

test("the strict CSP allows no inline script, eval or framing, and Turnstile only", () => {
  const strict = contentSecurityPolicy(true);
  assert.doesNotMatch(strict, /unsafe-inline|unsafe-eval/);
  assert.match(strict, /frame-ancestors 'none'/);
  assert.match(strict, /object-src 'none'/);
  assert.match(strict, /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.match(contentSecurityPolicy(false), /frame-ancestors 'none'/, "the baseline also forbids framing");
  assert.equal(securityHeaders["Strict-Transport-Security"], "max-age=63072000; includeSubDomains; preload");
  assert.equal(securityHeaders["X-Content-Type-Options"], "nosniff");
  assert.equal(workerHeaders["Cross-Origin-Resource-Policy"], "same-origin", "endpoints are never embedded elsewhere");
  assert.equal(securityHeaders["Cross-Origin-Resource-Policy"], undefined, "the logo and share images stay embeddable");
  const file = headersFile();
  assert.match(file, /^\/\*\n {2}Strict-Transport-Security:/m);
  assert.match(file, /Content-Security-Policy-Report-Only: .*report-uri \/api\/csp-report/);
});

test("only the live host stores and sends; previews and local runs are dry runs", async () => {
  const { isLive } = await import("../../src/server/http.ts");
  assert.equal(isLive(new Request("https://www.vasantpetrochem.com/api/rfq")), true);
  assert.equal(isLive(new Request("https://vasant-site.example.workers.dev/api/rfq")), false);
  assert.equal(isLive(new Request("https://abc123-vasant-site.example.workers.dev/api/rfq")), false);
  assert.equal(isLive(new Request("http://localhost:4321/api/rfq")), false);
  assert.equal(isLive(new Request("https://vasantpetrochem.com/api/rfq")), false, "the apex redirects to www; it never serves forms");
});
