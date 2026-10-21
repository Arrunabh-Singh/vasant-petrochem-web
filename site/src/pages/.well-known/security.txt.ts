/** RFC 9116 security contact. Served by the Worker so Expires is always about six months ahead. */
import type { APIRoute } from "astro";
import { company } from "../../lib/company.ts";
import { abs } from "../../lib/seo.ts";

export const prerender = false;

export const GET: APIRoute = () => {
  const expires = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, "Z");
  const text = [
    `Contact: mailto:${company.mailboxes.security ?? company.email}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${abs("/.well-known/security.txt")}`,
    "",
  ].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
};
