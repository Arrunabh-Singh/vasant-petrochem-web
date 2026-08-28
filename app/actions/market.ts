"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/rbac";

function str(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createBenchmark(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    grade: str(formData.get("grade")) ?? "UNKNOWN",
    source: str(formData.get("source")),
    price: num(formData.get("price")),
    currency: str(formData.get("currency")) ?? "USD",
    uom: str(formData.get("uom")) ?? "bbl",
    as_of: str(formData.get("as_of")) ?? today,
  };

  const { error } = await supabase.from("market.price_benchmark").insert(payload);
  if (error) console.error("createBenchmark failed:", error.message);
  revalidatePath("/admin/market/benchmarks");
}
