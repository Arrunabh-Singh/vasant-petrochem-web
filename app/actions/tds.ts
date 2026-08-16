"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

export type TdsGateState = { status: "idle" | "success" | "error"; message?: string; url?: string };

export async function requestTds(
  productId: string,
  productLabel: string,
  _prevState: TdsGateState,
  formData: FormData
): Promise<TdsGateState> {
  // Honeypot — bots that fill every field get silently dropped, no signal back.
  if (formData.get("website")) return { status: "success" };

  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = createPublicClient();
  const { data: product } = await supabase
    .from("products")
    .select("tds_path")
    .eq("id", productId)
    .eq("published", true)
    .maybeSingle();

  await supabase.from("tds_requests").insert({ email, product_id: productId, product_label: productLabel });

  if (!product?.tds_path) {
    return { status: "error", message: "Spec sheet isn't uploaded yet — we've logged your request and will email it within 24 hours." };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from("tds").createSignedUrl(product.tds_path, 60 * 15);
    if (error || !data) throw error ?? new Error("no signed url returned");
    return { status: "success", url: data.signedUrl };
  } catch (err) {
    console.error("TDS signed URL failed:", err);
    return { status: "error", message: "Something went wrong generating your download. We've logged your request and will email the spec sheet directly." };
  }
}
