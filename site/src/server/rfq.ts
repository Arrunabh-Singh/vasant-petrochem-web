/**
 * The enquiry contract: everything /api/rfq accepts, validated on the server
 * whatever the browser did. Products are checked against the catalogue the
 * site was built from; quantities and units against fixed lists.
 */
import { z } from "astro/zod";
import { email, phone, requiredText, text } from "./text.ts";

export const TYPES = ["quote", "sample", "contract", "source", "document", "supplier", "general"] as const;
export const UNITS = ["MT", "kL", "L", "kg", "drums", "pails"] as const;
export const DOCS = ["coa", "tds", "sds"] as const;
export const MAX_LINES = 20;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QTY = /^(?:\d{1,7}(?:\.\d{1,3})?)?$/;
const qty = text("Quantity", 11).refine((v) => QTY.test(v), "Enter the quantity as a number, like 20 or 12.5.");
const unit = z.preprocess((v) => (v === "" || v == null ? "MT" : v), z.enum(UNITS, { error: "Choose a unit from the list." }));

const lineSchema = z.object({
  slug: z.string().regex(SLUG).max(80),
  qty,
  unit,
  pack: text("Packaging", 60),
  notes: text("Notes", 200),
});

const list = (v: unknown) => (v === undefined || v === "" ? [] : Array.isArray(v) ? v : [v]);

export const rfqSchema = z
  .object({
    type: z.enum(TYPES, { error: "Choose what the enquiry is about." }),
    product: z.string().regex(SLUG).max(80).optional().or(z.literal("")),
    qty,
    unit,
    lines: z.preprocess((v) => {
      if (v === undefined || v === "") return [];
      if (typeof v !== "string" || v.length > 20_000) return null;
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    }, z.array(lineSchema, { error: "The product list could not be read. Reload the page and try again." }).max(MAX_LINES, `Send at most ${MAX_LINES} products in one enquiry.`)),
    product_text: text("Product", 200),
    spec: text("Specification", 2000),
    products_text: text("Other products", 2000),
    monthly_volume: text("Monthly volume", 60),
    contract_months: text("Months", 3).refine((v) => /^\d{0,3}$/.test(v), "Enter the number of months."),
    delivery_city: text("Delivery city", 120),
    delivery_country: text("Destination country", 60),
    delivery_port: text("Port", 80),
    required_by: text("Date", 10).refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Choose a date."),
    docs: z.preprocess(list, z.array(z.enum(DOCS)).max(DOCS.length)),
    name: requiredText("Name", 120, "Enter your name so we know who to reply to."),
    company: text("Company", 160),
    email,
    phone,
    message: text("Message", 2000),
    offer_ref: text("Offer", 36).refine((v) => v === "" || /^[0-9a-f-]{36}$/.test(v), "That offer link is not valid."),
    utm_source: text("utm_source", 120),
    utm_medium: text("utm_medium", 120),
    utm_campaign: text("utm_campaign", 120),
    utm_content: text("utm_content", 120),
    utm_term: text("utm_term", 120),
    landing_page: text("Landing page", 200).refine((v) => v === "" || v.startsWith("/"), "Invalid landing page."),
    referrer: text("Referrer", 120),
  })
  .superRefine((d, ctx) => {
    if (d.type === "source" && !d.product_text) {
      ctx.addIssue({ code: "custom", path: ["product_text"], message: "Tell us which product or grade you need." });
    }
    const asked = d.lines.length > 0 || d.product || d.product_text || d.products_text || d.message || d.spec;
    if (!asked) {
      ctx.addIssue({ code: "custom", path: ["products_text"], message: "Add a product, or describe what you need." });
    }
    if (d.required_by) {
      const when = Date.parse(`${d.required_by}T00:00:00Z`);
      const day = 86_400_000;
      if (Number.isNaN(when) || when < Date.now() - 2 * day || when > Date.now() + 730 * day) {
        ctx.addIssue({ code: "custom", path: ["required_by"], message: "Choose a date within the next two years." });
      }
    }
  });

