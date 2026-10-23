/** Checks the emailed code and starts the session; the authenticator app comes next when it is needed. */
import type { APIRoute } from "astro";
import { livePage } from "../../../lib/page.ts";
import { cfg, readPending, writePending } from "../../../server/account-page.ts";
import { readForm, sameOrigin, seeOther } from "../../../server/http.ts";
import { account, begin, portalHere, verifyCode } from "../../../server/portal.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await livePage("account"))) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!portalHere(request)) return seeOther("/account");
  const pending = readPending(cookies);
  if (!pending) return seeOther("/account?m=expired");
  const back = pending.r ? `/account/confirm?step=code&next=${encodeURIComponent(pending.n)}` : "/account?step=code";

  const form = await readForm(request);
  const code = String(form?.code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return seeOther(`${back}&m=code-wrong`);
  const session = await verifyCode(cfg(), pending.e, code);
  if (!session) return seeOther(`${back}&m=code-wrong`);

  await begin(cfg(), cookies, session);
  writePending(cookies, null);
  const acct = await account(cfg(), cookies, request);
  return seeOther(acct.state === "mfa" ? `/account/mfa?next=${encodeURIComponent(pending.n)}` : pending.n);
};
