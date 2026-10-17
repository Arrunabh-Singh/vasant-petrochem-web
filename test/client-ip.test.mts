import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "../lib/client-ip.ts";

const h = (o: Record<string, string>) => new Headers(o);

test("prefers cf-connecting-ip over the Cloudflare edge address in x-forwarded-for", () => {
  assert.equal(clientIp(h({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "172.70.1.1", "x-real-ip": "172.70.1.1" })), "203.0.113.9");
});

test("falls back to x-real-ip then the first x-forwarded-for hop", () => {
  assert.equal(clientIp(h({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "1.1.1.1" })), "198.51.100.4");
  assert.equal(clientIp(h({ "x-forwarded-for": "198.51.100.5, 172.70.1.1" })), "198.51.100.5");
});

test("understands IPv6", () => {
  assert.equal(clientIp(h({ "cf-connecting-ip": "2001:db8::1" })), "2001:db8::1");
});

test("returns null for nothing or for text that is not an IP address", () => {
  assert.equal(clientIp(h({})), null);
  assert.equal(clientIp(h({ "cf-connecting-ip": "<script>alert(1)</script>" })), null);
  assert.equal(clientIp(h({ "cf-connecting-ip": "999.1.1.1", "x-real-ip": "x".repeat(5000) })), null);
});

test("a junk preferred header falls through to a valid one instead of poisoning the key", () => {
  assert.equal(clientIp(h({ "cf-connecting-ip": "not-an-ip", "x-real-ip": "198.51.100.6" })), "198.51.100.6");
});
