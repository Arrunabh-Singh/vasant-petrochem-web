"use server";

import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { parseQuoteForm, QUOTE_FIELDS } from "@/lib/validate";
import { botCheck } from "@/lib/bot-defence";
import { clientIp } from "@/lib/client-ip";

export type QuoteFormState = {
  status: "idle" | "success" | "error";
  message?: string;
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

  const ip = clientIp(await headers());

  const { error } = await supabase.from("quote_requests").insert({
    name,
    email,
    company: company || null,
    phone: phone || null,
    product_id: productId,
    product_label: productLabel || null,
    quantity: quantity || null,
    message: message || null,
    source_page: sourcePage,
    ip,
  });

  if (error) {
    // VP-SEC-003: the prevent_spam() trigger rejected this submission.
    if (error.message.includes("rate limit exceeded")) {
      console.warn("rate-limit: quote_requests submission rejected", { ip });
      return { status: "error", message: "Too many enquiries from your connection. Please try again later or call us." };
    }
    console.error("quote_requests insert failed:", error.message);
    return { status: "error", message: "Something went wrong. Please try again or call us directly." };
  }

  return { status: "success" };
}
