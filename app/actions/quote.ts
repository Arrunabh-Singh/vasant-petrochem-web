"use server";

import { createPublicClient } from "@/lib/supabase/public";

export type QuoteFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

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

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const productLabel = String(formData.get("product") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const sourcePage = String(formData.get("sourcePage") ?? "").trim();

  if (!name || !email) {
    return { status: "error", message: "Name and email are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = createPublicClient();
  const { error } = await supabase.from("quote_requests").insert({
    name,
    email,
    company: company || null,
    product_label: productLabel || null,
    quantity: quantity || null,
    message: message || null,
    source_page: sourcePage || null,
  });

  if (error) {
    console.error("quote_requests insert failed:", error.message);
    return { status: "error", message: "Something went wrong. Please try again or call us directly." };
  }

  return { status: "success" };
}
