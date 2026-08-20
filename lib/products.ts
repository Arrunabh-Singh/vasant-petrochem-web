import { createPublicClient } from "./supabase/public";
import { coerceSpecs, coerceStringArray, type ProductSpec } from "./validate";

export type { ProductSpec };

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
};

// audit.md M19: tds_path and display_order dropped from the public
// projection. tds_path let any visitor enumerate private-bucket object
// names (app/actions/tds.ts fetches it directly, scoped to one request);
// display_order is unused past the ORDER BY, which works without being
// selected.
const COLUMNS = "id, slug, name, code, description, specs, applications, industries, packaging";

function toProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    code: row.code as string,
    description: row.description as string,
    specs: coerceSpecs(row.specs),
    applications: coerceStringArray(row.applications),
    industries: coerceStringArray(row.industries),
    packaging: (row.packaging as string | null) ?? null,
  };
}

export async function getProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("published", true)
    .order("display_order", { ascending: true });

  // audit.md M20: a real outage used to render as an empty catalog with
  // no signal anyone could act on. Throw and let app/error.tsx render
  // instead of silently blanking the homepage and /products.
  if (error) {
    throw new Error(`getProducts failed: ${error.message}`);
  }
  return (data ?? []).map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`getProductBySlug failed: ${error.message}`);
  }
  // No error, no row: a genuine 404 (unknown/unpublished slug) — the
  // caller's notFound() is correct here, unlike the error case above.
  return data ? toProduct(data) : null;
}
