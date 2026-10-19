import data from "../../../content/navigation.json" with { type: "json" };
import { getCollection } from "astro:content";
import { navigationSchema } from "../content/schema.ts";

export const navigation = navigationSchema.parse(data);

/**
 * Footer links to pages that are empty today (no certificates held, no
 * articles yet) stay out of the menus until there is something behind them;
 * the pages themselves still render their empty state.
 */
export async function footerColumns() {
  const [certs, insights] = await Promise.all([
    getCollection("certifications"),
    getCollection("insights", (i) => i.data.status === "published"),
  ]);
  const hidden = new Set<string>();
  if (certs.length === 0) hidden.add("/certifications");
  if (insights.length === 0) hidden.add("/insights");
  return navigation.footer.map((col) => ({ ...col, links: col.links.filter((l) => !hidden.has(l.href)) }));
}

/** True when `path` is `href` or below it ("/products/x" is under "/marketplace"). */
export function isCurrent(href: string, path: string): boolean {
  if (href === "/marketplace" && path.startsWith("/products")) return true;
  return path === href || path.startsWith(`${href}/`);
}
