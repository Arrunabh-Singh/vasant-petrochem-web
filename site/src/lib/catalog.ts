import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import { typeset, withUnit } from "./typeset.ts";

export type ProductEntry = CollectionEntry<"products">;
export type Spec = ProductEntry["data"]["specs"][number];
export type Pack = ProductEntry["data"]["packaging"][number];

/**
 * Drafts are left out of production builds and shown on previews: any
 * Cloudflare build of a branch other than main, or DRAFT_PREVIEW=1 locally.
 */
const branch = import.meta.env.WORKERS_CI_BRANCH;
export const showDrafts = import.meta.env.DRAFT_PREVIEW === "1" || (typeof branch === "string" && branch !== "" && branch !== "main");
const visible = (status: string) => status === "published" || (showDrafts && status === "draft");

export async function getProducts(): Promise<ProductEntry[]> {
  const all = await getCollection("products", (p) => visible(p.data.status));
  return all.sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name));
}

export async function getFamilies() {
  return (await getCollection("families")).sort((a, b) => a.data.order - b.data.order);
}

export async function getIndustries() {
  const all = await getCollection("industries", (i) => visible(i.data.status));
  return all.sort((a, b) => a.data.order - b.data.order);
}

export async function familyName(slug: string): Promise<string> {
  const f = await getEntry("families", slug);
  if (!f) throw new Error(`Unknown product family "${slug}": add it to content/families.json.`);
  return f.data.name;
}

/** "90–110 cSt": the catalog's value, typeset, with its unit. */
export const specText = (s: Spec) => withUnit(typeset(s.value), s.unit);

/** "210 L drum", plain text: enquiries carry it too. */
export const packText = (p: Pack) => (p.size ? `${p.size} ${p.unit ?? ""} ${p.type}`.replace("  ", " ") : p.type);

/** "210 L drum · 20 kL bulk tanker", each size kept on one line with its unit. */
export const packagingLine = (product: ProductEntry) =>
  product.data.packaging.map((p) => (p.size ? `${withUnit(String(p.size), p.unit)} ${p.type}` : p.type)).join(" · ");

/** The three values shown at a glance and on cards: the catalog's first three. */
export const keySpecs = (product: ProductEntry) => product.data.specs.slice(0, 3);

/** Same industry first, then catalog order. */
export function related(product: ProductEntry, all: ProductEntry[], count = 3): ProductEntry[] {
  const others = all.filter((o) => o.id !== product.id);
  const shares = (o: ProductEntry) => o.data.industries.some((i) => product.data.industries.includes(i));
  return [...others.filter(shares), ...others.filter((o) => !shares(o))].slice(0, count);
}

/** "Base Oil SN500 (SN-500)": how a product is named in forms and messages. */
export const productLabel = (product: ProductEntry) => `${product.data.name} (${product.data.code})`;
