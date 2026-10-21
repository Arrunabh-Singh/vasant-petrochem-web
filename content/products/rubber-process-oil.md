---
name: "Rubber Process Oil"
code: "RPO-A"
family: process-oils
status: published
# placeholder until the values come from a supplier TDS or COA (TODO(VP-HUM-013)); then set
# `data: verified` and `source` to the evidence document.
data: placeholder
source: null
order: 4
tint: amber
summary: "Aromatic and naphthenic process oils for rubber compounding, tire manufacturing, and polymer processing."
specs:
  - { property: "Viscosity @100°C", value: "15-32", unit: "cSt", method: null }
  - { property: "Aniline Point", value: "40-95", unit: "°C", method: null }
  - { property: "Flash Point", value: "220-260", unit: "°C", method: null }
  - { property: "Density @15°C", value: "0.89-0.99", unit: null, method: null }
  - { property: "Colour (ASTM)", value: "2.0-8.0", unit: null, method: null }
  - { property: "Volatility Loss", value: "< 1.5", unit: "% wt", method: null }
packaging:
  - { type: "drum", size: 210, unit: "L" }
  - { type: "bulk tanker", size: 20, unit: "kL" }
applications: ["Rubber compounding", "Tire manufacturing", "Polymer processing"]
industries: [rubber-polymers]
documents: { sds: [], tds: null }
# TODO(VP-SEO-007): HS and CAS codes, checked by a customs broker.
hs: null
cas: null
# Density for MT/kL conversion: a single verified value in kg/L at 15 °C, never a range.
density: null
origin: null
faq: []
---
Aromatic and naphthenic process oils for rubber compounding, tire manufacturing, and polymer processing.
