// Checks the built site (dist/client) for what must never ship. Run after a
// production build; CI runs it on every pull request (npm run check).
//   - a TODO(...) marker or an unfilled {{token}} on a published page
//   - an inline script or style attribute (the strict CSP refuses them)
//   - a script, stylesheet, image or font from another host
//   - an internal link to a page that does not exist
//   - JavaScript over the page's budget (gzipped)
//   - a stale copyright year
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const dist = process.argv[2] ?? fileURLToPath(new URL("../dist/client/", import.meta.url));
// Pages rendered by the Worker on request, so not files in dist.
const ON_DEMAND = [/^\/api\//, /^\/marketplace\/offers$/, /^\/\.well-known\/security\.txt$/];
// Gzipped JS per page (the plan's performance budget).
const BUDGET = (path) => (/^\/(marketplace|quote)(\/|$)/.test(path) ? 40_000 : /^\/($|products\/)/.test(path) ? 20_000 : 15_000);

const html = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) html.push(p);
  }
};
walk(dist);

const pathOf = (file) => "/" + relative(dist, file).replace(/\.html$/, "").replace(/(^|\/)index$/, "");
const exists = (path) => {
  const clean = path.replace(/[?#].*$/, "").replace(/\/$/, "") || "/";
  if (ON_DEMAND.some((r) => r.test(clean))) return true;
  if (clean === "/") return existsSync(join(dist, "index.html"));
  return existsSync(join(dist, clean + ".html")) || existsSync(join(dist, clean)) || existsSync(join(dist, clean, "index.html"));
};
const gz = new Map();
const gzSize = (src) => {
  if (!gz.has(src)) gz.set(src, existsSync(join(dist, src)) ? gzipSync(readFileSync(join(dist, src))).length : 0);
  return gz.get(src);
};

const problems = [];
const year = String(new Date().getFullYear());
for (const file of html) {
  const page = pathOf(file);
  const doc = readFileSync(file, "utf8");
  const fail = (what) => problems.push(`${page}: ${what}`);
  if (/TODO\(/.test(doc)) fail("contains a TODO( marker");
  if (/\{\{\s*\w+\s*\}\}/.test(doc)) fail("contains an unfilled {{token}}");
  if (/\sstyle=/i.test(doc)) fail("has an inline style attribute");
  for (const m of doc.matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = m[1];
    if (/\bsrc=/i.test(attrs)) continue;
    if (/type="(application\/ld\+json|application\/json|speculationrules)"/i.test(attrs)) continue;
    fail("has an inline script");
  }
  const assets = [
    ...doc.matchAll(/<(?:script|img|source)\b[^>]*?\bsrc="([^"]+)"/gi),
    ...doc.matchAll(/<link\b(?=[^>]*\brel="(?:stylesheet|preload|modulepreload|icon|apple-touch-icon|manifest)")[^>]*?\bhref="([^"]+)"/gi),
  ];
  for (const [, url] of assets) {
    if (/^(https?:)?\/\//.test(url) && !url.startsWith("https://www.vasantpetrochem.com/")) fail(`loads ${url} from another host`);
  }
  for (const m of doc.matchAll(/<a\b[^>]*\bhref="(\/[^"]*)"/gi)) {
    if (!exists(m[1])) fail(`links to ${m[1]}, which does not exist`);
  }
  const js = [...doc.matchAll(/<script\b[^>]*\bsrc="(\/_astro\/[^"]+\.js)"/gi)].reduce((n, m) => n + gzSize(m[1]), 0);
  if (js > BUDGET(page)) fail(`ships ${js} bytes of gzipped JS (budget ${BUDGET(page)})`);
  if (/vp-footer/.test(doc) && !doc.includes(year)) fail(`footer copyright does not reach ${year}`);
}

if (problems.length) {
  console.error(`checks: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`checks: ${html.length} pages clean`);
