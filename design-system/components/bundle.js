/* @ds-bundle: {"format":4,"namespace":"Vasant","components":[{"name":"Button"},{"name":"Chip"},{"name":"GradeChip"},{"name":"Droplet"},{"name":"ProductCard"},{"name":"AtAGlance"},{"name":"SpecTable"},{"name":"Disclaimer"},{"name":"ProductHero"},{"name":"GlobalNav"},{"name":"LocalNav"},{"name":"MobileActionBar"},{"name":"DocumentsCard"},{"name":"EnquiryForm"},{"name":"Footer"},{"name":"AdCreative"}]} */
/* Vasant Petrochem design system. Hand-written against React 18 (window.React,
   window.ReactDOM). Components adapt to their container, not the viewport: phone
   layout below 1024px of container width, laptop layout from 1024px. */
(function () {
  "use strict";
  var W = window;
  var NS = (W.Vasant = W.Vasant || {});
  function R() { return W.React; }
  function h() { var r = R(); return r.createElement.apply(r, arguments); }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }

  /* ---------------------------------------------------------------- assets */
  // Uploaded logo files. compact = navigation lockup (wordmark 0.6x the mark).
  var LOGOS = {
    full: "../../assets/Logos/vasant-logo.png",
    fullReversed: "../../assets/Logos/vasant-logo-reversed.png",
    compact: "../../assets/Logos/vasant-lockup-compact.png",
    compactReversed: "../../assets/Logos/vasant-lockup-compact-reversed.png",
    mark: "../../assets/Logos/vasant-mark.png",
    wordmark: "../../assets/Logos/vasant-wordmark.png"
  };

  /* -------------------------------------------------------------- the drop */
  // Traced from the logo's drop: a cone meeting a circle (r = 50 in a 100-wide box).
  var DROP_PATH = "M50 0C47.62 4.39 0 117.26 0 126.26A50 50 0 0 0 100 126.26C100 117.26 52.38 4.39 50 0Z";
  var DROP_H = 176.26;
  var LEVEL = 107.07; // liquid surface, as in the logo
  var HIGHLIGHT = "M10.1 130.3C11.2 141.5 16.2 153.2 24.2 159.6C31.4 165.3 39.4 168 47.5 167.7";
  var CHROME = [
    [0, "chrome-dark", "#979797"], [0.1, null, "#999b9b"], [0.19, null, "#b1b3b2"],
    [0.28, null, "#d8dadc"], [0.33, "chrome-light", "#f3f4f5"], [0.37, null, "#f5f7f9"],
    [0.42, null, "#d9dbdd"], [0.465, "chrome", "#c0c2c3"], [0.51, null, "#a6a8aa"],
    [0.56, null, "#b3b5b6"], [0.61, null, "#c6c8c9"]
  ];
  var TINTS = {
    gold: { label: "Gold", mid: "#daad4a", light: "#f8d166", deep: "#a16e27" },
    straw: { label: "Straw", mid: "#ecd27c", light: "#fbe8a6", deep: "#c7a650" },
    amber: { label: "Amber", mid: "#c17a2f", light: "#eaa65a", deep: "#7b4318" },
    brown: { label: "Brown", mid: "#835530", light: "#b98552", deep: "#4b2d16" },
    fuel: { label: "Fuel", mid: "#3b2c22", light: "#6e5644", deep: "#16100c" },
    bitumen: { label: "Bitumen", mid: "#242221", light: "#4d4a47", deep: "#0c0b0b" },
    clear: { label: "Clear", mid: "#e9eded", light: "#ffffff", deep: "#c5ccce", rim: true },
    white: { label: "White", mid: "#f5efe1", light: "#fffdf8", deep: "#dacfb7", rim: true }
  };
  var SLUG_TINT = {
    "base-oil-sn500": "gold", "base-oil-sn150": "straw", "rubber-process-oil": "amber",
    "light-diesel-oil": "brown", "industrial-fuel-oil": "fuel", "paving-bitumen-vg30": "bitumen",
    "mineral-turpentine-oil": "clear", "petroleum-jelly": "white"
  };
  function tintFor(slug) { return SLUG_TINT[slug] || "gold"; }

  function stop(offset, token, hex, opacity) {
    var style = "stop-color:" + (token ? "var(--" + token + ", " + hex + ")" : hex) + (opacity != null ? ";stop-opacity:" + opacity : "");
    return '<stop offset="' + offset + '" style="' + style + '"/>';
  }
  // One markup source for the component and the exported SVG files. Colours read
  // the drop-* tokens when they are on the page and fall back to the same hex.
  function dropMarkup(tintName, opts) {
    opts = opts || {};
    var name = TINTS[tintName] ? tintName : "gold";
    var t = TINTS[name];
    var id = opts.id || "vpdrop";
    var tok = "drop-" + name;
    // plain: hex only, for SVG files opened outside a browser page.
    var k = function (name) { return opts.plain ? null : name; };
    var chrome = CHROME.map(function (s) { return stop(s[0], k(s[1]), s[2]); }).join("");
    var liquid = [
      stop(0, k(tok + "-light"), t.light, 0.95), stop(0.08, k(tok), t.mid), stop(0.33, k(tok + "-light"), t.light),
      stop(0.58, k(tok), t.mid), stop(0.84, k(tok + "-deep"), t.deep), stop(1, k(tok + "-deep"), t.deep)
    ].join("");
    var a11y = opts.title ? 'role="img" aria-label="' + String(opts.title).replace(/"/g, "&quot;") + '"' : 'aria-hidden="true"';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ' + DROP_H + '" ' + a11y +
      ' class="vp-drop-svg' + (opts.animate ? " vp-drop-animate" : "") + '">' +
      "<defs>" +
      '<linearGradient id="' + id + '-c" x1="0" y1="0" x2="0" y2="' + DROP_H + '" gradientUnits="userSpaceOnUse">' + chrome + "</linearGradient>" +
      '<linearGradient id="' + id + '-l" x1="0" y1="' + LEVEL + '" x2="0" y2="' + DROP_H + '" gradientUnits="userSpaceOnUse">' + liquid + "</linearGradient>" +
      '<clipPath id="' + id + '-k"><path d="' + DROP_PATH + '"/></clipPath>' +
      "</defs>" +
      '<path d="' + DROP_PATH + '" fill="url(#' + id + '-c)"/>' +
      '<g clip-path="url(#' + id + '-k)"><g class="vp-drop-liquid">' +
      '<rect x="-2" y="' + LEVEL + '" width="104" height="' + (DROP_H - LEVEL + 2).toFixed(2) + '" fill="url(#' + id + '-l)"/>' +
      '<rect x="-2" y="' + LEVEL + '" width="104" height="2.2" fill="#ffffff" opacity="0.32"/>' +
      '<path d="' + HIGHLIGHT + '" fill="none" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round" opacity="0.9"/>' +
      "</g></g>" +
      (t.rim ? '<path d="' + DROP_PATH + '" fill="none" stroke="#8f9496" stroke-width="1.3"/>' : "") +
      "</svg>";
  }

  /* ----------------------------------------------------------------- icons */
  var ICONS = {
    arrow: ["M5 12h14", "m12 5 7 7-7 7"],
    phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"],
    doc: ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v4a2 2 0 0 0 2 2h4", "M10 9H8", "M16 13H8", "M16 17H8"],
    check: ["M20 6 9 17l-5-5"],
    menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
    close: ["M18 6 6 18", "m6 6 12 12"],
    chevron: ["m6 9 6 6 6-6"],
    alert: ["M12 9v4", "M12 17h.01", "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"],
    pin: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]
  };
  // The site's own WhatsApp glyph (app/components/WhatsAppIcon.tsx), filled.
  var WHATSAPP = [
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.966 1.164-.198.198-.396.223-.693.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.174-.297-.019-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.05-.52-.099-.148-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z",
    "M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.882 11.882 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.48-8.45zM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.36-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.457-9.884 9.937-9.884a9.86 9.86 0 0 1 7.023 2.91 9.788 9.788 0 0 1 2.909 6.994c-.003 5.45-4.458 9.872-9.986 9.872z"
  ];
  function Icon(p) {
    var size = p.size || 20;
    if (p.name === "whatsapp") {
      return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true, className: "vp-icon" },
        WHATSAPP.map(function (d, i) { return h("path", { key: i, d: d }); }));
    }
    return h("svg", {
      width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      strokeWidth: p.stroke || 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className: "vp-icon"
    }, (ICONS[p.name] || []).map(function (d, i) { return h("path", { key: i, d: d }); }));
  }

  /* -------------------------------------------------------------- the data */
  // The live catalog on 19 Oct 2026 (Supabase public.products, published rows).
  var CATALOG = [
    { slug: "industrial-fuel-oil", name: "Industrial Fuel Oil", code: "IFO-380", description: "High-grade thermal energy source for boilers, furnaces, and power generation. Consistent calorific value for uninterrupted operations.", specs: [{ label: "Calorific Value", value: "9,800-10,200 kcal/kg" }, { label: "Density @15°C", value: "0.92-0.96" }, { label: "Viscosity @50°C", value: "80-180 cSt" }, { label: "Flash Point", value: "> 66 °C" }, { label: "Sulphur", value: "< 4.0 % wt" }, { label: "Water & Sediment", value: "< 1.0 % vol" }], applications: ["Boilers", "Furnaces", "Power generation"], industries: ["Power & Energy", "Manufacturing"], packaging: "210 L drum · 20 kL bulk tanker" },
    { slug: "base-oil-sn500", name: "Base Oil SN500", code: "SN-500", description: "Premium lubricant base stock for engine oils, hydraulic fluids, and industrial lubricant formulations.", specs: [{ label: "Viscosity @40°C", value: "90-110 cSt" }, { label: "Viscosity Index", value: "95-105" }, { label: "Flash Point", value: "240-260 °C" }, { label: "Pour Point", value: "-6 to -9 °C" }, { label: "Colour (ASTM)", value: "2.0-3.5" }, { label: "Density @15°C", value: "0.88-0.90" }], applications: ["Engine oils", "Hydraulic fluids", "Industrial lubricants"], industries: ["Automotive", "Lubricants"], packaging: "210 L drum · 20 kL bulk tanker" },
    { slug: "paving-bitumen-vg30", name: "Paving Bitumen", code: "VG-30", description: "Durable paving-grade bitumen for highways, bridges, and urban road construction projects.", specs: [{ label: "Penetration @25°C", value: "60-70 dmm" }, { label: "Softening Point", value: "47-55 °C" }, { label: "Viscosity @60°C", value: "800-2400 P" }, { label: "Ductility @27°C", value: "> 75 cm" }, { label: "Flash Point", value: "> 220 °C" }, { label: "Solubility in TCE", value: "> 99 %" }], applications: ["Highways", "Bridges", "Urban roads"], industries: ["Road Construction", "Infrastructure"], packaging: "155 kg drum · hot bulk tanker" },
    { slug: "rubber-process-oil", name: "Rubber Process Oil", code: "RPO-A", description: "Aromatic and naphthenic process oils for rubber compounding, tire manufacturing, and polymer processing.", specs: [{ label: "Viscosity @100°C", value: "15-32 cSt" }, { label: "Aniline Point", value: "40-95 °C" }, { label: "Flash Point", value: "220-260 °C" }, { label: "Density @15°C", value: "0.89-0.99" }, { label: "Colour (ASTM)", value: "2.0-8.0" }, { label: "Volatility Loss", value: "< 1.5 % wt" }], applications: ["Rubber compounding", "Tire manufacturing", "Polymer processing"], industries: ["Rubber", "Polymers"], packaging: "210 L drum · 20 kL bulk tanker" },
    { slug: "light-diesel-oil", name: "Light Diesel Oil", code: "LDO-IN", description: "Clean-burning, efficient combustion fuel for DG sets, industrial burners, and start-up fuel applications.", specs: [{ label: "Calorific Value", value: "≈ 10,300 kcal/kg" }, { label: "Flash Point", value: "> 66 °C" }, { label: "Viscosity @38°C", value: "2.5-15.7 cSt" }, { label: "Sulphur", value: "< 1.8 % wt" }, { label: "Pour Point", value: "< 18 °C" }, { label: "Ash Content", value: "< 0.02 % wt" }], applications: ["DG sets", "Industrial burners", "Start-up fuel"], industries: ["Power", "Manufacturing"], packaging: "210 L drum · 12 kL bulk tanker" },
    { slug: "mineral-turpentine-oil", name: "Mineral Turpentine Oil", code: "MTO", description: "Versatile industrial solvent for paint thinning, surface preparation, degreasing, and chemical extraction.", specs: [{ label: "Distillation Range", value: "150-200 °C" }, { label: "Flash Point (Abel)", value: "33-38 °C" }, { label: "Aromatic Content", value: "< 18 % vol" }, { label: "Density @15°C", value: "0.78-0.79" }, { label: "KB Value", value: "34-38" }, { label: "Copper Corrosion", value: "Class 1" }], applications: ["Paint thinning", "Surface preparation", "Degreasing"], industries: ["Paint & Coatings", "Chemical"], packaging: "210 L drum · 20 kL bulk tanker" },
    { slug: "base-oil-sn150", name: "Base Oil SN150", code: "SN-150", description: "Lighter-viscosity lubricant base stock for low-temperature hydraulic fluids and light industrial lubricant blends.", specs: [{ label: "Viscosity @40°C", value: "28-32 cSt" }, { label: "Viscosity Index", value: "95-105" }, { label: "Flash Point", value: "200-220 °C" }, { label: "Pour Point", value: "-9 to -12 °C" }, { label: "Colour (ASTM)", value: "1.5-2.5" }, { label: "Density @15°C", value: "0.86-0.88" }], applications: ["Hydraulic fluids", "Light industrial lubricants"], industries: ["Automotive", "Lubricants"], packaging: "210 L drum · 20 kL bulk tanker" },
    { slug: "petroleum-jelly", name: "Petroleum Jelly", code: "PJ-WHITE", description: "Refined petroleum jelly for pharmaceutical, cosmetic, and personal-care formulations.", specs: [{ label: "Drop Point", value: "54-60 °C" }, { label: "Penetration @25°C", value: "120-180 dmm" }, { label: "Colour (Saybolt)", value: "+25 min" }, { label: "Acidity/Alkalinity", value: "Neutral (Pass)" }, { label: "Heavy Metals", value: "< 10 ppm" }, { label: "Organic Volatiles", value: "Pass (USP)" }], applications: ["Pharmaceutical formulations", "Cosmetics", "Personal care"], industries: ["Pharmaceutical"], packaging: "20 kg pail · 175 kg drum" }
  ];
  function product(slug) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].slug === slug) return CATALOG[i];
    return CATALOG[1];
  }
  // Same industry first, then catalog order.
  function related(p, n) {
    var others = CATALOG.filter(function (o) { return o.slug !== p.slug; });
    var shared = function (o) { return o.industries.some(function (i) { return p.industries.indexOf(i) >= 0; }); };
    return others.filter(shared).concat(others.filter(function (o) { return !shared(o); })).slice(0, n || 3);
  }
  // Claims already published on the site (MNC P1). Ads and pages use only these.
  var CLAIMS = [
    "Pricing within 24 hours.",
    "Test reports available on request.",
    "Drums or bulk tanker.",
    "One point of contact, quote to dispatch.",
    "From Mangaliya, Indore, across Central India."
  ];
  var DISCLAIMER = "Typical values, not a guarantee of specification. Test reports are available on request.";
  var NAV = [
    { name: "Products", href: "#products" }, { name: "Industries", href: "#industries" },
    { name: "About", href: "#about" }, { name: "Contact", href: "#contact" }
  ];

  /* ----------------------------------------------------------- components */
  function Button(p) {
    var variant = p.variant || "primary";
    var cls = cx("vp-btn", "vp-btn-" + variant, p.size && "vp-btn-" + p.size, p.full && "vp-btn-full", p.className);
    var kids = [
      p.icon ? h(Icon, { key: "i", name: p.icon, size: p.size === "small" ? 18 : 20 }) : null,
      p.children != null ? h("span", { key: "t" }, p.children) : null,
      p.iconAfter ? h(Icon, { key: "a", name: p.iconAfter, size: 18 }) : null
    ];
    var rest = { className: cls, "aria-label": p["aria-label"], onClick: p.onClick };
    if (p.href) return h("a", Object.assign({ href: p.href }, rest), kids);
    return h("button", Object.assign({ type: p.type || "button", disabled: p.disabled }, rest), kids);
  }

  function Chip(p) {
    var cls = cx("vp-chip", p.selected && "vp-chip-selected");
    if (p.href) return h("a", { className: cls, href: p.href, "aria-current": p.selected ? "true" : undefined }, p.children);
    return h("button", { type: "button", className: cls, "aria-pressed": !!p.selected, onClick: p.onClick }, p.children);
  }

  function GradeChip(p) {
    return h("span", { className: cx("vp-grade", p.tone === "quiet" && "vp-grade-quiet") }, p.code);
  }

  var uid = 0;
  function Droplet(p) {
    var React = R();
    var idRef = React.useRef(null);
    if (!idRef.current) idRef.current = "vpd" + (++uid);
    var tint = p.tint || tintFor(p.slug);
    var markup = dropMarkup(tint, { id: idRef.current, title: p.title, animate: p.animate });
    return h("span", {
      className: cx("vp-drop", p.className),
      style: { width: p.size || 64 },
      dangerouslySetInnerHTML: { __html: markup }
    });
  }

  function ProductCard(p) {
    var pr = p.product;
    return h("a", { className: "vp-card", href: p.href || "#/products/" + pr.slug },
      h("div", { className: "vp-card-top" },
        h(Droplet, { slug: pr.slug, size: 30 }),
        h(GradeChip, { code: pr.code })),
      h("h3", { className: "vp-card-title" }, pr.name),
      h("p", { className: "vp-card-desc" }, pr.description),
      h("dl", { className: "vp-card-specs" }, pr.specs.slice(0, 3).map(function (s) {
        return h("div", { key: s.label, className: "vp-card-spec" }, h("dt", null, s.label), h("dd", null, s.value));
      })),
      h("div", { className: "vp-card-foot" },
        h("span", null, pr.packaging),
        h("span", { className: "vp-card-more" }, "View", h(Icon, { name: "arrow", size: 16 }))));
  }

  function AtAGlance(p) {
    return h("dl", { className: "vp-glance" }, (p.specs || []).slice(0, 3).map(function (s) {
      return h("div", { key: s.label, className: "vp-glance-item" }, h("dt", null, s.label), h("dd", null, s.value));
    }));
  }

  function Disclaimer() { return h("p", { className: "vp-disclaimer" }, DISCLAIMER); }

  function SpecTable(p) {
    var pr = p.product;
    return h("div", { className: "vp-specs" },
      h("div", { className: "vp-specs-head" },
        h("h3", { className: "vp-eyebrow vp-specs-title" }, "Typical properties"),
        h(GradeChip, { code: pr.code, tone: "quiet" })),
      h("table", null,
        h("caption", { className: "vp-sr" }, "Typical properties of " + pr.name + " (" + pr.code + ")"),
        h("tbody", null,
          pr.specs.map(function (s) {
            return h("tr", { key: s.label }, h("th", { scope: "row" }, s.label), h("td", null, s.value));
          }),
          pr.packaging ? h("tr", { className: "vp-specs-pack" }, h("th", { scope: "row" }, "Packaging"), h("td", null, pr.packaging)) : null)),
      h("div", { className: "vp-specs-foot" }, h(Disclaimer)));
  }

  function ProductHero(p) {
    var pr = p.product;
    return h("section", { className: "vp-phero", id: "overview" },
      h("div", { className: "vp-container vp-phero-grid" },
        h("div", { className: "vp-phero-copy" },
          h("p", { className: "vp-eyebrow vp-eyebrow-product" }, pr.industries.join(" · ")),
          h("div", { className: "vp-phero-title" },
            h("h1", { className: "vp-h-page" }, pr.name),
            h(GradeChip, { code: pr.code })),
          h("p", { className: "vp-lead" }, pr.description),
          h("div", { className: "vp-actions" },
            h(Button, { href: "#enquiry", size: "touch" }, "Get a quote"),
            h(Button, { href: "#whatsapp", size: "touch", variant: "secondary", icon: "whatsapp" }, "Chat on WhatsApp"))),
        h("div", { className: "vp-stage" },
          h(Droplet, { slug: pr.slug, size: 150, animate: p.animate !== false, title: pr.name }),
          h("p", { className: "vp-stage-caption" }, "Supplied in ", h("strong", null, pr.packaging)))),
      h("div", { className: "vp-container" }, h(AtAGlance, { specs: pr.specs })));
  }

  function GlobalNav(p) {
    var React = R();
    var st = React.useState(!!p.defaultOpen), open = st[0], setOpen = st[1];
    var active = p.active;
    return h("header", { className: "vp-nav" },
      h("div", { className: "vp-nav-inner" },
        h("a", { className: "vp-nav-logo", href: "#home", "aria-label": "Vasant Petrochem, home" },
          h("img", { src: LOGOS.compact, alt: "Vasant Petrochem", width: 634, height: 182 })),
        h("nav", { "aria-label": "Main" },
          h("ul", { className: "vp-nav-links" }, NAV.map(function (n) {
            return h("li", { key: n.name }, h("a", { href: n.href, "aria-current": active === n.name ? "page" : undefined }, n.name));
          }))),
        h("div", { className: "vp-nav-cta" }, h(Button, { href: "#enquiry", size: "small" }, "Get a quote")),
        h("button", {
          type: "button", className: "vp-nav-menu", "aria-expanded": open, "aria-label": open ? "Close menu" : "Open menu",
          onClick: function () { setOpen(!open); }
        }, h(Icon, { name: open ? "close" : "menu", size: 22 }))),
      open ? h("div", { className: "vp-nav-sheet" },
        h("ul", null, NAV.map(function (n) {
          return h("li", { key: n.name }, h("a", { href: n.href, "aria-current": active === n.name ? "page" : undefined }, n.name, h(Icon, { name: "arrow", size: 20 })));
        })),
        h(Button, { href: "#enquiry", size: "touch", full: true }, "Get a quote")) : null);
  }

  function LocalNav(p) {
    var pr = p.product;
    var links = [["Overview", "#overview"], ["Specs", "#specs"], ["Uses", "#uses"], ["Documents", "#documents"]];
    return h("div", { className: "vp-local" },
      h("div", { className: "vp-local-inner" },
        h("p", { className: "vp-local-name" }, h("span", { className: "vp-local-title" }, pr.name), h("span", { className: "vp-local-code" }, pr.code)),
        h("nav", { className: "vp-local-links", "aria-label": pr.name },
          links.map(function (l) { return h("a", { key: l[0], href: l[1], "aria-current": p.active === l[0] ? "true" : undefined }, l[0]); })),
        h(Button, { href: "#enquiry", size: "small", className: "vp-local-cta" }, "Get a quote")));
  }

  function MobileActionBar(p) {
    return h("div", { className: "vp-actionbar" },
      h(Button, { href: p.callHref || "#call", variant: "secondary", icon: "phone", "aria-label": "Call the sales desk", className: "vp-icon-btn" }),
      h(Button, { href: p.whatsappHref || "#whatsapp", variant: "secondary", icon: "whatsapp", "aria-label": "Chat on WhatsApp", className: "vp-icon-btn" }),
      h(Button, { href: p.quoteHref || "#enquiry", size: "touch", iconAfter: "arrow" }, "Get a quote"));
  }

  function DocumentsCard(p) {
    var pr = p.product;
    return h("div", { className: "vp-docs", id: "documents" },
      h("div", { className: "vp-docs-copy" },
        h("p", { className: "vp-eyebrow vp-eyebrow-deep" }, "Technical data sheet · " + pr.code),
        h("h3", null, pr.name + " TDS"),
        h("p", null, "Full specification with test methods, handling and storage guidance. Leave your email and the PDF opens straight away.")),
      h("form", { className: "vp-docs-form", onSubmit: function (e) { e.preventDefault(); } },
        h("label", { htmlFor: "tds-email-" + pr.slug }, "Work email"),
        h("input", { id: "tds-email-" + pr.slug, type: "email", className: "vp-field-deep", placeholder: "you@company.com", autoComplete: "email" }),
        h(Button, { type: "submit", variant: "on-deep", size: "touch", icon: "doc", full: true }, "Download the TDS")));
  }

  function Field(p) {
    var id = "f-" + p.name;
    var input = p.multiline
      ? h("textarea", { id: id, name: p.name, rows: 3, className: "vp-input", placeholder: p.placeholder })
      : p.options
        ? h("div", { className: "vp-select" },
          h("select", { id: id, name: p.name, className: "vp-input", defaultValue: p.value || "" },
            [h("option", { key: "", value: "" }, "Select a product")].concat(p.options.map(function (o) { return h("option", { key: o, value: o }, o); }))),
          h(Icon, { name: "chevron", size: 18 }))
        : h("input", { id: id, name: p.name, type: p.type || "text", className: "vp-input", placeholder: p.placeholder, required: p.required, "aria-invalid": p.error ? "true" : undefined, defaultValue: p.value });
    return h("div", { className: "vp-field" },
      h("label", { htmlFor: id }, p.label, p.required ? h("span", { className: "vp-req" }, " (required)") : null),
      input,
      p.error ? h("p", { className: "vp-field-error" }, h(Icon, { name: "alert", size: 16 }), p.error) : null);
  }

  function EnquiryForm(p) {
    if (p.state === "success") {
      return h("div", { className: "vp-form vp-form-done", role: "status" },
        h("span", { className: "vp-done-icon" }, h(Icon, { name: "check", size: 26, stroke: 2.5 })),
        h("h3", { className: "vp-form-title" }, "Request received"),
        h("p", null, "Your reference: ", h("span", { className: "vp-mono-ink" }, p.reference || "VP-ENQ-202610-0042")),
        h("p", null, "We reply within 24 hours on business days. For anything urgent, call the sales desk."));
    }
    var names = CATALOG.map(function (o) { return o.name + " (" + o.code + ")"; });
    return h("form", { className: "vp-form", id: "enquiry", onSubmit: function (e) { e.preventDefault(); } },
      h("h3", { className: "vp-form-title" }, p.title || "Request a quote"),
      h("div", { className: "vp-form-row" },
        h(Field, { name: "name", label: "Full name", required: true, placeholder: "Your name", error: p.state === "error" ? "Enter your name so we know who to reply to." : null }),
        h(Field, { name: "email", label: "Business email", type: "email", required: true, placeholder: "you@company.com" })),
      h("div", { className: "vp-form-row" },
        h(Field, { name: "company", label: "Company name", placeholder: "ABC Industries Pvt. Ltd." }),
        h(Field, { name: "phone", label: "Phone or WhatsApp", type: "tel", placeholder: "+91" })),
      h("div", { className: "vp-form-row" },
        h(Field, { name: "product", label: "Product of interest", options: names, value: p.defaultProduct }),
        h(Field, { name: "quantity", label: "Quantity required", placeholder: "e.g. 20 kL a month, 40 drums" })),
      h(Field, { name: "message", label: "Additional details", multiline: true, placeholder: "Delivery city, timeline, packaging preference" }),
      h(Button, { type: "submit", size: "touch", full: true }, "Send enquiry"));
  }

  function Footer(p) {
    var years = p.years || "2025–2026";
    return h("footer", { className: "vp-footer" },
      h("div", { className: "vp-footer-inner" },
        h("div", { className: "vp-footer-brand" },
          h("img", { className: "vp-footer-logo", src: LOGOS.full, alt: "Vasant Petrochem", width: 734, height: 345 }),
          h("p", null, "Industrial Area, Mangaliya, Indore. Manufacturing and trading industrial oils, fuels & lubricants across Central India.")),
        h("div", null, h("h4", null, "Products"), h("ul", null, CATALOG.map(function (o) { return h("li", { key: o.slug }, h("a", { href: "#/products/" + o.slug }, o.name)); }))),
        h("div", null, h("h4", null, "Industries"), h("ul", null, ["Road construction", "Paint & coatings", "Rubber & polymers", "Power & energy", "Automotive & lubricants", "Pharmaceutical"].map(function (n) { return h("li", { key: n }, h("a", { href: "#industries" }, n)); }))),
        h("div", null, h("h4", null, "Company"), h("ul", null, ["About", "Contact", "Privacy", "Terms"].map(function (n) { return h("li", { key: n }, h("a", { href: "#" + n.toLowerCase() }, n)); }))),
        h("div", { className: "vp-footer-legal" },
          h("p", { className: "vp-legal-slot" }, "Legal name · GSTIN · Udyam · Registered office: shown here once supplied (VP-HUM-001)"),
          h("p", null, "© " + years + " Vasant Petrochem"))));
  }

  /* ------------------------------------------------------------------ ads */
  var AD_FORMATS = {
    square: { w: 1080, h: 1080, label: "Feed 1:1 · 1080 × 1080" },
    portrait: { w: 1080, h: 1350, label: "Feed 4:5 · 1080 × 1350" },
    story: { w: 1080, h: 1920, label: "Story 9:16 · 1080 × 1920", safeTop: 250, safeBottom: 340 },
    landscape: { w: 1200, h: 628, label: "Link 1.91:1 · 1200 × 628" },
    "display-square": { w: 1200, h: 1200, label: "Display 1:1 · 1200 × 1200" }
  };
  function AdCreative(p) {
    var f = AD_FORMATS[p.format] || AD_FORMATS.square;
    var pr = p.product || product("base-oil-sn500");
    var range = p.family === "range";
    var ground = p.ground === "cream" ? "cream" : "deep";
    var cls = cx("vp-ad", "vp-ad-" + (p.format || "square"), "vp-ad-" + ground, range && "vp-ad-range");
    var logo = ground === "deep" ? LOGOS.compactReversed : LOGOS.compact;
    var claim = p.claim || CLAIMS[0];
    var copy = range
      ? [h("p", { key: "e", className: "vp-ad-eyebrow" }, "Manufacturing & trading · Indore"),
        h("h2", { key: "t", className: "vp-ad-title" }, "Industrial oils, fuels & lubricants."),
        h("p", { key: "c", className: "vp-ad-claim" }, claim)]
      : [h("p", { key: "e", className: "vp-ad-eyebrow" }, pr.code + " · " + pr.industries.join(" · ")),
        h("h2", { key: "t", className: "vp-ad-title" }, pr.name),
        h("p", { key: "c", className: "vp-ad-claim" }, claim)];
    var art = range
      ? h("div", { className: "vp-ad-lineup", "aria-hidden": true }, CATALOG.map(function (o) { return h(Droplet, { key: o.slug, slug: o.slug, size: 64 }); }))
      : h("div", { className: "vp-ad-art" }, h(Droplet, { slug: pr.slug, size: 260, title: pr.name }));
    return h("div", { className: cls, style: { width: f.w, height: f.h } },
      h("img", { className: "vp-ad-logo", src: logo, alt: "Vasant Petrochem" }),
      h("div", { className: "vp-ad-copy" }, copy),
      art,
      h("div", { className: "vp-ad-foot" },
        h("span", { className: "vp-ad-cta" }, p.cta || (range ? "See the range" : "Get a quote")),
        h("span", { className: "vp-ad-where" }, "vasantpetrochem.com")),
      p.safeZones && f.safeTop ? h(React_Fragment(), null,
        h("div", { className: "vp-ad-safe vp-ad-safe-top", style: { height: f.safeTop } }, "Keep clear: " + f.safeTop + "px"),
        h("div", { className: "vp-ad-safe vp-ad-safe-bottom", style: { height: f.safeBottom } }, "Keep clear: " + f.safeBottom + "px")) : null);
  }
  function React_Fragment() { return R().Fragment; }

  /* ------------------------------------------------------ preview helpers */
  // Renders children at a fixed design width, scaled down to fit the card.
  // Container queries inside see the design width, so a 390 frame is a phone.
  function Frame(p) {
    var React = R();
    var outer = React.useRef(null), inner = React.useRef(null);
    var st = React.useState({ s: 1, h: 0 }), v = st[0], set = st[1];
    React.useLayoutEffect(function () {
      function measure() {
        if (!outer.current || !inner.current) return;
        var s = Math.min(p.maxScale || 1, outer.current.clientWidth / p.width);
        var hh = inner.current.offsetHeight;
        set(function (o) { return o.s === s && o.h === hh ? o : { s: s, h: hh }; });
      }
      measure();
      var ro = new ResizeObserver(measure);
      ro.observe(outer.current); ro.observe(inner.current);
      return function () { ro.disconnect(); };
    }, [p.width, p.maxScale]);
    var clip = p.clip ? { height: p.clip[1] * v.s } : { height: v.h * v.s };
    return h("figure", { className: "vp-device", style: p.style },
      p.label ? h("figcaption", { className: "vp-device-label" }, p.label) : null,
      h("div", { ref: outer, className: "vp-device-viewport", style: clip },
        h("div", {
          ref: inner, className: "vp-frame",
          style: { width: p.width, transform: "scale(" + v.s + ") translateY(" + (p.clip ? -p.clip[0] : 0) + "px)", transformOrigin: "0 0" }
        }, p.children)));
  }

  Object.assign(NS, {
    Button: Button, Chip: Chip, GradeChip: GradeChip, Droplet: Droplet, ProductCard: ProductCard,
    AtAGlance: AtAGlance, SpecTable: SpecTable, Disclaimer: Disclaimer, ProductHero: ProductHero,
    GlobalNav: GlobalNav, LocalNav: LocalNav, MobileActionBar: MobileActionBar, DocumentsCard: DocumentsCard,
    EnquiryForm: EnquiryForm, Footer: Footer, AdCreative: AdCreative,
    Icon: Icon, Frame: Frame,
    catalog: CATALOG, product: product, related: related, tints: TINTS, tintFor: tintFor,
    dropMarkup: dropMarkup, logos: LOGOS, claims: CLAIMS, disclaimer: DISCLAIMER, adFormats: AD_FORMATS, nav: NAV
  });
})();
