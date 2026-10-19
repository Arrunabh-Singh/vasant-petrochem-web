import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import {
  certificationSchema,
  claimSchema,
  familySchema,
  industrySchema,
  insightSchema,
  pageSchema,
  personSchema,
  productSchema,
} from "./content/schema.ts";

// Every collection reads the repo's content/ folder, one level above the app.
const content = (path: string) => `../content/${path}`;
const listIn = (key: string) => (text: string) => JSON.parse(text)[key];

export const collections = {
  products: defineCollection({ loader: glob({ base: content("products"), pattern: "*.md" }), schema: productSchema }),
  industries: defineCollection({ loader: glob({ base: content("industries"), pattern: "*.md" }), schema: industrySchema }),
  insights: defineCollection({ loader: glob({ base: content("insights"), pattern: "*.md" }), schema: insightSchema }),
  pages: defineCollection({ loader: glob({ base: content("pages"), pattern: "*.json" }), schema: pageSchema }),
  families: defineCollection({
    loader: file(content("families.json"), {
      parser: (text) => JSON.parse(text).families.map((f: { slug: string }) => ({ id: f.slug, ...f })),
    }),
    schema: familySchema,
  }),
  claims: defineCollection({ loader: file(content("claims.json"), { parser: listIn("claims") }), schema: claimSchema }),
  certifications: defineCollection({
    loader: file(content("certifications.json"), { parser: listIn("certifications") }),
    schema: certificationSchema,
  }),
  people: defineCollection({ loader: file(content("people.json"), { parser: listIn("people") }), schema: personSchema }),
};
