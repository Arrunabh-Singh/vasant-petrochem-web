/**
 * The buyer portal's server side (Release 2, ADR-0003). The Worker still holds
 * only the publishable key: every call carries the buyer's own token, and the
 * database's portal_* functions decide what they may see or do.
 *
 * The session is one httpOnly cookie with the buyer's Supabase tokens and the
 * time of their last request. It ends after 12 hours without a request, or 7
 * days after signing in, read from the token's own `amr` time (Supabase signs
 * it, so it cannot be moved).
 */
import type { AstroCookies } from "astro";
import { isLive, seeOther } from "./http.ts";

export type Cfg = { url?: string | undefined; key?: string | undefined; fetchImpl?: typeof fetch };

export const COOKIE = "__Host-vp-account";
export const IDLE_SECONDS = 12 * 3600;
export const MAX_SECONDS = 7 * 86400;

/** a: access token, r: refresh token, t: last request (epoch seconds). */
export type Session = { a: string; r: string; t: number };
export type Claims = { exp: number; aal: string; amr: { method: string; timestamp: number }[]; email: string; sid: string };
export type Role = "admin" | "approver" | "buyer" | "finance";
export type Me = {
  email: string;
  role: Role;
  mfa: boolean;
  org: { id: string; name: string; country: string; status: "pending" | "approved" | "suspended"; cleared: boolean };
};

export type Account =
  | { state: "off" }
  | { state: "out"; ended?: "idle" | "expired" }
  | { state: "none"; token: string; claims: Claims }
  | { state: "mfa"; token: string; claims: Claims; me: Me }
  | { state: "in"; token: string; claims: Claims; me: Me };

/** The portal runs on the live host and locally; previews share the live database, so they do not sign anyone in. */
export const portalHere = (request: Request) => {
  const host = new URL(request.url).hostname;
  return isLive(request) || host === "localhost" || host === "127.0.0.1";
};

/** A token's claims, read without checking its signature: Supabase checks that on every call. */
export function claimsOf(token: string): Claims | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
    const c = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Claims> & { session_id?: string };
    if (typeof c.exp !== "number" || typeof c.email !== "string") return null;
    return {
      exp: c.exp,
      email: c.email.toLowerCase(),
      aal: typeof c.aal === "string" ? c.aal : "aal1",
      amr: Array.isArray(c.amr) ? c.amr : [],
      sid: typeof c.session_id === "string" ? c.session_id : "",
    };
  } catch {
    return null;
  }
}

/** When this sign-in began: the earliest authentication in the token's amr claim. */
export const signedInAt = (c: Claims) => Math.min(...c.amr.map((a) => a.timestamp).filter((t) => typeof t === "number"), c.exp);

/** Whether the authenticator app must confirm this sign-in first: always for admins and finance (ADR-0003), and for anyone who set one up. */
export const needsMfa = (me: Me, c: Claims) => c.aal !== "aal2" && (me.mfa || me.role === "admin" || me.role === "finance");

