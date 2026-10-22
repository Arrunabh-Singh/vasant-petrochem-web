// The brand kit, saved at exact sizes into marketing/<campaign>/ at the repo root (git-ignored):
//   ads/       every product and the range, in the five ad formats, on deep and on cream
//   links.csv  each ad's link per platform, with its UTM tags (design-system/advertising.md)
//   social/    LinkedIn banner, square avatar, WhatsApp profile image
//   print/     A4 letterhead (PDF, plus its top band as a PNG for Word or Google Docs headers)
//              and business cards (PDF, 85 x 55 mm with 3 mm bleed, front and back)
//   signature/ an email signature per person in content/people.json (or one for the company)
//
//   npm run kit -- --campaign diwali-202611 [--claim one-contact]
//
// It builds the site as a preview (the /kit/ pages exist only there), serves
// the build locally and saves each page with Playwright. The ad claim is one of
// the five allowed in design-system/advertising.md; pricing-24h by default.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { chromium } from "@playwright/test";

const SITE = "https://www.vasantpetrochem.com";
const MEDIUM = { meta: "paid_social", linkedin: "paid_social", google: "display", whatsapp: "social" };

const args = process.argv.slice(2);
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const campaign = opt("campaign");
if (!campaign || !/^[a-z0-9][a-z0-9-]{2,59}$/.test(campaign)) {
  console.error("kit: --campaign <slug> is required, e.g. --campaign diwali-202611 (lowercase letters, digits and hyphens)");
  process.exit(1);
}
const site = new URL("..", import.meta.url).pathname;
const out = join(site, "..", "marketing", campaign);

const build = spawnSync("npm", ["run", "build"], { cwd: site, stdio: "inherit", env: { ...process.env, DRAFT_PREVIEW: "1", KIT_CLAIM: opt("claim") ?? "" } });
if (build.status !== 0) process.exit(build.status ?? 1);

// The build's static files, served as the Worker would: /kit/x is kit/x.html.
const root = join(site, "dist/client");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://kit").pathname));
  const file = [join(root, path), join(root, `${path}.html`)].find((f) => f.startsWith(root) && existsSync(f) && extname(f));
  if (!file) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}`;

// The list of files comes from the build itself (read from disk); the server only feeds the pages to Playwright.
const items = JSON.parse(readFileSync(join(root, "kit/items.json"), "utf8"));
const browser = await chromium.launch();
for (const item of items) {
  const file = join(out, item.out);
  mkdirSync(dirname(file), { recursive: true });
  const page = await browser.newPage(item.kind === "png" ? { viewport: { width: item.w, height: item.h }, deviceScaleFactor: item.scale ?? 1 } : {});
  await page.goto(base + item.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (item.kind === "pdf") await page.pdf({ path: file, width: `${item.w}mm`, height: `${item.h}mm`, printBackground: true });
  else await page.screenshot({ path: file, clip: { x: 0, y: 0, width: item.w, height: item.h } });
  await page.close();
}
await browser.close();
server.close();

const link = (landing, source, format) => {
  const u = new URL(landing, SITE);
  for (const [k, v] of Object.entries({ utm_source: source, utm_medium: MEDIUM[source], utm_campaign: campaign, utm_content: format })) u.searchParams.set(k, v);
  return u.toString();
};
const rows = [["file", "platform", "format", "link"]];
for (const i of items.filter((x) => x.landing)) for (const source of i.sources) rows.push([i.out, source, i.format, link(i.landing, source, i.format)]);
writeFileSync(join(out, "links.csv"), rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n") + "\n");

// Email signatures: tables and inline styles, which is all email clients reliably render.
const company = JSON.parse(readFileSync(join(site, "../content/company.json"), "utf8"));
const { people } = JSON.parse(readFileSync(join(site, "../content/people.json"), "utf8"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const email = company.mailboxes.sales ?? company.email;
const w = company.works;
const signature = (name, role) =>
  `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#2e3b35">` +
  (name ? `<tr><td style="padding:0 0 10px"><strong style="font-size:14px;color:#0f2e24">${esc(name)}</strong><br>${esc(role)}</td></tr>` : "") +
  `<tr><td style="padding:10px 0 8px;border-top:2px solid #daad4a"><a href="${SITE}/"><img src="${SITE}/brand/vasant-lockup-compact.png" width="146" height="42" alt="${esc(company.tradeName)}" style="display:block;border:0"></a></td></tr>` +
  `<tr><td><a href="${company.phone.href}" style="color:#2e3b35;text-decoration:none">${esc(company.phone.display)}</a> · <a href="mailto:${esc(email)}" style="color:#246851">${esc(email)}</a> · <a href="${SITE}/" style="color:#246851">vasantpetrochem.com</a></td></tr>` +
  `<tr><td style="font-size:12px;color:#5c6a63">${esc(`${w.street}, ${w.city}, ${w.region} ${w.postalCode}, India`)}</td></tr></table>\n`;
mkdirSync(join(out, "signature"), { recursive: true });
for (const p of people.length ? people : [{ id: "company", name: null, role: null }]) writeFileSync(join(out, "signature", `${p.id}.html`), signature(p.name, p.role));

console.log(`kit: ${items.length} files, links.csv and ${Math.max(people.length, 1)} signature(s) in ${out}`);
