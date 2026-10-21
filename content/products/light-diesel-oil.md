---
name: "Light Diesel Oil"
code: "LDO-IN"
family: fuels
status: published
# placeholder until the values come from a supplier TDS or COA (TODO(VP-HUM-013)); then set
# `data: verified` and `source` to the evidence document.
data: placeholder
source: null
order: 5
tint: brown
summary: "Clean-burning, efficient combustion fuel for DG sets, industrial burners, and start-up fuel applications."
specs:
  - { property: "Calorific Value", value: "≈ 10,300", unit: "kcal/kg", method: null }
  - { property: "Flash Point", value: "> 66", unit: "°C", method: null }
  - { property: "Viscosity @38°C", value: "2.5-15.7", unit: "cSt", method: null }
  - { property: "Sulphur", value: "< 1.8", unit: "% wt", method: null }
  - { property: "Pour Point", value: "< 18", unit: "°C", method: null }
  - { property: "Ash Content", value: "< 0.02", unit: "% wt", method: null }
packaging:
  - { type: "drum", size: 210, unit: "L" }
  - { type: "bulk tanker", size: 12, unit: "kL" }
applications: ["DG sets", "Industrial burners", "Start-up fuel"]
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
Clean-burning, efficient combustion fuel for DG sets, industrial burners, and start-up fuel applications.
