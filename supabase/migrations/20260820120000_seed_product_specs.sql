-- Typical-value spec sheets + packaging for the published catalog.
--
-- Values are the ones carried in the Claude Design project the public site
-- is built from (see the PRODUCTS table in "Vasant Petrochem.dc.html"), with
-- SN150 and Petroleum Jelly filled in to the same shape since those two
-- grades postdate the artboards. They are trade-typical figures, not batch
-- guarantees -- every product page renders that disclaimer under the table.
--
-- Idempotent: keyed by slug, and only fills rows that are still empty so a
-- later admin edit is never clobbered by a re-run.

update public.products p
set specs = v.specs,
    packaging = coalesce(p.packaging, v.packaging)
from (values
  ('industrial-fuel-oil', '[
     {"label": "Calorific Value",   "value": "9,800-10,200 kcal/kg"},
     {"label": "Density @15°C",     "value": "0.92-0.96"},
     {"label": "Viscosity @50°C",   "value": "80-180 cSt"},
     {"label": "Flash Point",       "value": "> 66 °C"},
     {"label": "Sulphur",           "value": "< 4.0 % wt"},
     {"label": "Water & Sediment",  "value": "< 1.0 % vol"}
   ]'::jsonb, '210 L drum · 20 kL bulk tanker'),

  ('base-oil-sn500', '[
     {"label": "Viscosity @40°C",   "value": "90-110 cSt"},
     {"label": "Viscosity Index",   "value": "95-105"},
     {"label": "Flash Point",       "value": "240-260 °C"},
     {"label": "Pour Point",        "value": "-6 to -9 °C"},
     {"label": "Colour (ASTM)",     "value": "2.0-3.5"},
     {"label": "Density @15°C",     "value": "0.88-0.90"}
   ]'::jsonb, '210 L drum · 20 kL bulk tanker'),

  ('paving-bitumen-vg30', '[
     {"label": "Penetration @25°C", "value": "60-70 dmm"},
     {"label": "Softening Point",   "value": "47-55 °C"},
     {"label": "Viscosity @60°C",   "value": "800-2400 P"},
     {"label": "Ductility @27°C",   "value": "> 75 cm"},
     {"label": "Flash Point",       "value": "> 220 °C"},
     {"label": "Solubility in TCE", "value": "> 99 %"}
   ]'::jsonb, '155 kg drum · hot bulk tanker'),

  ('rubber-process-oil', '[
     {"label": "Viscosity @100°C",  "value": "15-32 cSt"},
     {"label": "Aniline Point",     "value": "40-95 °C"},
     {"label": "Flash Point",       "value": "220-260 °C"},
     {"label": "Density @15°C",     "value": "0.89-0.99"},
     {"label": "Colour (ASTM)",     "value": "2.0-8.0"},
     {"label": "Volatility Loss",   "value": "< 1.5 % wt"}
   ]'::jsonb, '210 L drum · 20 kL bulk tanker'),

  ('light-diesel-oil', '[
     {"label": "Calorific Value",   "value": "≈ 10,300 kcal/kg"},
     {"label": "Flash Point",       "value": "> 66 °C"},
     {"label": "Viscosity @38°C",   "value": "2.5-15.7 cSt"},
     {"label": "Sulphur",           "value": "< 1.8 % wt"},
     {"label": "Pour Point",        "value": "< 18 °C"},
     {"label": "Ash Content",       "value": "< 0.02 % wt"}
   ]'::jsonb, '210 L drum · 12 kL bulk tanker'),

  ('mineral-turpentine-oil', '[
     {"label": "Distillation Range","value": "150-200 °C"},
     {"label": "Flash Point (Abel)","value": "33-38 °C"},
     {"label": "Aromatic Content",  "value": "< 18 % vol"},
     {"label": "Density @15°C",     "value": "0.78-0.79"},
     {"label": "KB Value",          "value": "34-38"},
     {"label": "Copper Corrosion",  "value": "Class 1"}
   ]'::jsonb, '210 L drum · 20 kL bulk tanker'),

  ('base-oil-sn150', '[
     {"label": "Viscosity @40°C",   "value": "28-32 cSt"},
     {"label": "Viscosity Index",   "value": "95-105"},
     {"label": "Flash Point",       "value": "200-220 °C"},
     {"label": "Pour Point",        "value": "-9 to -12 °C"},
     {"label": "Colour (ASTM)",     "value": "1.5-2.5"},
     {"label": "Density @15°C",     "value": "0.86-0.88"}
   ]'::jsonb, '210 L drum · 20 kL bulk tanker'),

  ('petroleum-jelly', '[
     {"label": "Drop Point",        "value": "54-60 °C"},
     {"label": "Penetration @25°C", "value": "120-180 dmm"},
     {"label": "Colour (Saybolt)",  "value": "+25 min"},
     {"label": "Acidity/Alkalinity","value": "Neutral (Pass)"},
     {"label": "Heavy Metals",      "value": "< 10 ppm"},
     {"label": "Organic Volatiles", "value": "Pass (USP)"}
   ]'::jsonb, '20 kg pail · 175 kg drum')
) as v(slug, specs, packaging)
where p.slug = v.slug
  and jsonb_array_length(coalesce(p.specs, '[]'::jsonb)) = 0;
