/**
 * Outbound email through Resend's HTTP API (free tier: 100 a day, 3,000 a
 * month), ported from the hub's lib/mail.ts. Env-gated and it invents
 * nothing: without RESEND_API_KEY and MAIL_FROM (a sender on a domain verified
 * in Resend, VP-HUM-002) it reports `skipped`.
 */
import type { Enquiry } from "./rfq.ts";

export type Mail = { to: string; subject: string; text: string; replyTo?: string };
export type SendResult = { ok: true } | { ok: false; skipped?: boolean; reason: string };
export type MailConfig = { apiKey?: string | undefined; from?: string | undefined; fetchImpl?: typeof fetch };

/** Header values must be one line. */
export const oneLine = (v: string): string => v.replace(/[\r\n\u2028\u2029]+/g, " ").trim();

export async function sendEmail(mail: Mail, cfg: MailConfig): Promise<SendResult> {
  if (!cfg.apiKey || !cfg.from) return { ok: false, skipped: true, reason: "RESEND_API_KEY / MAIL_FROM not set" };
  try {
    const res = await (cfg.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: oneLine(cfg.from),
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

/** The sales desk's "new enquiry" alert. Reply-To is the buyer, so replying answers them. */
export function salesDeskEmail(e: Enquiry, to: string, reference: string | null): Mail {
  const line = (label: string, value: string) => `${label}: ${value || "—"}`;
  return {
    to,
    replyTo: e.email,
    subject: `New enquiry${reference ? ` ${reference}` : ""}${e.product_label ? ` — ${e.product_label}` : ""}`,
    text: [
      line("Reference", reference ?? ""),
      line("Type", e.request_type),
      line("Name", e.name),
      line("Company", e.company),
      line("Email", e.email),
      line("Phone / WhatsApp", e.phone),
      "",
      "Products:",
      ...(e.lines.length
        ? e.lines.map((l) => `- ${l.name} (${l.code})${l.qty ? `: ${l.qty} ${l.unit}` : ""}${l.pack ? `, ${l.pack}` : ""}${l.notes ? ` (${l.notes})` : ""}`)
        : ["—"]),
      "",
      line("Deliver to", [e.delivery_city, e.delivery_port, e.delivery_country].filter(Boolean).join(", ")),
      line("Needed by", e.required_by),
      line("Landing page", e.landing_page),
      line("Campaign", [e.utm.utm_source, e.utm.utm_medium, e.utm.utm_campaign].filter(Boolean).join(" / ")),
      "",
      "Message:",
      e.message || "—",
      "",
      "Respond within 24 hours on business days.",
    ].join("\n"),
  };
}

/**
 * VP-LEAD-002: the buyer's acknowledgement. Fixed text plus the reference,
 * nothing the visitor typed, so the form cannot be used to send an arbitrary
 * message to an arbitrary address.
 */
export function acknowledgementEmail(to: string, reference: string | null, company: { tradeName: string; phone: string; hours: string; replyTo: string }): Mail {
  return {
    to,
    replyTo: company.replyTo,
    subject: `We have received your enquiry${reference ? ` ${reference}` : ""}`,
    text: [
      "Hello,",
      "",
      `Thank you for contacting ${company.tradeName}. We have received your enquiry${reference ? ` and recorded it as ${reference}` : ""}.`,
      "",
      "Our sales desk replies within 24 hours on business days. Please quote the reference above in any follow-up.",
      "",
      `For anything urgent, call ${company.phone} (${company.hours}).`,
      "",
      company.tradeName,
      "",
      "This is an automatic acknowledgement. If you did not make this enquiry, you can ignore this email.",
    ].join("\n"),
  };
}
