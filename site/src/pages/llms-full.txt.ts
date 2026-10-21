/** /llms-full.txt: every product page as Markdown, for assistants that read one file. */
import type { APIRoute } from "astro";
import { familyName, getProducts, packagingLine } from "../lib/catalog.ts";
import { disclaimer } from "../lib/claims.ts";
import { company, salesEmail } from "../lib/company.ts";
import { abs } from "../lib/seo.ts";

export const GET: APIRoute = async () => {
  const products = await getProducts();
  const note = await disclaimer();
  const sections = await Promise.all(
    products.map(async (p) => {
      const methods = p.data.specs.some((s) => s.method);
      return [
        `## ${p.data.name} (${p.data.code})`,
        "",
        `${abs(`/products/${p.id}`)} · ${await familyName(p.data.family)}${p.data.data === "placeholder" ? " · values awaiting confirmation" : ""}`,
        "",
        p.data.summary,
        "",
        (p.body ?? "").trim(),
        "",
        methods ? "| Property | Typical value | Method |" : "| Property | Typical value |",
        methods ? "| --- | --- | --- |" : "| --- | --- |",
        ...p.data.specs.map((s) => `| ${s.property} | ${s.unit ? `${s.value} ${s.unit}` : s.value}${methods ? ` | ${s.method ?? ""}` : ""} |`),
        "",
        `Packaging: ${packagingLine(p)}. Applications: ${p.data.applications.join(", ")}.`,
        ...(p.data.hs ? [`HS code: ${p.data.hs}.`] : []),
        ...(p.data.cas ? [`CAS: ${p.data.cas}.`] : []),
        ...p.data.faq.flatMap((f) => ["", `**${f.q}** ${f.a}`]),
        "",
      ].join("\n");
    }),
  );
  const text = [
    `# ${company.tradeName}: product catalogue`,
    "",
    `> ${note} Prices on request: ${company.phone.display}, ${salesEmail}, ${abs("/quote")}.`,
    "",
    ...sections,
  ].join("\n");
  return new Response(text.replace(/\n{3,}/g, "\n\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
