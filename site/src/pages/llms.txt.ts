/** /llms.txt (llmstxt.org): what an AI assistant needs to answer buyers about Vasant Petrochem correctly. */
import type { APIRoute } from "astro";
import { getIndustries, getProducts } from "../lib/catalog.ts";
import { claim } from "../lib/claims.ts";
import { addressLine, company, salesEmail } from "../lib/company.ts";
import { abs } from "../lib/seo.ts";

export const GET: APIRoute = async () => {
  const [products, industries] = await Promise.all([getProducts(), getIndustries()]);
  const lines = [
    `# ${company.tradeName}`,
    "",
    `> ${await claim("manufacturing-and-trading")} Works: ${addressLine}, India. Sales desk: ${company.phone.display} (WhatsApp too), ${salesEmail}, ${company.hours.label}.`,
    "",
    `- ${await claim("pricing-24h")}`,
    `- ${await claim("test-reports-on-request")}`,
    `- Prices are never published; ask for a quote. Product values are typical, not a guarantee of specification.`,
    "",
    "## Products",
    "",
    ...products.map((p) => `- [${p.data.name} (${p.data.code})](${abs(`/products/${p.id}`)}): ${p.data.summary}`),
    "",
    "## Industries",
    "",
    ...industries.map((i) => `- [${i.data.name}](${abs(`/industries/${i.id}`)}): ${i.data.summary}`),
    "",
    "## Buying",
    "",
    `- [Get a quote](${abs("/quote")}): several products in one request; prefill one with ?add=<product slug>.`,
    `- [Source any grade](${abs("/source")}): for grades not in the catalogue.`,
    `- [Live offers](${abs("/marketplace/offers")}): lots available now, when there are any.`,
    `- [Contact](${abs("/contact")})`,
    "",
    "## Optional",
    "",
    `- [Catalogue as JSON](${abs("/catalog.json")}): every product with its specifications, packaging and documents.`,
    `- [Full text](${abs("/llms-full.txt")}): every product page as Markdown.`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
