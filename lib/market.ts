import { createClient } from "./supabase/server";

export type BenchmarkRow = {
  id: number;
  grade: string;
  source: string | null;
  price: number;
  currency: string | null;
  uom: string | null;
  as_of: string;
};

export async function getBenchmarksAdmin(): Promise<BenchmarkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market.price_benchmark")
    .select("id, grade, source, price, currency, uom, as_of")
    .order("as_of", { ascending: false });

  if (error) {
    console.error("getBenchmarksAdmin failed:", error.message);
    return [];
  }
  return data as BenchmarkRow[];
}
