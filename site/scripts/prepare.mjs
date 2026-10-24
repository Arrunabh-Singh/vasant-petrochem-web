// Runs before every dev server start and build. It derives the site's design
// assets from design-system/, so a token, logo or font is changed there and
// nowhere else:
//   design-system/tokens.json        -> src/styles/tokens.css
//   design-system/fonts/*.woff2      -> public/fonts/
//   design-system/assets/Logos/*     -> public/brand/
//   design-system/assets/Drops/*.svg -> public/brand/drops/
//   src/lib/drop.ts (the drop path)  -> public/brand/drop-mask.svg
//   the icon (vasant-icon-512.png)   -> favicon, touch and app icons, site.webmanifest
//   content/people/*.{jpg,png,webp}  -> public/people/
//   src/server/headers.ts            -> public/_headers
// The outputs are git-ignored.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { headersFile } from "../src/server/headers.ts";
import { DROP_H, DROP_PATH } from "../src/lib/drop.ts";
import sharp from "sharp";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const ds = join(site, "..", "design-system");

export function compileTokens(tokens) {
  const colors = new Map(tokens.color.tokens.map((t) => [t.name, t.value]));
  const resolve = (value, seen = new Set()) => {
    const ref = /^\{([a-z0-9-]+)\}$/.exec(value);
    if (!ref) return value;
    if (seen.has(ref[1]) || !colors.has(ref[1])) throw new Error(`tokens.json: cannot resolve ${value}`);
    seen.add(ref[1]);
    return resolve(colors.get(ref[1]), seen);
  };

  const lines = [];
  for (const [name, value] of colors) lines.push(`--${name}: ${resolve(value)};`);
  for (const family of ["spacing", "radius", "shadow", "size", "material", "motion"]) {
    for (const t of tokens[family].tokens) lines.push(`--${t.name}: ${t.value};`);
  }
  for (const [name, stack] of Object.entries(tokens.type.families)) lines.push(`--font-${name}: ${stack};`);
  // Type sizes become rem, so text follows the reader's browser font-size
  // setting as well as zoom (the web's version of Dynamic Type).
  const rem = (px) => `${parseFloat(px) / 16}rem`;
  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      lines.push(`--t-${s.name}: ${s.fontWeight} ${rem(s.fontSize)}/${rem(s.lineHeight)} var(--font-${group.family});`);
      lines.push(`--t-${s.name}-tracking: ${s.letterSpacing ?? "normal"};`);
    }
  }

  const faces = tokens.type.fonts.map(
    (f) =>
      `@font-face { font-family: "${f.family}"; src: url("/fonts/${basename(f.file)}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`,
  );

  return [
    `/* Generated from design-system/tokens.json by scripts/prepare.mjs. Do not edit. */`,
    ...faces,
    `:root {`,
    `  color-scheme: light;`,
    ...lines.map((l) => `  ${l}`),
    `}`,
    "",
  ].join("\n");
}

function copyDir(from, to, filter) {
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from, { withFileTypes: true })) {
    if (name.isFile() && filter(name.name)) copyFileSync(join(from, name.name), join(to, name.name));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokens = JSON.parse(readFileSync(join(ds, "tokens.json"), "utf8"));
  mkdirSync(join(site, "src/styles"), { recursive: true });
  writeFileSync(join(site, "src/styles/tokens.css"), compileTokens(tokens));

  copyDir(join(ds, "fonts"), join(site, "public/fonts"), (n) => n.endsWith(".woff2"));
  copyDir(join(ds, "assets/Logos"), join(site, "public/brand"), (n) => /\.(png|svg)$/.test(n));
  copyDir(join(ds, "assets/Drops"), join(site, "public/brand/drops"), (n) => n.endsWith(".svg"));
  // The drop's silhouette as a CSS mask: the live liquid is clipped to exactly the drawn drop.
  writeFileSync(
    join(site, "public/brand/drop-mask.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${DROP_H}" preserveAspectRatio="none"><path d="${DROP_PATH}"/></svg>\n`,
  );
  copyDir(join(site, "../content/people"), join(site, "public/people"), (n) => /\.(jpe?g|png|webp)$/.test(n));
  writeFileSync(join(site, "public/_headers"), headersFile());

  // Icons from the brand's icon: a small favicon, the iOS touch icon (on cream,
  // since iOS fills transparency with black, with room for its rounded
  // corners) and the install icons.
  const icon = join(site, "public/brand/vasant-icon-512.png");
  await sharp(icon).resize(32, 32).png().toFile(join(site, "public/brand/favicon-32.png"));
  await sharp(icon)
    .resize(136, 136)
    .extend({ top: 22, bottom: 22, left: 22, right: 22, background: "#fffdf8" })
    .flatten({ background: "#fffdf8" })
    .png()
    .toFile(join(site, "public/brand/apple-touch-icon.png"));
  await sharp(icon).resize(192, 192).png().toFile(join(site, "public/brand/icon-192.png"));
  const company = JSON.parse(readFileSync(join(site, "../content/company.json"), "utf8"));
  writeFileSync(
    join(site, "public/site.webmanifest"),
    JSON.stringify(
      {
        name: company.tradeName,
        short_name: company.tradeName.split(" ")[0],
        start_url: "/",
        display: "browser",
        background_color: "#fffdf8",
        theme_color: "#fffdf8",
        icons: [
          { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/brand/vasant-icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log("prepare: tokens.css, fonts, brand assets, icons and _headers derived from design-system/ and src/");
}
