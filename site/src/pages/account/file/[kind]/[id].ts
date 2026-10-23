/** A shared document or a KYC file, passed through from the portal Edge Function; the Worker never holds a storage key. */
import type { APIRoute } from "astro";
import { livePage } from "../../../../lib/page.ts";
import { cfg } from "../../../../server/account-page.ts";
import { seeOther } from "../../../../server/http.ts";
import { account, edge } from "../../../../server/portal.ts";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies, request }) => {
  if (!(await livePage("account"))) return new Response(null, { status: 404 });
  const kind = params.kind;
  const id = params.id ?? "";
  if ((kind !== "document" && kind !== "kyc") || !/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const acct = await account(cfg(), cookies, request);
  if (acct.state !== "in") return seeOther(acct.state === "mfa" ? "/account/mfa" : "/account");

  const res = await edge(cfg(), acct.token, `file?kind=${kind}&id=${id}`);
  const back = kind === "kyc" ? "/account/company" : "/account/documents";
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { hint?: string } | null;
    return seeOther(body?.hint === "mfa" ? `/account/mfa?next=${back}` : `${back}?m=error`);
  }
  const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  for (const name of ["Content-Type", "Content-Disposition", "Content-Length"]) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(res.body, { status: 200, headers });
};
