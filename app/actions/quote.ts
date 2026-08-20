"use server";

import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";

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

// Rejects control characters/newlines in addition to the basic shape check.
const EMAIL_RE = /^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/;

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

  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  const company = String(formData.get("company") ?? "").trim().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const productLabel = String(formData.get("product") ?? "").trim().slice(0, 200);
  const quantity = String(formData.get("quantity") ?? "").trim().slice(0, 100);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);
  const sourcePageRaw = String(formData.get("sourcePage") ?? "").trim();
  const sourcePage = isAllowedSourcePage(sourcePageRaw) ? sourcePageRaw : "/contact";

  if (!name || !email) {
    return { status: "error", message: "Name and email are required." };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = createPublicClient();

  let productId: string | null = null;
  if (productLabel && productLabel !== "Other") {
    const { data: match } = await supabase
      .from("products")
      .select("id, name, code")
      .eq("published", true);
    productId = match?.find((p) => `${p.name} (${p.code})` === productLabel)?.id ?? null;
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

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
    console.error("quote_requests insert failed:", error.message);
    return { status: "error", message: "Something went wrong. Please try again or call us directly." };
  }

  return { status: "success" };
}
