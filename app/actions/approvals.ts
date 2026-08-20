"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/rbac";

export type ApprovalFormState = { status: "idle" | "success" | "error"; message?: string };

const KINDS = ["expense", "purchase_order", "payout", "other"];

/** Any authenticated app_user can request — the 2-person rule is enforced in the DB trigger, not here. */
export async function requestApproval(
  _prevState: ApprovalFormState,
  formData: FormData
): Promise<ApprovalFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { status: "error", message: "Sign in first." };

  const kind = String(formData.get("kind") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!KINDS.includes(kind) || !subject) {
    return { status: "error", message: "Kind and subject are required." };
  }

  const { error } = await supabase.from("approval_requests").insert({
    kind,
    subject,
    amount: amountRaw ? Number(amountRaw) : null,
    requested_by: user.email,
    reason: reason || null,
  });

  if (error) {
    console.error("requestApproval failed:", error.message);
    return { status: "error", message: "Could not submit the request." };
  }

  revalidatePath("/admin/approvals");
  return { status: "success" };
}

/**
 * audit.md-style maker-checker: approved_by is set by the DB trigger from
 * the caller's own session, not from client input, so this can only ever
 * decide as the currently-authenticated admin/approver — never spoof
 * someone else's decision.
 */
export async function decideApproval(id: string, decision: "approved" | "rejected") {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("approval_requests").update({ status: decision }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/approvals");
}
