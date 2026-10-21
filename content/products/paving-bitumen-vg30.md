---
name: "Paving Bitumen"
code: "VG-30"
family: bitumen
status: published
# placeholder until the values come from a supplier TDS or COA (TODO(VP-HUM-013)); then set
# `data: verified` and `source` to the evidence document.
data: placeholder
source: null
order: 3
tint: bitumen
summary: "Durable paving-grade bitumen for highways, bridges, and urban road construction projects."
specs:
  - { property: "Penetration @25°C", value: "60-70", unit: "dmm", method: null }
  - { property: "Softening Point", value: "47-55", unit: "°C", method: null }
  - { property: "Viscosity @60°C", value: "800-2400", unit: "P", method: null }
  - { property: "Ductility @27°C", value: "> 75", unit: "cm", method: null }
  - { property: "Flash Point", value: "> 220", unit: "°C", method: null }
  - { property: "Solubility in TCE", value: "> 99", unit: "%", method: null }
packaging:
  - { type: "drum", size: 155, unit: "kg" }
  - { type: "hot bulk tanker", size: null, unit: null }
applications: ["Highways", "Bridges", "Urban roads"]
industries: [road-construction]
documents: { sds: [], tds: null }
# TODO(VP-SEO-007): HS and CAS codes, checked by a customs broker.
hs: null
cas: null
# Density for MT/kL conversion: a single verified value in kg/L at 15 °C, never a range.
density: null
origin: null
faq: []
---
Durable paving-grade bitumen for highways, bridges, and urban road construction projects.
