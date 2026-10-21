# Peer benchmark: what international buyers see elsewhere

The public websites of Indian and foreign peers, read on 19 October 2026. The findings set the scope of the site rebuild.

## Sites read

| Group | Sites | Notes |
| --- | --- | --- |
| Indian specialty oils | Gandhar Oil, Savita Oil, Panama Petrochem, APAR (speciality oils) | Rajpetro returned HTTP 503 |
| Foreign producers in our range | Nynas, Ergon, Calumet, SK Enmove (YUBASE) | H&R rendered no content without a browser; Sonneborn returned 403 |
| International traders | Vitol, Trafigura, Centalion (formerly Gunvor), Chemtradeasia | |
| Chemical marketplaces | Knowde, ChemPoint | Brenntag showed only a country gate; Univar returned 403; CheMondis returned 503 |

## What every peer gets wrong

These gaps are the opening for us.

- **No inline specifications.** Not one product page, Indian or foreign, shows typical values with test methods, packaging and HS/CAS codes on the page. Gandhar, Savita, Panama and APAR keep specs in PDFs. Nynas emails its PDS after a form. SK Enmove offers a catalogue download. Chemtradeasia puts TDS and SDS behind a login.
- **No real request for quote.** None has a multi-product basket with quantity, packaging, Incoterm and destination.
  - Calumet's sample form is the only one that asks for quantity and unit.
  - Chemtradeasia makes buyers sign in before they can ask for a quotation.
  - ChemPoint has one generic inquiry form.
- **No filtering or comparison.** No producer lets buyers filter by property or compare grades. Nynas lists 25 base oils as one flat list.

## What peers do well (copied)

| Practice | Seen at | Where it lands |
| --- | --- | --- |
| A compliance hub: KYC and due diligence, sanctions screening (OFAC, EU, UN, UK), anti-bribery, code of conduct, a Speak-up channel | Vitol, Trafigura, Centalion, Ergon (Trade & Sanctions Policy) | `/compliance`, once the owner supplies the policies |
| A warning that only email from the company domain is genuine | Vitol, Centalion | `/compliance` and the contact page, once domain email exists (VP-HUM-002) |
| Contact routed by enquiry type, with labelled mailboxes (customer service, technical, SDS, certificate of origin) | Ergon, Calumet, Nynas | `/contact` |
| Separate domestic and export enquiry routing | Panama Petrochem | `/quote` and `/contact` when `company.exports` is true |
| Certificates listed with number, issuer, validity and a downloadable file | Panama Petrochem | `/certifications`; empty until real certificates exist |
| Application-first navigation alongside product families | Savita (15 application pages), Calumet | `/industries` cross-linked with `/marketplace` facets |
| SDS by country and language | Nynas | product documents carry a language per SDS |
| Inline glossary links in product copy | Centalion | product and industry copy |
| A short "how supply works" explainer | Trafigura | home and `/supply` |
| Words over stat bands ("Operating in every continent") | Vitol | copy rule: no number without a claim id |
| SDS/TDS toggles and response-speed filters on results | Knowde | marketplace "documents available" facet |
| One account hub for orders, tracking, SDS/TDS and quotes | ChemPoint (My ChemPoint) | buyer portal, Release 2 |
| Stated response time after an enquiry | ChemPoint ("within 1 business hour") | our registered claim: pricing within 24 hours |

## What we prevent with CI checks

Each was seen live on a peer's site in October 2026.

| Defect | Seen at | Check |
| --- | --- | --- |
| Certificates shown after their expiry date | SK Enmove (five of eight rows) | Expired entries in `certifications.json` are hidden; citing one fails the build |
| Stale © years ("© 2024") | Gandhar, Panama, Chemtradeasia, APAR (two years at once) | The © year is computed; the build checks it |
| Typos in product copy ("Napthenic", "Savanol" on a "Savonol" page) | Panama, Savita | Spell check on `content/` |
| Assets loaded from a staging host | Savita | The build fails on any asset from a host outside the allowlist |
| Placeholder office details | Chemtradeasia (Bangkok) | `TODO(VP-HUM` text on a published page fails the build |
| Test pages in the live menu | Ergon | Navigation entries must resolve to published routes |
| A JavaScript-only country gate in front of all content | Brenntag | No gate; every page is static HTML |
| Zero-state widgets ("Showing 0 of 0 Locations") | ChemPoint | Empty lists render an empty state or nothing |

## Scorecard for Release 1

The rebuild PR ticks each line with a screenshot.

- Inline specs with unit and method on every product page; a printable datasheet.
- Marketplace with family, industry, application, packaging and documents facets; search; compare up to three grades.
- Quote basket: several products in one request, with quantity, unit, packaging and delivery. Incoterm and port appear once exports are enabled.
- "Source any grade" for products outside the catalogue.
- Sample requests.
- Live offers board, approved by a human before publication.
- Documents centre: SDS ungated, TDS gated, COA on request.
- Contact routed by enquiry type.
- Machine-readable catalogue (`catalog.json`, `llms.txt`, JSON-LD) for AI search and buyers' procurement agents.
- Every CI check in the table above.
