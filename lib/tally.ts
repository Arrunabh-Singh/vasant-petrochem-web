import { createClient } from "@/lib/supabase/server";

export type TallyCompany = {
  name: string;
  tally_guid: string | null;
  last_synced: string;
};

export type TallyLedger = {
  company: string;
  name: string;
  parent: string | null;
  closing_amount: number | null;
  closing_type: string | null;
  opening_amount: number | null;
  opening_type: string | null;
  last_synced: string;
};

export type TallyStockItem = {
  company: string;
  name: string;
  parent: string | null;
  closing_qty: number | null;
  closing_value: number | null;
  rate: number | null;
  last_synced: string;
};

export type TallySyncLog = {
  id: number;
  ran_at: string;
  status: string;
  companies: number;
  ledgers: number;
  stock: number;
  error: string | null;
};

export async function getTallyCompanies(): Promise<TallyCompany[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tally.company")
    .select("name, tally_guid, last_synced")
    .order("name");
  if (error) {
    console.error("getTallyCompanies failed:", error.message);
    return [];
  }
  return (data as TallyCompany[]) ?? [];
}

export async function getTallyLedgers(q?: string): Promise<TallyLedger[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tally.ledger")
    .select("company, name, parent, closing_amount, closing_type, opening_amount, opening_type, last_synced")
    .order("company")
    .order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query;
  if (error) {
    console.error("getTallyLedgers failed:", error.message);
    return [];
  }
  return (data as TallyLedger[]) ?? [];
}

export async function getTallyStock(q?: string): Promise<TallyStockItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tally.stock_item")
    .select("company, name, parent, closing_qty, closing_value, rate, last_synced")
    .order("company")
    .order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query;
  if (error) {
    console.error("getTallyStock failed:", error.message);
    return [];
  }
  return (data as TallyStockItem[]) ?? [];
}

export async function getLastTallySync(): Promise<TallySyncLog | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tally.sync_log")
    .select("id, ran_at, status, companies, ledgers, stock, error")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("getLastTallySync failed:", error.message);
    return null;
  }
  return (data as TallySyncLog) ?? null;
}
