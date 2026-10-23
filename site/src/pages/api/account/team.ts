/** Invites a colleague (through the portal Edge Function), changes a role, or removes someone. Admins only; the database checks. */
import type { APIRoute } from "astro";
import { cfg, member, refusal } from "../../../server/account-page.ts";
import { readForm, seeOther } from "../../../server/http.ts";
import { call, edge } from "../../../server/portal.ts";

export const prerender = false;

const ROLES = new Set(["admin", "approver", "buyer", "finance"]);

export const POST: APIRoute = async (ctx) => {
  const g = await member(ctx);
  if ("response" in g) return g.response;
  const form = await readForm(ctx.request);
  const action = form?.action;
  const email = String(form?.email ?? "").trim().toLowerCase();
  const role = String(form?.role ?? "");
  const back = "/account/team";
  if (!email || email.length > 320 || (action !== "remove" && !ROLES.has(role))) return seeOther(`${back}?m=error`);

  if (action === "invite") {
    const res = await edge(cfg(), g.acct.token, "invite", {
      method: "POST",
      type: "application/json",
      body: JSON.stringify({ org_id: g.acct.me.org.id, email, role }),
    });
    const body = (await res.json().catch(() => null)) as { account?: string; hint?: string } | null;
    if (!res.ok) return refusal({ status: res.status, hint: body?.hint ?? undefined }, back);
    return seeOther(`${back}?m=${body?.account === "existing" ? "invited-existing" : "invited"}`);
  }
  if (action !== "role" && action !== "remove") return seeOther(`${back}?m=error`);
  const r = await call(cfg(), g.acct.token, "portal_member_update", { p_email: email, p_role: action === "remove" ? null : role });
  if (!r.ok) return refusal(r, back);
  return seeOther(`${back}?m=${action === "remove" ? "member-removed" : "member-updated"}`);
};
