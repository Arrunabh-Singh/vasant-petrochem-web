"use server";

import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEmail } from "@/lib/validate";
import { botCheck } from "@/lib/bot-defence";
import { clientIp } from "@/lib/client-ip";

export type TdsGateState = { status: "idle" | "success" | "error"; message?: string; url?: string };

export async function requestTds(
  productId: string,
  productLabel: string,
  _prevState: TdsGateState,
  formData: FormData
): Promise<TdsGateState> {
  // Honeypot — bots that fill every field get silently dropped, no signal back.
  if (formData.get("website")) return { status: "success" };

  const blocked = await botCheck(formData);
  if (blocked) {
    return { status: "error", message: blocked };
  }

  const parsedEmail = parseEmail(formData.get("email") ?? "");
  if (!parsedEmail.ok) {
    return { status: "error", message: parsedEmail.message };
  }
  const email = parsedEmail.email;

  const supabase = createPublicClient();
  // audit.md M19: tds_document_id used to be a raw storage path selected
  // into every public product projection (lib/products.ts) so any visitor
  // could enumerate private bucket object names. It's now fetched only
  // here, right before minting the signed URL.
  const { data: product } = await supabase
    .from("products")
    .select("tds_document_id")
    .eq("id", productId)
    .eq("published", true)
    .maybeSingle();

  const ip = clientIp(await headers());

  const { error: logError } = await supabase
    .from("tds_requests")
    .insert({ email, product_id: productId, product_label: productLabel, ip });
  if (logError) {
    // VP-SEC-003: a rate-limited request must not still get a download link.
    if (logError.message.includes("rate limit exceeded")) {
      console.warn("rate-limit: tds_requests request rejected", { ip });
      return { status: "error", message: "Too many requests from your connection. Please try again later or call us." };
    }
    console.error("tds_requests insert failed:", logError.message);
  }

  if (!product?.tds_document_id) {
    return {
      status: "error",
      message: "Spec sheet isn't uploaded yet — we've logged your request. Call us and we'll send it directly.",
    };
  }

  try {
    const admin = createAdminClient();
    const { data: ver } = await admin
      .from("document_versions")
      .select("path")
      .eq("doc_id", product.tds_document_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ver) throw new Error("no version found for tds document");

    // doc-hardening.md §2.5: 15 minutes was long enough for a forwarded
    // link (WhatsApp, browser history, proxy logs) to stay live well past
    // the visitor's own download. 60 seconds bounds that window while
    // still covering a normal "click, wait for the tab" flow.
    const { data, error } = await admin.storage.from("tds").createSignedUrl(ver.path, 60);
    if (error || !data) throw error ?? new Error("no signed url returned");
    return { status: "success", url: data.signedUrl };
  } catch (err) {
    console.error("TDS signed URL failed:", err);
    return {
      status: "error",
      message: "Something went wrong generating your download. Call us and we'll send the spec sheet directly.",
    };
  }
}
