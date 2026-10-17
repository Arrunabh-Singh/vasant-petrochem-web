import type { MetadataRoute } from "next";
import { site } from "./content";
import { getProductsSafe } from "@/lib/products";

export const revalidate = 3600;

/**
 * Every indexable route. The static list previously held only the
 * homepage ("Single page today"), which stopped being true once /about,
 * /industries, /products and /contact shipped — Google was left to find
 * them by crawling alone, and the per-product detail pages (the actual
 * commercial landing pages someone searching "rubber process oil Indore"
 * should land on) were absent entirely.
 *
 * Product URLs come from the catalog, so they stay correct as the owner
 * publishes and unpublishes lines from /admin. getProductsSafe() keeps a
 * catalog outage from turning sitemap.xml into a build or request error;
 * a sitemap briefly missing product rows is recoverable, a 500 is not.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/products`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site.url}/industries`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  const products = await getProductsSafe();
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${site.url}/products/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
