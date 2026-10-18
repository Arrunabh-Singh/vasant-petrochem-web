"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseQuoteForm, QUOTE_FIELDS } from "@/lib/validate";
import { botCheck } from "@/lib/bot-defence";
import { clientIp, hashIp } from "@/lib/client-ip";
import { acknowledgementEmail, salesDeskEmail, sendEmail } from "@/lib/mail";

export type QuoteFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** VP-ENQ-YYYYMM-####, present once the service-role key is configured. */
  reference?: string;
};

// audit.md M21: sourcePage/product were persisted verbatim from
// client-controllable fields with no server-side check — no injection
// today (React-escaped, and M9 fixed the CSV export sink), but any future
// mail-template or email-send feature turns an unvalidated echo into one.
const ALLOWED_SOURCE_PAGES = [/^\/contact$/, /^\/products\/[a-z0-9-]+$/];

function isAllowedSourcePage(value: string): boolean {
  return ALLOWED_SOURCE_PAGES.some((re) => re.test(value));
}

/**
 * honeypot: hidden field named "website" — real visitors never fill it in,
 * bots that auto-fill every field do. Silently drop the submission instead
 * of erroring, so bots get no signal.
 */
export async function submitQuoteRequest(
  _prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  if (formData.get("website")) {
    return { status: "success" };
  }

  // VP-SEC-004: time-to-submit + Turnstile, verified on the server.
  const blocked = await botCheck(formData);
  if (blocked) {
    return { status: "error", message: blocked };
  }

  const sourcePageRaw = String(formData.get("sourcePage") ?? "").trim();
  const sourcePage = isAllowedSourcePage(sourcePageRaw) ? sourcePageRaw : "/contact";

  // VP-SEC-005: every field is validated here, never trusted from the browser.
  const parsed = parseQuoteForm(Object.fromEntries(QUOTE_FIELDS.map((k) => [k, formData.get(k) ?? ""])));
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }
  const { name, email, company, phone, product: productLabel, quantity, message } = parsed.data;

  const supabase = createPublicClient();

  let productId: string | null = null;
  if (productLabel && productLabel !== "Other") {
    const { data: match } = await supabase
      .from("products")
      .select("id, name, code")
      .eq("published", true);
    productId = match?.find((p) => `${p.name} (${p.code})` === productLabel)?.id ?? null;
    // Only a published product (or "Other") is a valid choice.
    if (!productId) {
      return { status: "error", message: "Select a product from the list." };
    }
  }

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  // Writes go through the service-role client (server-only) once its key is
  // configured; until then the anon insert policy keeps enquiries flowing.
  // The address is stored as a keyed hash when a key exists, raw otherwise.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ipHash = hashIp(ip, serviceKey);
  const writer = serviceKey ? createAdminClient() : supabase;

  // Reading the new row back (to show its reference) needs SELECT, which only
  // the service role has; the anon fallback can insert but not read.
  const insert = writer.from("quote_requests").insert({
    name,
    email,
    company: company || null,
    phone: phone || null,
    product_id: productId,
    product_label: productLabel || null,
    quantity: quantity || null,
    message: message || null,
    source_page: sourcePage,
    ip: ipHash ? null : ip,
    ip_hash: ipHash,
    user_agent: requestHeaders.get("user-agent")?.slice(0, 400) ?? null,
  });
  let reference: string | undefined;
  let error;
  if (serviceKey) {
    const result = await insert.select("reference").single();
    error = result.error;
    reference = result.data?.reference ?? undefined;
  } else {
    error = (await insert).error;
  }

  if (error) {
    // VP-SEC-003: the prevent_spam() trigger rejected this submission.
    if (error.message.includes("rate limit exceeded")) {
      console.warn("rate-limit: quote_requests submission rejected", { ip });
      return { status: "error", message: "Too many enquiries from your connection. Please try again later or call us." };
    }
    console.error("quote_requests insert failed:", error.message);
    return { status: "error", message: "Something went wrong. Please try again or call us directly." };
  }

  // VP-LEAD-005 / VP-LEAD-002: alert the sales desk and acknowledge the buyer.
  // Runs after the response is sent and never fails the enquiry: it is
  // already saved. The two sends are independent.
  after(async () => {
    // The acknowledgement goes to whatever address the form carries, so it is
    // only sent once Turnstile is enforcing: otherwise a bot could make us mail
    // arbitrary addresses and burn the free-tier quota the sales-desk alert needs.
    const acknowledge = Boolean(process.env.TURNSTILE_SECRET_KEY);
    const [desk, ack] = await Promise.all([
      sendEmail(salesDeskEmail({ reference, name, email, company, phone, product: productLabel, quantity, message, sourcePage })),
      acknowledge ? sendEmail(acknowledgementEmail(email, reference)) : Promise.resolve(null),
    ]);
    if (!desk.ok) console.warn("sales-desk notification not sent:", desk.reason);
    if (ack && !ack.ok) console.warn("buyer acknowledgement not sent:", ack.reason);
  });

  return { status: "success", reference };
}
