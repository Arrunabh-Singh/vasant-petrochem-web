/**
 * The site search index: every product, industry, article and page, as the
 * /search page lists it and the search dialog loads it (/search-index.json).
 */
import { getCollection } from "astro:content";
import { familyName, getIndustries, getProducts } from "./catalog.ts";
import { hiddenPaths } from "./nav.ts";
import { corporatePages, liveInsights } from "./page.ts";

/** t: title, u: URL, s: the line shown under it, k: extra words it is found by. */
export type Hit = { t: string; u: string; s: string; k: string };
export type Group = { name: string; hits: Hit[] };

// Where each page's copy (content/pages/<id>.json) is published.
const PAGE_PATHS: Record<string, string> = {
  home: "/",
  marketplace: "/marketplace",
  offers: "/marketplace/offers",
  quote: "/quote",
  source: "/source",
  contact: "/contact",
  about: "/about",
  supply: "/supply",
  industries: "/industries",
  documents: "/documents",
  certifications: "/certifications",
  insights: "/insights",
};

export async function searchGroups(): Promise<Group[]> {
  const [products, industries, posts, corporate, pages, hidden] = await Promise.all([
    getProducts(),
    getIndustries(),
    liveInsights(),
    corporatePages(),
    getCollection("pages"),
    hiddenPaths(),
  ]);
  const industryName = new Map(industries.map((i) => [i.id, i.data.name]));
  const productHits = await Promise.all(
    products.map(async (p) => ({
      t: p.data.name,
      u: `/products/${p.id}`,
      s: `${p.data.code} · ${await familyName(p.data.family)}`,
      k: [p.data.summary, ...p.data.applications, ...p.data.industries.map((i) => industryName.get(i) ?? ""), p.data.hs ?? "", p.data.cas ?? ""].join(" "),
    })),
  );
  const pageHits = [
    ...pages.flatMap((p) => {
      const u = PAGE_PATHS[p.id];
      return u && !hidden.has(u) ? [{ t: p.id === "home" ? "Home" : p.data.title, u, s: p.data.description, k: p.data.headline }] : [];
    }),
    ...corporate.map((c) => ({ t: c.data.title, u: `/${c.id}`, s: c.data.description, k: "" })),
  ];
  return [
    { name: "Products", hits: productHits },
    { name: "Industries", hits: industries.map((i) => ({ t: i.data.name, u: `/industries/${i.id}`, s: i.data.summary, k: "" })) },
    { name: "Insights", hits: posts.map((p) => ({ t: p.data.title, u: `/insights/${p.id}`, s: p.data.summary, k: p.data.author })) },
    { name: "Pages", hits: pageHits },
  ].filter((g) => g.hits.length > 0);
}
