import { test } from "node:test";
import assert from "node:assert/strict";
import type { AstroCookies } from "astro";
import { account, claimsOf, COOKIE, IDLE_SECONDS, MAX_SECONDS, needsMfa, refusal, safeNext, signedInAt, type Me } from "../../src/server/portal.ts";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (claims: Record<string, unknown>) => `${b64({ alg: "ES256" })}.${b64(claims)}.sig`;
const NOW = 1_800_000_000;
const token = (over: Record<string, unknown> = {}) =>
  jwt({ exp: NOW + 3600, email: "Buyer@Acme.example", aal: "aal1", session_id: "s1", amr: [{ method: "otp", timestamp: NOW - 60 }], ...over });

class Jar {
  m = new Map<string, string>();
  get(k: string) {
    const v = this.m.get(k);
    return v === undefined ? undefined : { value: v };
  }
  set(k: string, v: string) {
    this.m.set(k, v);
  }
  delete(k: string) {
    this.m.delete(k);
  }
}
const jar = (s?: { a: string; r: string; t: number }) => {
  const j = new Jar();
  if (s) j.set(COOKIE, JSON.stringify(s));
  return j;
};
const me = (over: Partial<Me> = {}): Me => ({
  email: "buyer@acme.example", role: "buyer", mfa: false,
  org: { id: "o1", name: "Acme", country: "AE", status: "approved", cleared: true }, ...over,
});
const live = new Request("https://www.vasantpetrochem.com/account");

/** A Supabase stand-in: answers portal_me, the refresh grant and sign-out, and records the calls. */
function supabase(member: Me | null, refreshed = token({ exp: NOW + 7200 })) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string | URL) => {
    const path = String(url).replace("https://db.example", "");
    calls.push(path);
    const body = path.startsWith("/rest/v1/rpc/portal_me") ? member
      : path.startsWith("/auth/v1/token") ? { access_token: refreshed, refresh_token: "r2" }
      : {};
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { cfg: { url: "https://db.example", key: "pk", fetchImpl }, calls };
}

test("a token's claims are read, its email in lower case", () => {
  const c = claimsOf(token());
  assert.equal(c?.email, "buyer@acme.example");
  assert.equal(c?.sid, "s1");
  assert.equal(signedInAt(c!), NOW - 60);
  assert.equal(claimsOf("not.a-token"), null);
});

test("admins and finance always need the authenticator app; others once they set it up", () => {
  const aal1 = claimsOf(token())!;
  const aal2 = claimsOf(token({ aal: "aal2" }))!;
  assert.equal(needsMfa(me({ role: "admin" }), aal1), true);
  assert.equal(needsMfa(me({ role: "finance" }), aal1), true);
  assert.equal(needsMfa(me({ role: "buyer" }), aal1), false);
  assert.equal(needsMfa(me({ role: "buyer", mfa: true }), aal1), true);
  assert.equal(needsMfa(me({ role: "admin" }), aal2), false);
});

test("only paths inside the account are followed after signing in", () => {
  assert.equal(safeNext("/account/quotations/3f0c0d6e-1111-2222-3333-444455556666"), "/account/quotations/3f0c0d6e-1111-2222-3333-444455556666");
  assert.equal(safeNext("https://evil.example/account"), "/account");
  assert.equal(safeNext("//evil.example"), "/account");
  assert.equal(safeNext("/account//evil.example"), "/account");
  assert.equal(safeNext("/account/x?y=1"), "/account");
  assert.equal(safeNext(undefined), "/account");
});

test("a refusal sends the buyer to sign in again, to the app, or back with a message", () => {
  assert.equal(refusal({ status: 403, hint: "reauth" }, "/account/team").headers.get("location"), "/account/confirm?next=%2Faccount%2Fteam");
  assert.equal(refusal({ status: 403, hint: "mfa" }, "/account/team").headers.get("location"), "/account/mfa?next=%2Faccount%2Fteam");
  assert.equal(refusal({ status: 403, hint: "verification" }, "/account/q", { verification: "verification" }).headers.get("location"), "/account/q?m=verification");
  assert.equal(refusal({ status: 403 }, "/account/q").headers.get("location"), "/account/q?m=not-allowed");
  assert.equal(refusal({ status: 500 }, "/account/q").headers.get("location"), "/account/q?m=error");
});

test("signed in: the member, and the idle clock moves", async () => {
  const { cfg } = supabase(me());
  const cookies = jar({ a: token(), r: "r1", t: NOW - 100 });
  const a = await account(cfg, cookies as unknown as AstroCookies, live, NOW);
  assert.equal(a.state, "in");
  assert.equal(JSON.parse(cookies.get(COOKIE)!.value).t, NOW);
});

test("an admin without the app is sent to it", async () => {
  const { cfg } = supabase(me({ role: "admin" }));
  const a = await account(cfg, jar({ a: token(), r: "r1", t: NOW }) as unknown as AstroCookies, live, NOW);
  assert.equal(a.state, "mfa");
});

test("12 hours idle, or 7 days from signing in, ends the session", async () => {
  const idle = supabase(me());
  const cookies = jar({ a: token(), r: "r1", t: NOW - IDLE_SECONDS - 1 });
  assert.deepEqual(await account(idle.cfg, cookies as unknown as AstroCookies, live, NOW), { state: "out", ended: "idle" });
  assert.equal(cookies.get(COOKIE), undefined);
  assert.ok(idle.calls.some((c) => c.startsWith("/auth/v1/logout")), "the session is ended at Supabase too");

  const old = supabase(me());
  const longAgo = token({ amr: [{ method: "otp", timestamp: NOW - MAX_SECONDS - 1 }] });
  assert.deepEqual(await account(old.cfg, jar({ a: longAgo, r: "r1", t: NOW }) as unknown as AstroCookies, live, NOW), { state: "out", ended: "expired" });
});

test("a token about to expire is refreshed", async () => {
  const { cfg, calls } = supabase(me());
  const cookies = jar({ a: token({ exp: NOW + 30 }), r: "r1", t: NOW });
  const a = await account(cfg, cookies as unknown as AstroCookies, live, NOW);
  assert.equal(a.state, "in");
  assert.ok(calls.some((c) => c.startsWith("/auth/v1/token")));
  assert.equal(JSON.parse(cookies.get(COOKIE)!.value).r, "r2");
});

test("signed in but no longer a member", async () => {
  const { cfg } = supabase(null);
  const a = await account(cfg, jar({ a: token(), r: "r1", t: NOW }) as unknown as AstroCookies, live, NOW);
  assert.equal(a.state, "none");
});

test("previews never sign anyone in", async () => {
  const { cfg } = supabase(me());
  const preview = new Request("https://feature.vasant-site.workers.dev/account");
  assert.deepEqual(await account(cfg, jar({ a: token(), r: "r1", t: NOW }) as unknown as AstroCookies, preview, NOW), { state: "off" });
});
