/**
 * Emails a sign-in code. Anyone may ask, so: Turnstile and the honeypot, and
 * the same answer whether or not the address has an account. A re-confirming
 * member gets a code for their own address only.
 */
import type { APIRoute } from "astro";
import { TURNSTILE_SECRET_KEY } from "astro:env/server";
import { livePage } from "../../../lib/page.ts";
import { cfg, safeNext, writePending } from "../../../server/account-page.ts";
import { verifyTurnstile } from "../../../server/bot.ts";
import { readForm, sameOrigin, seeOther } from "../../../server/http.ts";
import { account, portalHere, sendCode } from "../../../server/portal.ts";

export const prerender = false;

const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await livePage("account"))) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!portalHere(request)) return seeOther("/account");
  const form = await readForm(request);
  if (!form) return seeOther("/account?m=error");

  const reauth = form.reauth === "1";
  const next = safeNext(form.next);
  let email: string;
  if (reauth) {
    const acct = await account(cfg(), cookies, request);
    if (acct.state !== "in") return seeOther("/account");
    email = acct.claims.email;
  } else {
    if (typeof form.website === "string" && form.website !== "") return seeOther("/account?step=code");
    const human = await verifyTurnstile(form["cf-turnstile-response"], TURNSTILE_SECRET_KEY, { ip: request.headers.get("cf-connecting-ip") });
    if (!human.ok) return seeOther("/account?m=error");
    email = String(form.email ?? "").trim().toLowerCase();
    if (email.length > 320 || !EMAIL.test(email)) return seeOther("/account?m=code-wrong");
  }

  const sent = await sendCode(cfg(), email);
  const confirm = `/account/confirm?next=${encodeURIComponent(next)}`;
  if (!sent.ok && sent.status === 429) return seeOther(reauth ? `${confirm}&m=slow-down` : "/account?m=slow-down");
  // Any other answer, "no such account" included, looks the same from outside.
  writePending(cookies, { e: email, n: next, r: reauth });
  return seeOther(reauth ? `${confirm}&step=code` : "/account?step=code");
};
