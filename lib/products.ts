// Extension-qualified so `node --test` (ESM resolver, no bundler) can
// import this module directly — same reason lib/notify.ts does it.
import { createPublicClient } from "./supabase/public.ts";
import { coerceSpecs, coerceStringArray, type ProductSpec } from "./validate.ts";

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

/**
 * Non-throwing variant for *decorative* consumers — the footer's product
 * nav list, and anywhere else an empty list is a cosmetic degradation
 * rather than a misleading claim about the catalog.
 *
 * getProducts() deliberately throws (audit.md M20) so that a real outage
 * surfaces on /products and the homepage grid instead of rendering as
 * "we sell nothing". But the footer renders on *every* route, so that
 * same throw turned any Supabase blip — including an unreachable DB at
 * build time — into a hard failure of /about, /industries and /contact,
 * and aborted the production build outright. Pages that assert something
 * about the catalog keep using getProducts(); chrome uses this.
 */
export async function getProductsSafe(): Promise<Product[]> {
  try {
    return await getProducts();
  } catch (err) {
    console.error("getProductsSafe: catalog unavailable, rendering without it:", err);
    return [];
  }
}

/**
 * Catalog read that reports *why* it is empty.
 *
 * audit.md M20's concern is real: a Supabase outage rendering as a silent
 * empty grid tells nobody anything. But answering it with a bare throw
 * conflated two different situations — a visitor hitting a live outage
 * (who needs to be told) and a production build running against no
 * database at all (CI builds with placeholder credentials by design, and
 * a first Vercel deploy has no reachable project yet). The throw aborted
 * the build outright.
 *
 * `degraded: true` lets a page distinguish "we genuinely list nothing"
 * from "we could not reach the catalog" and say so on the page, which is
 * a *stronger* signal than M20's generic error boundary — and it keeps a
 * catalog outage from taking down the rest of the site with it.
 */
export async function getCatalog(): Promise<{ products: Product[]; degraded: boolean }> {
  try {
    return { products: await getProducts(), degraded: false };
  } catch (err) {
    console.error("getCatalog: catalog unavailable:", err);
    return { products: [], degraded: true };
  }
}
