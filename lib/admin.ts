import { createClient } from "./supabase/server";
import type { Product } from "./products";

/**
 * Authenticated-only reads: RLS grants the `authenticated` role broad access
 * to leads, unpublished products, and TDS files. Everything here requires an
 * admin session — see lib/supabase/server.ts and proxy.ts for the guard.
 */

export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";

export type Lead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  product_label: string | null;
  quantity: string | null;
  message: string | null;
  status: LeadStatus;
  created_at: string;
};

export async function getLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, name, email, company, product_label, quantity, message, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getLeads failed:", error.message);
    return [];
  }
  return data as Lead[];
}

export type TdsRequest = {
  id: string;
  email: string;
  product_label: string | null;
  created_at: string;
};

export async function getTdsRequests(): Promise<TdsRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tds_requests")
    .select("id, email, product_label, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getTdsRequests failed:", error.message);
    return [];
  }
  return data as TdsRequest[];
}

export type AdminProduct = Product & { published: boolean };

const ADMIN_COLUMNS =
  "id, slug, name, code, description, specs, applications, industries, packaging, tds_path, display_order, published";

export async function getAllProductsAdmin(): Promise<AdminProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getAllProductsAdmin failed:", error.message);
    return [];
  }
  return data as AdminProduct[];
}

export async function getProductByIdAdmin(id: string): Promise<AdminProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdminProduct;
}

export async function getAdminSignedTdsUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("tds").createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
