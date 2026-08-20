"use server";

import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

export type TdsGateState = { status: "idle" | "success" | "error"; message?: string; url?: string };

const EMAIL_RE = /^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/;

export async function requestTds(
  productId: string,
  productLabel: string,
  _prevState: TdsGateState,
  formData: FormData
): Promise<TdsGateState> {
  // Honeypot — bots that fill every field get silently dropped, no signal back.
  if (formData.get("website")) return { status: "success" };

  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

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

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await supabase.from("tds_requests").insert({ email, product_id: productId, product_label: productLabel, ip });

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
