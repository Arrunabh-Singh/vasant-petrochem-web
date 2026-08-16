import { createPublicClient } from "./supabase/public";

export type ProductSpec = { label: string; value: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  code: string;
  description: string;
  specs: ProductSpec[];
  applications: string[];
  industries: string[];
  packaging: string | null;
  tds_path: string | null;
  display_order: number;
};

const COLUMNS =
  "id, slug, name, code, description, specs, applications, industries, packaging, tds_path, display_order";

export async function getProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getProducts failed:", error.message);
    return [];
  }
  return data as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Product;
}
