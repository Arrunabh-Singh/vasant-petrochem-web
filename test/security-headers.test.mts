import { test } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.ts";

// VP-SEC-001: the response headers every route must carry.
async function headerMap(): Promise<Record<string, string>> {
  const rules = await nextConfig.headers!();
  const all = rules.find((r) => r.source === "/(.*)");
  assert.ok(all, "catch-all header rule exists");
  return Object.fromEntries(all.headers.map((h) => [h.key.toLowerCase(), h.value]));
}

test("HSTS is long-lived, covers subdomains and declares preload eligibility", async () => {
  const hsts = (await headerMap())["strict-transport-security"];
  const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);
  assert.ok(maxAge >= 31536000, hsts);
  assert.match(hsts, /includeSubDomains/);
  assert.match(hsts, /preload/);
});

test("MIME sniffing, referrer, clickjacking and device-permission headers are set", async () => {
  const h = await headerMap();
  assert.equal(h["x-content-type-options"], "nosniff");
  assert.equal(h["referrer-policy"], "strict-origin-when-cross-origin");
  assert.match(h["content-security-policy"], /frame-ancestors 'none'/);
  for (const feature of ["camera", "microphone", "geolocation", "payment"]) {
    assert.match(h["permissions-policy"], new RegExp(`${feature}=\\(\\)`));
  }
});
