---
name: "Base Oil SN500"
code: "SN-500"
family: base-oils
status: published
# placeholder until the values come from a supplier TDS or COA (TODO(VP-HUM-013)); then set
# `data: verified` and `source` to the evidence document.
data: placeholder
source: null
order: 2
tint: gold
summary: "Premium lubricant base stock for engine oils, hydraulic fluids, and industrial lubricant formulations."
specs:
  - { property: "Viscosity @40°C", value: "90-110", unit: "cSt", method: null }
  - { property: "Viscosity Index", value: "95-105", unit: null, method: null }
  - { property: "Flash Point", value: "240-260", unit: "°C", method: null }
  - { property: "Pour Point", value: "-6 to -9", unit: "°C", method: null }
  - { property: "Colour (ASTM)", value: "2.0-3.5", unit: null, method: null }
  - { property: "Density @15°C", value: "0.88-0.90", unit: null, method: null }
packaging:
  - { type: "drum", size: 210, unit: "L" }
  - { type: "bulk tanker", size: 20, unit: "kL" }
applications: ["Engine oils", "Hydraulic fluids", "Industrial lubricants"]
industries: [automotive-lubricants, rubber-polymers]
documents: { sds: [], tds: null }
# TODO(VP-SEO-007): HS and CAS codes, checked by a customs broker.
hs: null
cas: null
# Density for MT/kL conversion: a single verified value in kg/L at 15 °C, never a range.
density: null
origin: null
faq: []
---
Premium lubricant base stock for engine oils, hydraulic fluids, and industrial lubricant formulations.
