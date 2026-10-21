---
name: catalog
description: Add or update a product in Vasant Petrochem's public catalogue (content/products), including specs, packaging, documents and the move from placeholder to verified data. Use when asked to add a grade, change a specification, publish or withdraw a product, or attach a TDS or SDS.
---

# Catalogue changes

The catalogue is Markdown in `content/products/<slug>.md`. The front matter is checked against `productSchema` in `site/src/content/schema.ts` at build time, so a wrong field fails the build rather than the site.

## Before you edit

- Get the evidence: the supplier's technical data sheet (TDS), a certificate of analysis (COA), or the owner's written instruction. **Never fill a value from memory or from a similar grade.** Unknown stays `null` with a `TODO(VP-HUM-013)` comment.
- Read the product's file and one similar product, to match the style.

## Adding a product

1. Copy the closest existing file to `content/products/<slug>.md`. The slug is lower-case words joined by hyphens, and becomes the URL (`/products/<slug>`).
2. Set `name`, `code`, `family` (a slug from `content/families.json`), `order`, `tint` (gold, straw, amber, brown, fuel, bitumen, clear or white: the drop's colour), `summary` (one sentence), `applications` and `industries` (slugs from `content/industries/`).
3. Specs: one row per property. Copy `value` and `unit` exactly as the source writes them (`"90-110"`, `"cSt"`). `method` is the test method only if the source names it (`"ASTM D445"`), otherwise `null`. The first three rows show on cards and at a glance, so put the most useful ones first.
4. Packaging: `{ type, size, unit }`, for example `{ type: "drum", size: 210, unit: "L" }`.
5. Start as `status: draft` and `data: placeholder` unless the evidence is in hand.

## From placeholder to verified

When the values come from a TDS or COA:
- set `data: verified` and `source:` to the document (a file in `content/documents/` or a clear reference);
- add `density` only as one verified value at 15 °C, never a range (it drives the MT↔kL conversion on the quote page);
- add `documents.tds: { file }` only now (a TDS is never offered for placeholder data), and SDS files under `documents.sds` with language and revision.

## Publish, withdraw

- `status: published` puts it live. `discontinued` keeps the page but takes it out of the marketplace.
- HS and CAS codes: only once a customs broker has checked them (`TODO(VP-SEO-007)`).

## Check and propose

```
npm --prefix site run check
npm --prefix site run preview & npm --prefix site run shots -- /marketplace /products/<slug>
```

Open a pull request with the evidence attached or linked, and both screenshots. The owner approves it.
