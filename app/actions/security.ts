"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminViaClient } from "@/lib/rbac";
import { notify } from "@/lib/notify";

/**
 * FEATURE_BACKLOG.md F3: one switch — freeze writes, hide figures, force
 * re-auth, alert the family. requireAdmin() itself checks breach_mode
 * (lib/rbac.ts), so flipping it on immediately blocks every other admin
 * action in the app, including turning it back off through the normal
 * write path — this toggle is intentionally the one action allowed to
 * bypass that check, or nobody could ever clear the freeze.
 */
export async function setSystemFlag(key: "breach_mode" | "holiday_mode", value: boolean, note?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !(await isAdminViaClient(supabase, user.email))) {
    throw new Error("Only admin can change system flags.");
  }

  const { error } = await supabase
    .from("system_flags")
    .update({ value, note: note ?? null, set_by: user.email })
    .eq("key", key);
  if (error) throw new Error(error.message);

  await supabase.rpc("log_event", {
    p_action: key === "breach_mode" ? (value ? "breach_mode_on" : "breach_mode_off") : (value ? "holiday_mode_on" : "holiday_mode_off"),
    p_object_type: "system",
    p_meta: { note: note ?? null },
    p_actor_email: user.email,
  });

  if (key === "breach_mode" && value) {
    await notify("critical", "Breach-mode freeze enabled", `Enabled by ${user.email}. All admin writes are now blocked until cleared.`);
  }

  revalidatePath("/admin/security");
}

export async function ackAlert(id: number) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("security_alerts").update({ acked_at: new Date().toISOString(), acked_by: admin.email }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/security");
}
