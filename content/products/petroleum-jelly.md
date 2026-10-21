---
name: "Petroleum Jelly"
code: "PJ-WHITE"
family: specialties
status: published
# placeholder until the values come from a supplier TDS or COA (TODO(VP-HUM-013)); then set
# `data: verified` and `source` to the evidence document.
data: placeholder
source: null
order: 8
tint: white
summary: "Refined petroleum jelly for pharmaceutical, cosmetic, and personal-care formulations."
specs:
  - { property: "Drop Point", value: "54-60", unit: "°C", method: null }
  - { property: "Penetration @25°C", value: "120-180", unit: "dmm", method: null }
  - { property: "Colour (Saybolt)", value: "+25 min", unit: null, method: null }
  - { property: "Acidity/Alkalinity", value: "Neutral (Pass)", unit: null, method: null }
  - { property: "Heavy Metals", value: "< 10", unit: "ppm", method: null }
  - { property: "Organic Volatiles", value: "Pass (USP)", unit: null, method: null }
packaging:
  - { type: "pail", size: 20, unit: "kg" }
  - { type: "drum", size: 175, unit: "kg" }
applications: ["Pharmaceutical formulations", "Cosmetics", "Personal care"]
industries: [pharmaceutical]
documents: { sds: [], tds: null }
# TODO(VP-SEO-007): HS and CAS codes, checked by a customs broker.
hs: null
cas: null
# Density for MT/kL conversion: a single verified value in kg/L at 15 °C, never a range.
density: null
origin: null
faq: []
---
Refined petroleum jelly for pharmaceutical, cosmetic, and personal-care formulations.
