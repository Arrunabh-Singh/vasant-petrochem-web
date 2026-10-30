/**
 * The schema of every file in content/. Astro validates the content
 * collections against these at build time, and scripts/schema.ts exports them
 * as JSON Schema to content/_schemas/ for any other agent or editor.
 *
 * MNC P1/P5: nothing here may be filled with a plausible guess. Unknown
 * real-world values stay `null` until someone supplies them with evidence.
 */
import { z } from "astro/zod";

export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lower-case words joined by hyphens");

export const TINTS = ["gold", "straw", "amber", "brown", "fuel", "bitumen", "clear", "white"] as const;
export const PACK_UNITS = ["L", "kL", "kg", "MT"] as const;

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const specSchema = z.object({
  /** The catalog's own label, e.g. "Viscosity @40°C". */
  property: text(1, 60),
  /** The value exactly as the source gives it, e.g. "90-110" or "> 66". */
  value: text(1, 60),
  unit: text(1, 16).nullable(),
  /** Test method, e.g. "ASTM D445". Never guessed: null until the source names it. */
  method: text(2, 40).nullable(),
});

export const packSchema = z.object({
  type: text(2, 40),
  size: z.number().positive().nullable(),
  unit: z.enum(PACK_UNITS).nullable(),
});

export const productSchema = z
  .object({
    name: text(2, 80),
    code: text(2, 24),
    family: slug,
    status: z.enum(["draft", "published", "discontinued"]),
    /** `placeholder` until the values come from a supplier TDS or a COA. */
    data: z.enum(["placeholder", "verified"]),
    /** The evidence document for verified values (a path in content/documents/ or a reference). */
    source: text(3, 200).nullable(),
    order: z.number().int().min(0),
    tint: z.enum(TINTS),
    summary: text(10, 220),
    specs: z.array(specSchema).min(1).max(30),
    packaging: z.array(packSchema).min(1).max(8),
    applications: z.array(text(2, 60)).min(1).max(12),
    industries: z.array(slug).min(1).max(8),
    documents: z.object({
      sds: z.array(z.object({ lang: z.string().regex(/^[a-z]{2}$/), file: text(5, 200), rev: text(1, 40) })),
      tds: z.object({ file: text(5, 200) }).nullable(),
    }),
    hs: z.string().regex(/^\d{4}(?:\.?\d{2}){0,3}$/, "HS code digits, e.g. 2710.19.71").nullable(),
    cas: z.string().regex(/^\d{2,7}-\d{2}-\d$/, "CAS registry number, e.g. 64742-65-0").nullable(),
    /** kg/L at 15 °C, one verified value (never a range): enables MT/kL conversion in the quote basket. */
    density: z.number().min(0.5).max(1.5).nullable(),
    /** Country of origin for a traded grade, once known. */
    origin: text(2, 60).nullable(),
    faq: z.array(z.object({ q: text(5, 160), a: text(5, 800) })).max(12),
    seo: z.object({ title: text(5, 70).optional(), description: text(20, 170).optional() }).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.data === "verified" && !p.source) {
      ctx.addIssue({ code: "custom", path: ["source"], message: "A verified product must cite its evidence document in `source`." });
    }
    if (p.data === "placeholder" && p.documents.tds) {
      ctx.addIssue({ code: "custom", path: ["documents", "tds"], message: "A TDS is published only for verified products (MNC P1)." });
    }
  });

export const industrySchema = z.object({
  name: text(2, 60),
  order: z.number().int().min(0),
  status: z.enum(["draft", "published"]),
  icon: z.enum(["hardhat", "brush", "factory", "fuel", "truck", "pill"]),
  summary: text(10, 200),
});

export const familySchema = z.object({
  slug,
  name: text(2, 40),
  summary: text(10, 200),
  order: z.number().int().min(0),
});

export const claimSchema = z.object({
  id: slug,
  text: text(5, 300),
  status: z.enum(["verified", "owner-asserted", "retired"]),
  evidence: text(3, 200).nullable(),
  decided: z.string().regex(/^\d{4}(?:-\d{2}-\d{2})?$/),
  note: text(3, 400).nullable(),
});

export const certificationSchema = z.object({
  id: slug,
  name: text(2, 80),
  number: text(2, 60),
  issuer: text(2, 120),
  validFrom: z.iso.date(),
  validTo: z.iso.date(),
  file: text(5, 200),
});

export const personSchema = z.object({
  id: slug,
  name: text(2, 80),
  role: text(2, 80),
  photo: text(5, 200).nullable(),
  /** Written consent to publish the name and photograph. */
  consent: z.literal(true),
});

