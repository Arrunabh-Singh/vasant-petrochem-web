/** What every buyer-account page and endpoint does first. */
import type { APIContext, AstroGlobal } from "astro";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "astro:env/server";
import { livePage } from "../lib/page.ts";
import { seeOther, sameOrigin } from "./http.ts";
import { account, safeNext, type Account, type Cfg } from "./portal.ts";

export { refusal, safeNext } from "./portal.ts";

export const cfg = (): Cfg => ({ url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY });

type Signed = Extract<Account, { state: "in" }>;

/** A signed-in page: its copy and the member, or the response to send instead (404 while the portal is a draft). */
export async function signedIn(Astro: AstroGlobal): Promise<{ copy: NonNullable<Awaited<ReturnType<typeof livePage>>>; acct: Signed } | { response: Response }> {
  const copy = await livePage("account");
  if (!copy) return { response: new Response(null, { status: 404 }) };
  Astro.response.headers.set("Cache-Control", "private, no-store");
  const acct = await account(cfg(), Astro.cookies, Astro.request);
  if (acct.state === "in") return { copy, acct };
  return { response: Astro.redirect(acct.state === "mfa" ? "/account/mfa" : "/account") };
}

/** A form post from a signed-in member, or the response to send instead. */
export async function member(ctx: APIContext): Promise<{ acct: Signed } | { response: Response }> {
  if (!(await livePage("account"))) return { response: new Response(null, { status: 404 }) };
  if (!sameOrigin(ctx.request)) return { response: new Response(null, { status: 403 }) };
  const acct = await account(cfg(), ctx.cookies, ctx.request);
  if (acct.state === "in") return { acct };
  return { response: seeOther(acct.state === "mfa" ? "/account/mfa" : "/account") };
}

/** The email a code was sent to, where to go after, and whether it re-confirms a sign-in, for ten minutes (never in the URL). */
const SIGNIN = "__Host-vp-signin";
export type Pending = { e: string; n: string; r: boolean };

export function readPending(cookies: AstroGlobal["cookies"]): Pending | null {
  try {
    const p = JSON.parse(cookies.get(SIGNIN)?.value ?? "") as Partial<Pending>;
    return typeof p.e === "string" && typeof p.n === "string" ? { e: p.e, n: safeNext(p.n), r: p.r === true } : null;
  } catch {
    return null;
  }
}

export function writePending(cookies: AstroGlobal["cookies"], p: Pending | null) {
  if (p) cookies.set(SIGNIN, JSON.stringify(p), { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
  else cookies.delete(SIGNIN, { path: "/", httpOnly: true, secure: true, sameSite: "lax" });
}
