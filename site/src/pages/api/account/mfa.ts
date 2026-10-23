/** Confirms a code from the authenticator app: finishes its set-up, completes a sign-in, or re-confirms one. */
import type { APIRoute } from "astro";
import { livePage } from "../../../lib/page.ts";
import { cfg, safeNext } from "../../../server/account-page.ts";
import { readForm, sameOrigin, seeOther } from "../../../server/http.ts";
import { account, begin, confirmFactor } from "../../../server/portal.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await livePage("account"))) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const acct = await account(cfg(), cookies, request);
  if (acct.state !== "mfa" && acct.state !== "in") return seeOther("/account");

  const form = await readForm(request);
  const next = safeNext(form?.next);
  const factorId = String(form?.factor_id ?? "");
  const code = String(form?.code ?? "").replace(/\s+/g, "");
  // Already verified with the app: this re-confirms a sign-in, from the confirm page.
  const back = acct.claims.aal === "aal2" ? `/account/confirm?next=${encodeURIComponent(next)}` : `/account/mfa?next=${encodeURIComponent(next)}`;
  if (!/^[0-9a-f-]{36}$/.test(factorId) || !/^\d{6}$/.test(code)) return seeOther(`${back}&m=mfa-wrong`);

  const session = await confirmFactor(cfg(), acct.token, factorId, code);
  if (!session) return seeOther(`${back}&m=mfa-wrong`);
  await begin(cfg(), cookies, session);
  return seeOther(acct.me.mfa ? next : `${next}?m=mfa-on`);
};