export type RfqInput = z.infer<typeof rfqSchema>;
export type CatalogItem = { slug: string; name: string; code: string };

export type Enquiry = {
  request_type: (typeof TYPES)[number];
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  lines: { slug: string; name: string; code: string; qty: string; unit: string; pack: string; notes: string }[];
  product_label: string;
  quantity: string;
  delivery_city: string;
  delivery_country: string;
  delivery_port: string;
  required_by: string;
  offer_ref: string;
  utm: Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string>;
  landing_page: string;
  referrer: string;
};

export type Parsed = { ok: true; enquiry: Enquiry } | { ok: false; errors: Record<string, string> };

const TYPE_LABEL: Record<Enquiry["request_type"], string> = {
  quote: "Price quote",
  sample: "Sample request",
  contract: "Contract supply",
  source: "Source a grade",
  document: "Documents",
  supplier: "Supplier",
  general: "General enquiry",
};

/**
 * Validates a raw form (JSON or urlencoded, already decoded to strings) and
 * resolves product slugs against the catalogue. Unknown products are an error,
 * never silently dropped.
 */
export function parseRfq(raw: Record<string, unknown>, catalog: CatalogItem[], exportsEnabled: boolean): Parsed {
  const result = rfqSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const d = result.data;
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));
  const rawLines = d.lines.length > 0 ? d.lines : d.product ? [{ slug: d.product, qty: d.qty, unit: d.unit, pack: "", notes: "" }] : [];
  const seen = new Set<string>();
  const lines: Enquiry["lines"] = [];
  for (const l of rawLines) {
    const item = bySlug.get(l.slug);
    if (!item) return { ok: false, errors: { products_text: "One of the products is no longer in the catalogue. Reload the page and try again." } };
    if (seen.has(l.slug)) continue;
    seen.add(l.slug);
    lines.push({ slug: l.slug, name: item.name, code: item.code, qty: l.qty, unit: l.unit, pack: l.pack, notes: l.notes });
  }
  if (!exportsEnabled && (d.delivery_country || d.delivery_port)) {
    return { ok: false, errors: { delivery_country: "We currently supply within India." } };
  }

  const docNames: Record<(typeof DOCS)[number], string> = { coa: "certificate of analysis", tds: "TDS", sds: "SDS" };
  const extra = [
    d.product_text && `Product: ${d.product_text}`,
    d.spec && `Specification: ${d.spec}`,
    d.products_text && `Other products: ${d.products_text}`,
    d.type === "contract" && (d.monthly_volume || d.contract_months) && `Contract: ${d.monthly_volume || "volume not given"}${d.contract_months ? ` for ${d.contract_months} months` : ""}`,
    d.docs.length > 0 && `Documents wanted: ${d.docs.map((k) => docNames[k]).join(", ")}`,
  ].filter(Boolean) as string[];

  const product_label = lines.length > 0 ? lines.map((l) => `${l.name} (${l.code})`).join(", ").slice(0, 200) : d.product_text.slice(0, 200);
  const quantity = lines
    .filter((l) => l.qty)
    .map((l) => `${l.qty} ${l.unit}${lines.length > 1 ? ` ${l.code}` : ""}`)
    .join(", ")
    .slice(0, 100) || (d.qty ? `${d.qty} ${d.unit}` : "");

  return {
    ok: true,
    enquiry: {
      request_type: d.type,
      name: d.name,
      email: d.email,
      company: d.company,
      phone: d.phone,
      message: [`${TYPE_LABEL[d.type]}.`, ...extra, d.message].filter(Boolean).join("\n\n").slice(0, 5000),
      lines,
      product_label,
      quantity,
      delivery_city: d.delivery_city,
      delivery_country: d.delivery_country,
      delivery_port: d.delivery_port,
      required_by: d.required_by,
      offer_ref: d.offer_ref,
      utm: {
        utm_source: d.utm_source,
        utm_medium: d.utm_medium,
        utm_campaign: d.utm_campaign,
        utm_content: d.utm_content,
        utm_term: d.utm_term,
      },
      landing_page: d.landing_page,
      referrer: d.referrer,
    },
  };
}
