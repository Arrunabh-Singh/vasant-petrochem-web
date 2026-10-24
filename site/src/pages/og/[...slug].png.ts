/**
 * Share images (Open Graph, 1200 × 628): what WhatsApp, LinkedIn and email
 * previews show for a link. Drawn at build time from the same content as the
 * pages: the default card, and one per product with its own drop and values.
 * satori lays out the card; resvg turns it into a PNG.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { familyName, getProducts, keySpecs, specText, type ProductEntry } from "../../lib/catalog.ts";
import { claim } from "../../lib/claims.ts";
import { company } from "../../lib/company.ts";
import { byColour, dropSvg } from "../../lib/drop.ts";
import { page } from "../../lib/page.ts";

export const prerender = true;

export const getStaticPaths = (async () => {
  const products = await getProducts();
  return [
    { params: { slug: "default" }, props: { product: null } },
    ...products.map((product) => ({ params: { slug: `products/${product.id}` }, props: { product } })),
  ];
}) satisfies GetStaticPaths;

// Builds run from site/ (locally, in CI and on Cloudflare): the fonts live in
// the design system (as .woff: satori cannot read woff2), the logo is prepared
// into public/brand/ before the build.
const fontFile = (weight: number) => readFileSync(join(process.cwd(), "../design-system/fonts", `schibsted-grotesk-latin-${weight}-normal.woff`));
const dataUri = (mime: string, data: string | Buffer) => `data:${mime};base64,${Buffer.from(data).toString("base64")}`;
const logo = () => dataUri("image/png", readFileSync(join(process.cwd(), "public/brand/vasant-lockup-compact.png")));
const drop = (p: ProductEntry, id: string) => dataUri("image/svg+xml", dropSvg(p.data.tint, { id }));

// The brand's tokens (design-system/tokens.json) as satori needs them: plain values.
const C = { ground: "#fffdf8", text: "#17120b", text2: "#4a4136", text3: "#6b6052", goldInk: "#7a5a20", gold: "#cfa145", goldTint: "#f6ecd4" };

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, ...children: (Node | string | null)[]): Node => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.filter((c) => c !== null) },
});
const img = (src: string, width: number, height: number, style: Record<string, unknown> = {}): Node => ({
  type: "img",
  props: { src, width, height, style },
});

function frame(left: Node, right: Node, footer: string): Node {
  return el(
    "div",
    { width: 1200, height: 628, padding: 64, background: C.ground, fontFamily: "Schibsted Grotesk", color: C.text, flexDirection: "column", justifyContent: "space-between" },
    el("div", { justifyContent: "space-between", alignItems: "flex-start", flex: 1 }, left, right),
    el("div", { borderTop: `2px solid ${C.gold}`, paddingTop: 20, fontSize: 22, fontWeight: 500, color: C.text3 }, footer),
  );
}

async function productCard(p: ProductEntry): Promise<Node> {
  const spec = keySpecs(p)[0];
  const left = el(
    "div",
    { flexDirection: "column", width: 760, gap: 22 },
    img(logo(), 202, 58),
    el("div", { marginTop: 26, fontSize: 22, fontWeight: 500, letterSpacing: 3, color: C.goldInk, textTransform: "uppercase" }, await familyName(p.data.family)),
    el("div", { fontSize: 80, fontWeight: 900, lineHeight: 0.98, letterSpacing: -2.6 }, p.data.name),
    el(
      "div",
      { alignItems: "center", gap: 18 },
      el("div", { background: C.goldTint, color: C.goldInk, border: "2px solid rgba(143,106,42,0.45)", borderRadius: 4, padding: "5px 14px", fontSize: 24, fontWeight: 900, letterSpacing: 1.5 }, p.data.code),
      spec ? el("div", { fontSize: 26, fontWeight: 500, color: C.text2 }, `${spec.property}: ${specText(spec)} (typical)`) : null,
    ),
  );
  const right = el(
    "div",
    { flexDirection: "column", alignItems: "center", width: 260, paddingTop: 6 },
    img(drop(p, "og"), 220, 388),
    el("div", { width: 170, height: 18, marginTop: 14, borderRadius: 999, background: "rgba(23,18,11,0.10)" }),
  );
  return frame(left, right, `${(await claim("pricing-24h")).replace(/\.$/, "")} · www.vasantpetrochem.com`);
}

async function defaultCard(): Promise<Node> {
  const [home, products] = await Promise.all([page("home"), getProducts()]);
  const left = el(
    "div",
    { flexDirection: "column", width: 1072, gap: 28 },
    img(logo(), 244, 70),
    el("div", { marginTop: 18, fontSize: 68, fontWeight: 900, lineHeight: 1, letterSpacing: -2.4, maxWidth: 940 }, home.headline),
    el(
      "div",
      { gap: 26, alignItems: "flex-end", marginTop: 10 },
      ...byColour(products).slice(0, 8).map((p, i) => img(drop(p, `og${i}`), 58, 102)),
    ),
  );
  return frame(left, el("div", {}), `${company.tradeName} · ${(await claim("from-mangaliya")).replace(/\.$/, "")}`);
}

export const GET: APIRoute = async ({ props }) => {
  const product = (props as { product: ProductEntry | null }).product;
  const svg = await satori((product ? await productCard(product) : await defaultCard()) as Parameters<typeof satori>[0], {
    width: 1200,
    height: 628,
    fonts: [
      { name: "Schibsted Grotesk", data: fontFile(500), weight: 500, style: "normal" },
      { name: "Schibsted Grotesk", data: fontFile(900), weight: 900, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
