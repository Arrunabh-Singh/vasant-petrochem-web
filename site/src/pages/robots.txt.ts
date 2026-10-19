/** Production invites every crawler, AI search included; a preview build invites none. */
import type { APIRoute } from "astro";
import { showDrafts } from "../lib/catalog.ts";
import { abs } from "../lib/seo.ts";

export const GET: APIRoute = () => {
  const text = showDrafts
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${abs("/sitemap.xml")}\n`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
