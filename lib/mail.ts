import { company } from "./company.ts";

/**
 * Outbound email through Resend's HTTP API (free tier: 100/day, 3000/month).
 * No SDK: one fetch, same as lib/notify.ts.
 *
 * Env-gated, and it invents nothing: with no RESEND_API_KEY or no MAIL_FROM
 * (a sender address on a domain verified in Resend) it reports `skipped`
 * instead of guessing a sender. MAIL_FROM is a VP-HUM-002 / VP-HUM-009 item.
 */
export type Mail = { to: string; subject: string; text: string; replyTo?: string };
export type SendResult = { ok: true } | { ok: false; skipped?: boolean; reason: string };

/** Header values must be a single line; strip anything that could start a new header. */
export const oneLine = (v: string): string => v.replace(/[\r\n\u2028\u2029]+/g, " ").trim();

export async function sendEmail(
  mail: Mail,
  opts: { apiKey?: string; from?: string; fetchImpl?: typeof fetch } = {},
): Promise<SendResult> {
  const apiKey = "apiKey" in opts ? opts.apiKey : process.env.RESEND_API_KEY;
  const from = "from" in opts ? opts.from : process.env.MAIL_FROM;
  if (!apiKey || !from) return { ok: false, skipped: true, reason: "RESEND_API_KEY / MAIL_FROM not set" };
  try {
    const res = await (opts.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: oneLine(from),
        to: [oneLine(mail.to)],
        subject: oneLine(mail.subject),
        text: mail.text,
        ...(mail.replyTo ? { reply_to: oneLine(mail.replyTo) } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { ok: true } : { ok: false, reason: `Resend HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, reason: `Resend request failed: ${err instanceof Error ? err.name : "error"}` };
  }
}

export type Enquiry = {
  reference?: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  product: string;
  quantity: string;
  message: string;
  sourcePage: string;
};

/** Where new-enquiry alerts go: SALES_EMAIL_TO, else the company address. */
export const salesDeskAddress = (): string => process.env.SALES_EMAIL_TO || company.email;

/** Internal "new enquiry" alert. Reply-To is the buyer, so replying answers them. */
export function salesDeskEmail(e: Enquiry): Mail {
  const line = (label: string, value: string) => `${label}: ${value || "—"}`;
  return {
    to: salesDeskAddress(),
    replyTo: e.email,
    subject: `New enquiry${e.reference ? ` ${e.reference}` : ""}${e.product ? ` — ${e.product}` : ""}`,
    text: [
      line("Reference", e.reference ?? ""),
      line("Name", e.name),
      line("Company", e.company),
      line("Email", e.email),
      line("Phone / WhatsApp", e.phone),
      line("Product", e.product),
      line("Quantity", e.quantity),
      line("Submitted from", e.sourcePage),
      "",
      "Message:",
      e.message || "—",
      "",
      "Respond within 24 hours on business days.",
    ].join("\n"),
  };
}
