/**
 * Every enquiry the site sends: quotes, quote lists, samples, contract supply,
 * sourcing, documents and the contact form. The checks run in order and each
 * one can stop the request: origin, size, honeypot, time-to-submit, Turnstile,
 * schema. Only then is the enquiry stored, through a database function that
 * checks the site token and the rate limits (VP-SEC-003/004/005, VP-LEAD-001).
 */
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import {
  IP_HASH_SECRET,
  MAIL_FROM,
  RESEND_API_KEY,
  RFQ_DRY_RUN,
  SALES_EMAIL_TO,
  SITE_TOKEN,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  TURNSTILE_SECRET_KEY,
} from "astro:env/server";
import { company } from "../../lib/company.ts";
import { checkTiming, verifyTurnstile } from "../../server/bot.ts";
import { isLive, json, readForm, sameOrigin, seeOther, sourcePage, wantsJson } from "../../server/http.ts";
import { clientIp, hashIp } from "../../server/ip.ts";
import { acknowledgementEmail, salesDeskEmail, sendEmail } from "../../server/mail.ts";
import { parseRfq, type Enquiry } from "../../server/rfq.ts";
import { rpc } from "../../server/supabase.ts";

export const prerender = false;

const COPY = {
  origin: "This form must be sent from the Vasant Petrochem website.",
  unreadable: "The form could not be read. Reload the page and try again.",
  quick: "That was very quick. Check your details and send again.",
  human: "We could not verify the request. Reload the page and try again, or call the sales desk.",
  fields: "Check the highlighted fields.",
  busy: "Too many enquiries from your connection. Try again later, or call the sales desk.",
  failed: "We could not save your enquiry. Try again, or call or WhatsApp the sales desk.",
};

async function notify(e: Enquiry, reference: string | null, turnstileOn: boolean) {
  const cfg = { apiKey: RESEND_API_KEY, from: MAIL_FROM };
  const desk = SALES_EMAIL_TO || company.mailboxes.sales || company.email;
  // The acknowledgement goes to whatever address was typed, so it only goes out
  // while Turnstile is enforcing: otherwise a bot could make us mail strangers.
  const [d, a] = await Promise.all([
    sendEmail(salesDeskEmail(e, desk, reference), cfg),
    turnstileOn
      ? sendEmail(
          acknowledgementEmail(e.email, reference, {
            tradeName: company.tradeName,
            phone: company.phone.display,
            hours: company.hours.label,
            replyTo: company.mailboxes.sales ?? company.email,
          }),
          cfg,
        )
      : Promise.resolve(null),
  ]);
  if (!d.ok) console.warn("sales-desk email not sent:", d.reason);
  if (a && !a.ok) console.warn("acknowledgement not sent:", a.reason);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const asJson = wantsJson(request);
  const fail = (status: number, message: string, errors?: Record<string, string>) =>
    asJson ? json(status, { ok: false, message, ...(errors ? { errors } : {}) }) : seeOther("/not-sent");

  if (!sameOrigin(request)) return fail(403, COPY.origin);
  const raw = await readForm(request);
  if (!raw) return fail(400, COPY.unreadable);
  // Honeypot: a bot that fills every field gets a normal-looking answer and nothing is stored.
  if (raw.website) return asJson ? json(200, { ok: true }) : seeOther("/sent");
  if (!checkTiming(raw.startedAt)) return fail(400, COPY.quick);

  const ip = clientIp(request.headers);
  const human = await verifyTurnstile(raw["cf-turnstile-response"], TURNSTILE_SECRET_KEY, { ip });
  if (!human.ok) {
    console.warn("rfq: turnstile rejected", human.reason);
    return fail(400, COPY.human);
  }

  const catalog = (await getCollection("products", (p) => p.data.status === "published")).map((p) => ({ slug: p.id, name: p.data.name, code: p.data.code }));
  const parsed = parseRfq(raw, catalog, company.exports);
  if (!parsed.ok) return fail(422, COPY.fields, parsed.errors);
  const e = parsed.enquiry;

  if (RFQ_DRY_RUN === "1" || !isLive(request)) return asJson ? json(200, { ok: true, reference: "VP-ENQ-TEST-0000", dryRun: true }) : seeOther("/sent");

  const result = await rpc<string>(
    "submit_enquiry",
    {
      p: {
        request_type: e.request_type,
        name: e.name,
        email: e.email,
        company: e.company,
        phone: e.phone,
        message: e.message,
        lines: e.lines,
        product_label: e.product_label,
        quantity: e.quantity,
        delivery_city: e.delivery_city,
        delivery_country: e.delivery_country,
        delivery_port: e.delivery_port,
        required_by: e.required_by,
        offer_ref: e.offer_ref,
        ...e.utm,
        landing_page: e.landing_page,
        referrer: e.referrer,
        source_page: sourcePage(request),
        ip_hash: await hashIp(ip, IP_HASH_SECRET),
        user_agent: (request.headers.get("user-agent") ?? "").slice(0, 400),
      },
      token: SITE_TOKEN ?? "",
    },
    { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY },
  );
  if (!result.ok) {
    if (/rate limit/i.test(result.message)) return fail(429, COPY.busy);
    console.error("rfq: submit_enquiry failed", result.status, result.message);
    return fail(502, COPY.failed);
  }
  const reference = typeof result.data === "string" ? result.data : null;
  locals.cfContext?.waitUntil(notify(e, reference, Boolean(TURNSTILE_SECRET_KEY)));
  return asJson ? json(200, { ok: true, reference }) : seeOther("/sent");
};

export const ALL: APIRoute = () => json(405, { ok: false, message: "Use POST." }, { Allow: "POST" });
