import { test } from "node:test";
import assert from "node:assert/strict";
import { safeOrigin } from "../lib/origin.ts";
import { site } from "../app/content.ts";

test("safeOrigin allows the production site URL", () => {
  const [proto, , host] = site.url.split("/");
  assert.equal(safeOrigin(host, proto.replace(":", "")), site.url);
});

test("safeOrigin allows the Vercel preview mirror", () => {
  assert.equal(safeOrigin("vasant-petrochem-web.vercel.app", "https"), "https://vasant-petrochem-web.vercel.app");
});

test("safeOrigin allows localhost", () => {
  assert.equal(safeOrigin("localhost:3000", "http"), "http://localhost:3000");
});

test("safeOrigin rejects a forged Host header (audit.md M1/M12/M17)", () => {
  assert.equal(safeOrigin("evil.example", "https"), site.url);
});

test("safeOrigin falls back to the production URL when host is missing", () => {
  assert.equal(safeOrigin(null, "https"), site.url);
});

test("safeOrigin rejects a same-domain-looking but different host", () => {
  assert.equal(safeOrigin("vasantpetrochem.com.evil.example", "https"), site.url);
});
