/** A copy of the member's data (a JSON download), or a correction or erasure request for the sales desk. */
import type { APIRoute } from "astro";
import { cfg, member, refusal } from "../../../server/account-page.ts";
import { readForm, seeOther } from "../../../server/http.ts";
import { call } from "../../../server/portal.ts";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const g = await member(ctx);
  if ("response" in g) return g.response;
  const form = await readForm(ctx.request);
  const back = "/account/security";

  if (form?.action === "export") {
    const r = await call<unknown>(cfg(), g.acct.token, "portal_export");
    if (!r.ok) return refusal(r, back);
    return new Response(JSON.stringify(r.data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="vasant-petrochem-my-data.json"',
        "Cache-Control": "private, no-store",
      },
    });
  }
  const kind = form?.kind;
  if (form?.action !== "request" || (kind !== "correction" && kind !== "erasure")) return seeOther(`${back}?m=error`);
  const r = await call(cfg(), g.acct.token, "portal_privacy_request", { p_kind: kind, p_note: String(form?.note ?? "").slice(0, 1000) });
  if (!r.ok) return r.code === "53400" ? seeOther(`${back}?m=slow-down`) : refusal(r, back);
  return seeOther(`${back}?m=request-sent`);
};
