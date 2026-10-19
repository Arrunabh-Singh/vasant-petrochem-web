/**
 * The whole public catalogue as JSON, for procurement systems and AI agents.
 * `data: "placeholder"` marks values not yet confirmed by a supplier TDS or a
 * certificate of analysis; prices are never published.
 */
import type { APIRoute } from "astro";
import { familyName, getProducts, specText } from "../lib/catalog.ts";
import { company, salesEmail } from "../lib/company.ts";
import { abs } from "../lib/seo.ts";

export const GET: APIRoute = async () => {
  const products = await getProducts();
  const body = {
    $comment: "Typical values, not a guarantee of specification. Ask the sales desk for prices and the test report for your consignment.",
    publisher: company.tradeName,
    url: abs("/marketplace"),
    contact: { phone: company.phone.display, whatsapp: `https://wa.me/${company.phone.whatsapp}`, email: salesEmail, quote: abs("/quote") },
    generated: new Date().toISOString(),
    products: await Promise.all(
      products.map(async (p) => ({
        slug: p.id,
        name: p.data.name,
        code: p.data.code,
        family: await familyName(p.data.family),
        url: abs(`/products/${p.id}`),
        data: p.data.data,
        summary: p.data.summary,
        specs: p.data.specs.map((s) => ({ property: s.property, value: s.value, unit: s.unit, method: s.method, text: specText(s) })),
        packaging: p.data.packaging,
        applications: p.data.applications,
        industries: p.data.industries,
        hs: p.data.hs,
        cas: p.data.cas,
        density_kg_per_l_15c: p.data.density,
        origin: p.data.origin,
        documents: {
          datasheet: abs(`/products/${p.id}/datasheet`),
          sds: p.data.documents.sds.map((s) => ({ lang: s.lang, rev: s.rev, url: abs(`/documents/${s.file}`) })),
          tds: p.data.documents.tds ? "on request with an email address" : "on request",
        },
        quote: abs(`/quote?add=${p.id}`),
      })),
    ),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
