"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/rbac";
import type { LeadStatus } from "@/lib/admin";

const VALID_STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "won", "lost"];

export async function updateLeadStatus(id: string, status: LeadStatus) {
  await requireAdmin();

  // audit.md M11: status arrived typed only at the TypeScript boundary —
  // a raw HTTP POST to this action's encrypted action id bypassed that
  // entirely. The DB CHECK (M3) is the backstop; this is the fast-fail.
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Invalid status.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
  if (error) {
    console.error("updateLeadStatus failed:", error.message);
    throw new Error("Could not update lead status.");
  }
  revalidatePath("/admin");
}
