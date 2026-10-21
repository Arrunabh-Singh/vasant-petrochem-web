/** Every indexable page: the search index's pages, minus drafts (never in a production build anyway). */
import type { APIRoute } from "astro";
import { searchGroups } from "../lib/search.ts";
import { abs } from "../lib/seo.ts";

export const GET: APIRoute = async () => {
  const paths = [...new Set((await searchGroups()).flatMap((g) => g.hits.map((h) => h.u)))].sort();
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...paths.map((p) => `  <url><loc>${abs(p)}</loc></url>`),
    `</urlset>`,
    "",
  ].join("\n");
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