export function readSession(cookies: AstroCookies): Session | null {
  try {
    const s = JSON.parse(cookies.get(COOKIE)?.value ?? "") as Partial<Session>;
    return typeof s.a === "string" && typeof s.r === "string" && typeof s.t === "number" ? (s as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(cookies: AstroCookies, s: Session | null) {
  if (s) cookies.set(COOKIE, JSON.stringify(s), { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: MAX_SECONDS });
  else cookies.delete(COOKIE, { path: "/", httpOnly: true, secure: true, sameSite: "lax" });
}

type Result<T> = { ok: true; data: T } | { ok: false; status: number; code?: string | undefined; hint?: string | undefined; message: string };

async function request<T>(cfg: Cfg, path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<Result<T>> {
  if (!cfg.url || !cfg.key) return { ok: false, status: 503, message: "not configured" };
  try {
    const res = await (cfg.fetchImpl ?? fetch)(`${cfg.url.replace(/\/$/, "")}${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${init.token ?? cfg.key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.ok) return { ok: true, data: body as T };
    const text = (k: string) => (typeof body?.[k] === "string" ? (body[k] as string) : undefined);
    return { ok: false, status: res.status, code: text("code") ?? text("error_code"), hint: text("hint"), message: text("message") ?? text("msg") ?? `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, status: 504, message: err instanceof Error ? err.name : "error" };
  }
}

type Tokens = { access_token: string; refresh_token: string };
const session = (t: Tokens, now: number): Session => ({ a: t.access_token, r: t.refresh_token, t: now });

// Supabase Auth --------------------------------------------------------------------

/** Emails a sign-in code to someone who already has an account; nobody else is told whether one exists. */
export const sendCode = (cfg: Cfg, email: string) => request(cfg, "/auth/v1/otp", { body: { email, create_user: false } });

export async function verifyCode(cfg: Cfg, email: string, code: string, now = Math.floor(Date.now() / 1000)): Promise<Session | null> {
  const r = await request<Tokens>(cfg, "/auth/v1/verify", { body: { type: "email", email, token: code } });
  return r.ok && r.data?.access_token ? session(r.data, now) : null;
}

export async function refresh(cfg: Cfg, s: Session, now: number): Promise<Session | null> {
  const r = await request<Tokens>(cfg, "/auth/v1/token?grant_type=refresh_token", { body: { refresh_token: s.r } });
  return r.ok && r.data?.access_token ? session(r.data, now) : null;
}

export const signOut = (cfg: Cfg, token: string, scope: "local" | "global" = "local") =>
  request(cfg, `/auth/v1/logout?scope=${scope}`, { method: "POST", body: {}, token });

export type Factor = { id: string; factor_type: string; status: string };
export async function factors(cfg: Cfg, token: string): Promise<Factor[]> {
  const r = await request<{ factors?: Factor[] }>(cfg, "/auth/v1/user", { token });
  return r.ok ? (r.data.factors ?? []).filter((f) => f.factor_type === "totp") : [];
}

/** A new authenticator-app factor to confirm, after clearing any left unconfirmed. */
export async function enroll(cfg: Cfg, token: string): Promise<{ id: string; qr: string; secret: string } | null> {
  for (const f of await factors(cfg, token)) if (f.status !== "verified") await request(cfg, `/auth/v1/factors/${f.id}`, { method: "DELETE", token });
  const r = await request<{ id: string; totp: { qr_code: string; secret: string } }>(cfg, "/auth/v1/factors", {
    body: { factor_type: "totp", friendly_name: `Authenticator ${new Date().toISOString().slice(0, 10)}` },
    token,
  });
  return r.ok ? { id: r.data.id, qr: r.data.totp.qr_code, secret: r.data.totp.secret } : null;
}

/** Confirms a code from the authenticator app; the new session is verified with it (aal2). */
export async function confirmFactor(cfg: Cfg, token: string, factorId: string, code: string, now = Math.floor(Date.now() / 1000)): Promise<Session | null> {
  const challenge = await request<{ id: string }>(cfg, `/auth/v1/factors/${factorId}/challenge`, { body: {}, token });
  if (!challenge.ok) return null;
  const r = await request<Tokens>(cfg, `/auth/v1/factors/${factorId}/verify`, { body: { challenge_id: challenge.data.id, code }, token });
  return r.ok && r.data?.access_token ? session(r.data, now) : null;
}

// The portal ------------------------------------------------------------------------

/** A portal_* function, as the buyer. */
export const call = <T>(cfg: Cfg, token: string, fn: string, args: Record<string, unknown> = {}) =>
  request<T>(cfg, `/rest/v1/rpc/${fn}`, { body: args, token });

/** The portal Edge Function (invitations, KYC files, documents), as the buyer. */
export function edge(cfg: Cfg, token: string, path: string, init: { method?: string; body?: BodyInit; type?: string } = {}) {
  return (cfg.fetchImpl ?? fetch)(`${(cfg.url ?? "").replace(/\/$/, "")}/functions/v1/portal/${path}`, {
    method: init.method ?? "GET",
    headers: { apikey: cfg.key ?? "", Authorization: `Bearer ${token}`, ...(init.type ? { "Content-Type": init.type } : {}) },
    ...(init.body === undefined ? {} : { body: init.body }),
    signal: AbortSignal.timeout(30000),
  });
}

/**
 * Who is asking, refreshing the token when it is about to expire and moving
 * the idle clock. Writes the cookie back (or clears it) on every call.
 */
export async function account(cfg: Cfg, cookies: AstroCookies, request: Request, now = Math.floor(Date.now() / 1000)): Promise<Account> {
  if (!cfg.url || !cfg.key || !portalHere(request)) return { state: "off" };
  let s = readSession(cookies);
  if (!s) return { state: "out" };
  let c = claimsOf(s.a);
  const end = async (ended: "idle" | "expired"): Promise<Account> => {
    await signOut(cfg, s!.a);
    writeSession(cookies, null);
    return { state: "out", ended };
  };
  if (!c) return end("expired");
  if (now - s.t > IDLE_SECONDS) return end("idle");
  if (now - signedInAt(c) > MAX_SECONDS) return end("expired");
  if (c.exp - now < 60) {
    const fresh = await refresh(cfg, s, now);
    if (!fresh || !(c = claimsOf(fresh.a))) return end("expired");
    s = fresh;
  }
  s = { ...s, t: now };
  writeSession(cookies, s);

  const me = await call<Me | null>(cfg, s.a, "portal_me");
  if (!me.ok) return me.status === 401 ? end("expired") : { state: "off" };
  if (!me.data) return { state: "none", token: s.a, claims: c };
  return needsMfa(me.data, c) ? { state: "mfa", token: s.a, claims: c, me: me.data } : { state: "in", token: s.a, claims: c, me: me.data };
}

/**
 * Keeps fresh tokens. A new sign-in (an email code) ends the session it
 * replaces; an authenticator check upgrades the same session, which stays.
 */
export async function begin(cfg: Cfg, cookies: AstroCookies, next: Session) {
  const old = readSession(cookies);
  writeSession(cookies, next);
  const before = old && claimsOf(old.a)?.sid;
  if (old && before && before !== claimsOf(next.a)?.sid) await signOut(cfg, old.a);
}

/** A path inside the account, for returning after a sign-in or a check; anything else becomes /account. */
export const safeNext = (value: unknown) =>
  typeof value === "string" && /^\/account(?:\/[a-z0-9/-]*)?$/.test(value) && !value.includes("//") ? value : "/account";

/** Where a refused action sends the buyer: sign in again, the authenticator app, or back with a message. */
export function refusal(r: { status: number; hint?: string | undefined }, back: string, codes: Record<string, string> = {}): Response {
  if (r.hint === "reauth") return seeOther(`/account/confirm?next=${encodeURIComponent(back)}`);
  if (r.hint === "mfa") return seeOther(`/account/mfa?next=${encodeURIComponent(back)}`);
  const m = (r.hint && codes[r.hint]) ?? (r.status === 403 ? "not-allowed" : "error");
  return seeOther(`${back}?m=${m}`);
}