export const insightSchema = z.object({
  title: text(10, 110),
  summary: text(20, 220),
  date: z.coerce.date(),
  author: text(2, 80),
  status: z.enum(["draft", "published"]),
});

const blockItem = z.object({
  title: text(2, 80),
  body: text(2, 600).optional(),
  /** A claim id from content/claims.json; the page shows that claim's text. */
  claim: slug.optional(),
  /** Where the item leads: a path on this site, or "whatsapp" for a chat with the sales desk. */
  href: z.string().regex(/^(\/[a-z0-9/-]*|whatsapp)$/).optional(),
  /** The link's words, saying where it goes ("Open the marketplace"). */
  cta: text(2, 40).optional(),
});

export const blockSchema = z.object({
  eyebrow: text(2, 60).optional(),
  heading: text(2, 120).optional(),
  body: text(2, 1200).optional(),
  items: z.array(blockItem).max(12).optional(),
});

export const pageSchema = z.object({
  /** <title>, without the " · Vasant Petrochem" suffix (the home page carries its full title). */
  title: text(2, 70),
  description: text(40, 170),
  status: z.enum(["draft", "published"]),
  headline: text(2, 120),
  lead: text(2, 400).optional(),
  blocks: z.record(z.string(), blockSchema).default({}),
});

export const corporateSchema = z
  .object({
    title: text(2, 70),
    description: text(40, 170),
    status: z.enum(["draft", "published"]),
    /** Date the published text took effect; required to publish. */
    updated: z.coerce.date().nullable(),
    /** A page that only exists once its facts do: people listed, the careers mailbox, an IEC. */
    requires: z.enum(["people", "careers-mailbox", "exports"]).optional(),
  })
  .superRefine((c, ctx) => {
    if (c.status === "published" && !c.updated) {
      ctx.addIssue({ code: "custom", path: ["updated"], message: "A published policy page states the date it took effect." });
    }
  });

export const companySchema = z.object({
  tradeName: text(2, 80),
  foundedYear: z.number().int().min(1900).max(2100),
  legalName: text(2, 160).nullable(),
  registeredOffice: text(5, 300).nullable(),
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, "a 15-character GSTIN").nullable(),
  udyam: z.string().regex(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, "UDYAM-XX-00-0000000").nullable(),
  cin: z.string().regex(/^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/, "a 21-character CIN").nullable(),
  iec: z.string().regex(/^[A-Z0-9]{10}$/, "a 10-character IEC").nullable(),
  exports: z.boolean(),
  works: z.object({
    street: text(2, 120),
    city: text(2, 60),
    region: text(2, 60),
    regionCode: text(2, 4),
    postalCode: z.string().regex(/^\d{6}$/),
    country: z.string().regex(/^[A-Z]{2}$/),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  phone: z.object({
    display: text(6, 24),
    href: z.string().regex(/^tel:\+\d{8,15}$/),
    whatsapp: z.string().regex(/^\d{8,15}$/),
  }),
  email: z.email(),
  mailboxes: z.object({
    sales: z.email().nullable(),
    documents: z.email().nullable(),
    careers: z.email().nullable(),
    security: z.email().nullable(),
  }),
  hours: z.object({
    label: text(5, 80),
    days: text(3, 40),
    time: text(3, 40),
    opens: z.string().regex(/^\d{2}:\d{2}$/),
    closes: z.string().regex(/^\d{2}:\d{2}$/),
    dayOfWeek: z.array(z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])).min(1),
  }),
  social: z.object({
    linkedin: z.url().nullable(),
    indiamart: z.url().nullable(),
    justdial: z.url().nullable(),
    googleBusiness: z.url().nullable(),
  }),
  /** TODO(VP-HUM-xxx) markers for the values above that are still null. Never rendered. */
  _todo: z.record(z.string(), z.string()).optional(),
  $schema: z.string().optional(),
});

export const navigationSchema = z.object({
  header: z.array(z.object({ label: text(2, 30), href: z.string().startsWith("/") })).min(2).max(7),
  footer: z
    .array(
      z.object({
        heading: text(2, 30),
        links: z.array(z.object({ label: text(2, 40), href: z.string().startsWith("/") })).min(1).max(10),
      }),
    )
    .min(1)
    .max(5),
});

export type Product = z.infer<typeof productSchema>;
export type Company = z.infer<typeof companySchema>;
export type Claim = z.infer<typeof claimSchema>;
