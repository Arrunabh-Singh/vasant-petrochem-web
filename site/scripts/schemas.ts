// Writes content/_schemas/*.schema.json from the zod schemas in
// src/content/schema.ts, so any editor or agent can validate a content file
// without building the site. `npm run content:schema`; CI fails if they drift.
import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "astro/zod";
import * as s from "../src/content/schema.ts";

const out = new URL("../../content/_schemas/", import.meta.url);
const list = (key: string, item: z.ZodType) => z.object({ $schema: z.string().optional(), [key]: z.array(item) });

const schemas: Record<string, z.ZodType> = {
  company: s.companySchema,
  navigation: s.navigationSchema.extend({ $schema: z.string().optional() }),
  product: s.productSchema,
  page: s.pageSchema,
  corporate: s.corporateSchema,
  industry: s.industrySchema,
  insight: s.insightSchema,
  families: list("families", s.familySchema),
  claims: list("claims", s.claimSchema),
  certifications: list("certifications", s.certificationSchema),
  people: list("people", s.personSchema),
};

mkdirSync(out, { recursive: true });
for (const [name, schema] of Object.entries(schemas)) {
  const json = z.toJSONSchema(schema, { unrepresentable: "any", io: "input" });
  writeFileSync(new URL(`${name}.schema.json`, out), JSON.stringify(json, null, 2) + "\n");
}
console.log(`schemas: ${Object.keys(schemas).length} written to content/_schemas/`);
