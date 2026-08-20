"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/rbac";
import { mintMcpToken } from "@/lib/mcp-token-admin";

export type MintTokenState = { status: "idle" | "success" | "error"; message?: string; token?: string };

export async function mintToken(_prevState: MintTokenState, formData: FormData): Promise<MintTokenState> {
  const admin = await requireAdmin();
  const requesterEmail = String(formData.get("requesterEmail") ?? admin.email).trim();
  const ttlMinutes = Number(formData.get("ttlMinutes"));
  const monthlyTokenBudget = Number(formData.get("monthlyTokenBudget"));

  const result = await mintMcpToken({ requesterEmail, ttlMinutes, monthlyTokenBudget });
  if ("error" in result) return { status: "error", message: result.error };

  revalidatePath("/admin/security");
  return { status: "success", token: result.token };
}

export async function revokeMcpToken(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("mcp_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/security");
}
