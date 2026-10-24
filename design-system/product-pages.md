# Product pages

Every product has its own page at `/products/<slug>`, built from one template and the product's row in the catalog (`public.products`: `name`, `code`, `description`, `specs`, `applications`, `industries`, `packaging`). A new product published from the admin gets a full page with no code change; its drop is gold until it is given a tint.

Each page is also the landing page for that product's ads, so it has to answer three questions within one screen: what is it, does it meet my spec, and how do I buy it.

## Section order

| # | Section | Component | Source | Notes |
| --- | --- | --- | --- | --- |
| 1 | Global navigation | `GlobalNav` | n/a | Scrolls away with the page. |
| 2 | Local navigation | `LocalNav` | `name`, `code` | Sticky, `glass`. Overview · Specs · Uses · Documents on laptop; name and *Get a quote* on phone. |
| 3 | Hero | `ProductHero` | `industries`, `name`, `code`, `description`, `packaging` | Eyebrow in `gold-ink`, name in `display-l`, grade chip, lead, *Get a quote* and *Chat on WhatsApp*, the drop in its ivory light box (`ground-raised`). The drop fills once. |
| 4 | At a glance | `AtAGlance` | first three `specs` | Label above value in `mono`. Order the catalog's specs so the three that decide a purchase come first. |
| 5 | Typical properties | `SpecTable` + `Disclaimer` | all `specs`, `packaging` | A real `<table>` with row headers. The disclaimer sits under it, verbatim. |
| 6 | Supply | text and list | `packaging` + allowed claims | Packaging, dispatch from Mangaliya, test reports on request, pricing within 24 hours. |
| 7 | Where it is used | list + `Chip` links | `applications`, `industries` | Applications as a ticked list; industries as chips linking to `/industries`. |
| 8 | Documents | `DocumentsCard` | `name`, `code` | The TDS behind an email (VP-DOC-003: the SDS is never gated, and appears here as a plain download once it exists). |
| 9 | Enquiry | `EnquiryForm` | product pre-selected | Posts to the existing quote action with `sourcePage` = `/products/<slug>`. |
| 10 | Related products | `ProductCard` ×3 | `related()` | Same industry first, then catalog order. A swipe rail on phone, three columns on laptop. |
| 11 | Footer | `Footer` | catalog | |
| (phone) | Action bar | `MobileActionBar` | n/a | Fixed to the bottom: call, WhatsApp, *Get a quote*. |

## Phone and laptop

```text
phone 390px                          laptop 1280px
┌──────────────────────────┐         ┌─────────────────────────────────────────────────────────┐
│ ▼ compact logo      ☰    │         │ ▼ compact logo     Products Industries About Contact [Get a quote] │
│ Base Oil SN500  [Quote]  │ sticky  │ Base Oil SN500 SN-500   Overview Specs Uses Documents [Get a quote] │ sticky
│ AUTOMOTIVE · LUBRICANTS  │         │ AUTOMOTIVE · LUBRICANTS                    ┌──────────────┐ │
│ Base Oil SN500 [SN-500]  │         │ Base Oil SN500 [SN-500]                    │              │ │
│ Premium lubricant base…  │         │ Premium lubricant base stock for engine    │     drop     │ │
│ [ Get a quote         ]  │         │ oils, hydraulic fluids…                    │   (190px)    │ │
│ [ Chat on WhatsApp    ]  │         │ [Get a quote] [Chat on WhatsApp]           └──────────────┘ │
│ ┌──────────────────────┐ │         │ VISCOSITY @40°C │ VISCOSITY INDEX │ FLASH POINT          │
│ │     drop (150px)     │ │         │ 90-110 cSt      │ 95-105          │ 240-260 °C           │
│ └──────────────────────┘ │         │ ┌ Typical properties ─────────┐  Supply                  │
│ VISCOSITY @40°C 90-110…  │         │ │ table + disclaimer          │  packaging, dispatch…    │
│ table + disclaimer       │         │ └─────────────────────────────┘                          │
│ supply · uses · chips    │         │ Where it is used · industries                            │
│ documents (ivory)        │         │ Documents (ivory, two columns)                           │
│ enquiry form             │         │ Enquiry form (two-column fields)                         │
│ related (swipe rail)     │         │ Related products (three cards)                           │
│ footer                   │         │ footer                                                   │
│ [☎][WA][ Get a quote →]  │ fixed   └─────────────────────────────────────────────────────────┘
└──────────────────────────┘
```

## Search and sharing

- `<title>`: `<name> (<code>) | Vasant Petrochem`. Description: the product's `description`.
- JSON-LD: `Product` (name, description, `sku` = code, brand and manufacturer Vasant Petrochem) and `BreadcrumbList` (Home › Products › name), escaped before inlining.
- Canonical: `https://www.vasantpetrochem.com/products/<slug>` (the `www` host, VP-SEO-003).
- OG image: the Product family of `AdCreative` in the 1200 × 628 format, generated per product, so every shared link on WhatsApp or LinkedIn already looks like the brand.

## As an ad landing page

- Ads link to the product page with UTM tags (Advertising section). The enquiry form on the page records `sourcePage`; capturing the `utm_*` values with the enquiry (VP-LEAD-006) is required before paid traffic starts.
- The first screen on phone carries the name, the description and both calls to action above the fold at 390 × 844.
- No pop-ups, no interstitials, no autoplay.

## Empty and edge states

- No specs yet: the table area shows *Specifications on request. Ask below and we'll send current TDS and SDS data.* and *At a glance* is omitted.
- Fewer than three specs: *At a glance* shows what exists; never pad it.
- No packaging: drop the stage caption and the Packaging row.
- A long product name wraps (`text-wrap: balance`); the local navigation truncates it with an ellipsis.
- Catalog unavailable: the page shows the warning notice (`warning-tint`, `warning-ink`) with the phone number, never an empty template.
