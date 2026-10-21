---
name: "Base Oil SN150"
code: "SN-150"
family: base-oils
status: published
# placeholder until the values come from a supplier TDS or COA (TODO(VP-HUM-013)); then set
# `data: verified` and `source` to the evidence document.
data: placeholder
source: null
order: 7
tint: straw
summary: "Lighter-viscosity lubricant base stock for low-temperature hydraulic fluids and light industrial lubricant blends."
specs:
  - { property: "Viscosity @40°C", value: "28-32", unit: "cSt", method: null }
  - { property: "Viscosity Index", value: "95-105", unit: null, method: null }
  - { property: "Flash Point", value: "200-220", unit: "°C", method: null }
  - { property: "Pour Point", value: "-9 to -12", unit: "°C", method: null }
  - { property: "Colour (ASTM)", value: "1.5-2.5", unit: null, method: null }
  - { property: "Density @15°C", value: "0.86-0.88", unit: null, method: null }
packaging:
  - { type: "drum", size: 210, unit: "L" }
  - { type: "bulk tanker", size: 20, unit: "kL" }
applications: ["Hydraulic fluids", "Light industrial lubricants"]
industries: [automotive-lubricants]
documents: { sds: [], tds: null }
# TODO(VP-SEO-007): HS and CAS codes, checked by a customs broker.
hs: null
cas: null
# Density for MT/kL conversion: a single verified value in kg/L at 15 °C, never a range.
density: null
origin: null
faq: []
---
Lighter-viscosity lubricant base stock for low-temperature hydraulic fluids and light industrial lubricant blends.
