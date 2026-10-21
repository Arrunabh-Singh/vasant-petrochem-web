---
name: "Industrial Fuel Oil"
code: "IFO-380"
family: fuels
status: published
# placeholder until the values come from a supplier TDS or COA (TODO(VP-HUM-013)); then set
# `data: verified` and `source` to the evidence document.
data: placeholder
source: null
order: 1
tint: fuel
summary: "High-grade thermal energy source for boilers, furnaces, and power generation."
specs:
  - { property: "Calorific Value", value: "9,800-10,200", unit: "kcal/kg", method: null }
  - { property: "Density @15°C", value: "0.92-0.96", unit: null, method: null }
  - { property: "Viscosity @50°C", value: "80-180", unit: "cSt", method: null }
  - { property: "Flash Point", value: "> 66", unit: "°C", method: null }
  - { property: "Sulphur", value: "< 4.0", unit: "% wt", method: null }
  - { property: "Water & Sediment", value: "< 1.0", unit: "% vol", method: null }
packaging:
  - { type: "drum", size: 210, unit: "L" }
  - { type: "bulk tanker", size: 20, unit: "kL" }
applications: ["Boilers", "Furnaces", "Power generation"]
industries: [power-energy]
documents: { sds: [], tds: null }
# TODO(VP-SEO-007): HS and CAS codes, checked by a customs broker.
hs: null
cas: null
# Density for MT/kL conversion: a single verified value in kg/L at 15 °C, never a range.
density: null
origin: null
faq: []
---
High-grade thermal energy source for boilers, furnaces, and power generation. Consistent calorific value for uninterrupted operations.
