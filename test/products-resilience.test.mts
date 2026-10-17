import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://catalog.invalid";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

// Stub the global fetch supabase-js resolves to, returning a PostgREST
// error *response* rather than rejecting: a rejection is a transport
// failure, which the client retries with exponential backoff (~7s per
// call, four attempts) and would make this file the slowest thing in CI
// by two orders of magnitude. A 400 exercises the same
// `if (error) throw` branch in getProducts() with no retry and no socket.
globalThis.fetch = (() =>
  Promise.resolve(
    new Response(
      JSON.stringify({ message: "catalog unavailable", code: "PGRST000", details: null, hint: null }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  )) as typeof fetch;

const { getProducts, getProductsSafe, getCatalog } = await import("../lib/products.ts");

/**
 * Regression guard for the build break. getProducts() throwing on an
 * unreachable catalog is deliberate (audit.md M20), but it was the *only*
 * way to read products, so the footer — which renders on every route —
 * propagated that throw into every statically prerendered page and
 * aborted `next build` outright whenever Postgres was unreachable, which
 * is the normal state in CI and on a first deploy. The two tolerant
 * readers below are what keep the build and the non-catalog pages alive;
 * if either regresses to throwing, the production build breaks again.
 */
test("getProducts still throws when the catalog errors (audit.md M20)", async () => {
  await assert.rejects(getProducts(), /getProducts failed/);
});

test("getProductsSafe degrades to an empty list instead of throwing", async () => {
  assert.deepEqual(await getProductsSafe(), []);
});

test("getCatalog reports degraded:true rather than throwing", async () => {
  assert.deepEqual(await getCatalog(), { products: [], degraded: true });
});
