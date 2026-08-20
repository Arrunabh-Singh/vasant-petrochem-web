"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/rbac";

export type ComplianceFormState = { status: "idle" | "success" | "error"; message?: string };

const KINDS = ["licence", "insurance", "contract", "eway", "registration"];

export async function createComplianceItem(
  _prevState: ComplianceFormState,
  formData: FormData
): Promise<ComplianceFormState> {
  await requireAdmin();

  const kind = String(formData.get("kind") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const identifier = String(formData.get("identifier") ?? "").trim();
  const expiresOn = String(formData.get("expiresOn") ?? "");
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!KINDS.includes(kind) || !label || !expiresOn || !ownerEmail) {
    return { status: "error", message: "Kind, label, expiry date, and owner email are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("compliance_items").insert({
    kind,
    label,
    identifier: identifier || null,
    expires_on: expiresOn,
    owner_email: ownerEmail,
    notes: notes || null,
  });

  if (error) {
    console.error("createComplianceItem failed:", error.message);
    return { status: "error", message: "Could not save. Please try again." };
  }

  revalidatePath("/admin/compliance");
  return { status: "success" };
}

export async function markComplianceRenewed(id: string, newExpiresOn: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("compliance_items")
    .update({ expires_on: newExpiresOn, status: "active" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/compliance");
}

export async function archiveComplianceItem(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("compliance_items").update({ status: "archived" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/compliance");
}
