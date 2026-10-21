/**
 * The brand kit: ads, social images and print pieces. The site's own pages
 * under /kit/ draw them with the real tokens, fonts and drops, on preview
 * builds only; scripts/kit.mjs saves each at its exact size. Formats and copy
 * rules: design-system/advertising.md.
 */
import { getCollection } from "astro:content";
import { getProducts, showDrafts, type ProductEntry } from "./catalog.ts";

/** Ad sizes, and the platforms each one is placed on (design-system/advertising.md). */
export const AD_FORMATS = {
  square: { w: 1080, h: 1080, sources: ["meta", "linkedin", "whatsapp"] },
  portrait: { w: 1080, h: 1350, sources: ["meta"] },
  story: { w: 1080, h: 1920, sources: ["meta", "whatsapp"] },
  landscape: { w: 1200, h: 628, sources: ["linkedin", "google"] },
  "display-square": { w: 1200, h: 1200, sources: ["google"] },
} as const;
export type AdFormat = keyof typeof AD_FORMATS;
export const GROUNDS = ["deep", "cream"] as const;
export type Ground = (typeof GROUNDS)[number];

export const SOCIAL = {
  "linkedin-banner": { w: 1584, h: 396 },
  avatar: { w: 400, h: 400 },
  whatsapp: { w: 640, h: 640 },
} as const;

/** One file of the kit: the page that draws it, and how scripts/kit.mjs saves it. */
export type KitItem = {
  path: string;
  kind: "png" | "pdf";
  /** CSS pixels for png; millimetres for pdf. */
  w: number;
  h: number;
  /** Device pixels per CSS pixel (print-resolution PNGs). */
  scale?: number;
  out: string;
  /** For ads: the format, where the ad links (before its UTM tags) and the platforms it runs on. */
  format?: AdFormat;
  landing?: string;
  sources?: readonly string[];
};

export type Creative = { id: string; product: ProductEntry | null };

export async function creatives(): Promise<Creative[]> {
  return [{ id: "range", product: null }, ...(await getProducts()).map((p) => ({ id: p.id, product: p }))];
}

export async function industryNames(): Promise<Map<string, string>> {
  return new Map((await getCollection("industries")).map((i) => [i.id, i.data.name]));
}

export async function kitItems(): Promise<KitItem[]> {
  if (!showDrafts) return [];
  const items: KitItem[] = [];
  for (const c of await creatives()) {
    for (const [format, f] of Object.entries(AD_FORMATS)) {
      for (const ground of GROUNDS) {
        items.push({
          path: `/kit/ad/${format}/${ground}/${c.id}`,
          kind: "png",
          w: f.w,
          h: f.h,
          out: `ads/${c.id}/${c.id}-${format}-${ground}.png`,
          format: format as AdFormat,
          landing: c.product ? `/products/${c.id}` : "/marketplace",
          sources: f.sources,
        });
      }
    }
  }
  for (const [name, s] of Object.entries(SOCIAL)) items.push({ path: `/kit/social/${name}`, kind: "png", w: s.w, h: s.h, out: `social/${name}.png` });
  items.push({ path: "/kit/print/letterhead", kind: "pdf", w: 210, h: 297, out: "print/letterhead.pdf" });
  // The letterhead's top band as an image, for a Word or Google Docs header (300 dpi at A4 width).
  items.push({ path: "/kit/print/letterhead-header", kind: "png", w: 794, h: 151, scale: 3.125, out: "print/letterhead-header.png" });
  // 85 x 55 mm with 3 mm bleed on every side; front, then back.
  items.push({ path: "/kit/print/card", kind: "pdf", w: 91, h: 61, out: "print/business-cards.pdf" });
  return items;
}

