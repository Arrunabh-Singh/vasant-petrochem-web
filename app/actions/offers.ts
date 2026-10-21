"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/rbac";

export type OfferFormState = { status: "idle" | "success" | "error"; message?: string };

const UOMS = ["MT", "kL", "L", "kg", "drums", "pails"];

/**
 * The live offers board on the public site. A lot is proposed here (or by an
 * AI agent through the MCP tool propose_offer) and goes live only when a
 * different person publishes it. Both rules live in the database
 * (public.offer_propose / public.offer_review, migration site_r1): the
 * proposer and the approver are taken from the signed-in session, never from
 * the form, so neither can be spoofed from here.
 */
export async function proposeOffer(_prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  await requireAdmin();
  const field = (k: string) => String(formData.get(k) ?? "").trim();
  const p = {
    product_slug: field("product_slug"),
    title: field("title"),
    quantity: Number(field("quantity")),
    uom: field("uom"),
    location: field("location"),
    basis: field("basis"),
    valid_until: field("valid_until"),
    notes: field("notes"),
  };
  if (!p.product_slug || !p.title || !(p.quantity > 0) || !UOMS.includes(p.uom) || !p.location || !p.basis || !p.valid_until) {
    return { status: "error", message: "Fill in every field except the notes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("offer_propose", { p });
  if (error) {
    console.error("proposeOffer failed:", error.message);
    return { status: "error", message: /expired|valid today/.test(error.message) ? "The offer must be valid today or later." : "The offer could not be proposed." };
  }
  revalidatePath("/admin/market/offers");
  return { status: "success", message: "Proposed. Another approver must publish it before it goes live." };
}

export async function reviewOffer(id: string, action: "publish" | "withdraw"): Promise<OfferFormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("offer_review", { p_id: id, p_action: action });
  if (error) {
    console.error("reviewOffer failed:", error.message);
    const own = /someone other than its proposer/.test(error.message);
    return { status: "error", message: own ? "You proposed this lot, so someone else has to publish it." : "The offer could not be updated." };
  }
  revalidatePath("/admin/market/offers");
  return { status: "success" };
}
