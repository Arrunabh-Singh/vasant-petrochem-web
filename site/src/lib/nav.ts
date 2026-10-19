import data from "../../../content/navigation.json" with { type: "json" };
import { getCollection } from "astro:content";
import { navigationSchema } from "../content/schema.ts";
import { corporatePages, liveCertifications, liveInsights } from "./page.ts";

export const navigation = navigationSchema.parse(data);

/**
 * Paths with nothing behind them yet: no certificates held, no articles, a
 * policy page still in draft. Menus, search and the sitemap leave them out;
 * the certificate and article pages still render their empty state.
 */
export const hiddenPaths = () => (hidden ??= findHidden());
let hidden: Promise<Set<string>> | undefined;

async function findHidden(): Promise<Set<string>> {
  const [certs, insights, live, corporate] = await Promise.all([
    liveCertifications(),
    liveInsights(),
    corporatePages(),
    getCollection("corporate"),
  ]);
  const hidden = new Set<string>();
  if (certs.length === 0) hidden.add("/certifications");
  if (insights.length === 0) hidden.add("/insights");
  for (const c of corporate) if (!live.some((l) => l.id === c.id)) hidden.add(`/${c.id}`);
  return hidden;
}

export async function footerColumns() {
  const hidden = await hiddenPaths();
  return navigation.footer
    .map((col) => ({ ...col, links: col.links.filter((l) => !hidden.has(l.href)) }))
    .filter((col) => col.links.length > 0);
}

/** True when `path` is `href` or below it ("/products/x" is under "/marketplace"). */
export function isCurrent(href: string, path: string): boolean {
  if (href === "/marketplace" && path.startsWith("/products")) return true;
  return path === href || path.startsWith(`${href}/`);
}
