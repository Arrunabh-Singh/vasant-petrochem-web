/** Accepts or declines a quotation, then tells the sales desk. The database decides who may (portal_quotation_decide). */
import type { APIRoute } from "astro";
import { MAIL_FROM, RESEND_API_KEY, SALES_EMAIL_TO } from "astro:env/server";
import { cfg, member, refusal } from "../../../server/account-page.ts";
import { readForm, seeOther } from "../../../server/http.ts";
import { sendEmail } from "../../../server/mail.ts";
import { call } from "../../../server/portal.ts";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const g = await member(ctx);
  if ("response" in g) return g.response;
  const form = await readForm(ctx.request);
  const id = String(form?.id ?? "");
  const decision = form?.decision;
  if (!/^[0-9a-f-]{36}$/.test(id) || (decision !== "accept" && decision !== "decline")) return seeOther("/account/quotations?m=error");
  const note = String(form?.note ?? "").slice(0, 500);
  const back = `/account/quotations/${id}`;

  const r = await call<{ reference: string; total: number; currency: string }>(cfg(), g.acct.token, "portal_quotation_decide", {
    p_id: id,
    p_decision: decision,
    p_note: note,
  });
  if (!r.ok) return refusal(r, back, { verification: "verification", expired: "expired-quotation" });

  if (SALES_EMAIL_TO) {
    await sendEmail(
      {
        to: SALES_EMAIL_TO,
        replyTo: g.acct.me.email,
        subject: `Quotation ${r.data.reference} ${decision === "accept" ? "accepted" : "declined"} by ${g.acct.me.org.name}`,
        text: [
          `${g.acct.me.email} (${g.acct.me.org.name}) ${decision === "accept" ? "accepted" : "declined"} quotation ${r.data.reference}.`,
          note ? `Their note: ${note}` : "",
          decision === "accept" ? "Confirm the order in the hub (Sales › Quotations)." : "",
        ].filter(Boolean).join("\n\n"),
      },
      { apiKey: RESEND_API_KEY, from: MAIL_FROM },
    );
  }
  return seeOther(`${back}?m=${decision === "accept" ? "accepted" : "declined"}`);
};
