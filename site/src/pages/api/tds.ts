/**
 * The TDS gate (VP-DOC-003, VP-LEAD-003): a work email in, the data sheet out,
 * straight away, with a copy by email. Only verified products carry a TDS file,
 * so a gate never stands in front of nothing.
 */
import type { APIRoute } from "astro";
import { getEntry } from "astro:content";
import { IP_HASH_SECRET, MAIL_FROM, RESEND_API_KEY, RFQ_DRY_RUN, SITE_TOKEN, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, TURNSTILE_SECRET_KEY } from "astro:env/server";
import { company, SITE_URL } from "../../lib/company.ts";
import { checkTiming, verifyTurnstile } from "../../server/bot.ts";
import { json, readForm, sameOrigin } from "../../server/http.ts";
import { clientIp, hashIp } from "../../server/ip.ts";
import { sendEmail } from "../../server/mail.ts";
import { rpc } from "../../server/supabase.ts";
import { email as emailRule } from "../../server/text.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!sameOrigin(request)) return json(403, { ok: false, message: "This form must be sent from the Vasant Petrochem website." });
  const raw = await readForm(request, 8 * 1024);
  if (!raw) return json(400, { ok: false, message: "The form could not be read. Reload the page and try again." });
  if (raw.website) return json(200, { ok: true });
  if (!checkTiming(raw.startedAt)) return json(400, { ok: false, message: "That was very quick. Check your email and try again." });
  const ip = clientIp(request.headers);
  const human = await verifyTurnstile(raw["cf-turnstile-response"], TURNSTILE_SECRET_KEY, { ip });
  if (!human.ok) return json(400, { ok: false, message: "We could not verify the request. Reload the page and try again." });

  const parsedEmail = emailRule.safeParse(raw.email);
  if (!parsedEmail.success) return json(422, { ok: false, message: "Check your email.", errors: { email: parsedEmail.error.issues[0]?.message ?? "Enter a valid email." } });
  const slug = typeof raw.slug === "string" && /^[a-z0-9-]{2,80}$/.test(raw.slug) ? raw.slug : "";
  const product = slug ? await getEntry("products", slug) : undefined;
  const file = product?.data.status === "published" ? product.data.documents.tds?.file : undefined;
  if (!product || !file) return json(404, { ok: false, message: "This product's data sheet is available on request. Ask the sales desk." });

  const url = `/documents/${file}`;
  if (RFQ_DRY_RUN === "1") return json(200, { ok: true, url, dryRun: true });

  const logged = await rpc(
    "log_tds_request",
    { p: { email: parsedEmail.data, product_slug: slug, product_label: `${product.data.name} (${product.data.code})`, ip_hash: await hashIp(ip, IP_HASH_SECRET) }, token: SITE_TOKEN ?? "" },
    { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY },
  );
  if (!logged.ok) {
    if (/rate limit/i.test(logged.message)) return json(429, { ok: false, message: "Too many requests from your connection. Try again later." });
    console.error("tds: log_tds_request failed", logged.status, logged.message);
  }
  locals.cfContext?.waitUntil(
    sendEmail(
      {
        to: parsedEmail.data,
        replyTo: company.mailboxes.sales ?? company.email,
        subject: `${product.data.name} (${product.data.code}) technical data sheet`,
        text: `Hello,\n\nHere is the technical data sheet you asked for:\n${SITE_URL}${url}\n\n${company.tradeName}\n${company.phone.display}`,
      },
      { apiKey: RESEND_API_KEY, from: MAIL_FROM },
    ).then((r) => {
      if (!r.ok) console.warn("tds email not sent:", r.reason);
    }),
  );
  return json(200, { ok: true, url });
};

export const ALL: APIRoute = () => json(405, { ok: false, message: "Use POST." }, { Allow: "POST" });
