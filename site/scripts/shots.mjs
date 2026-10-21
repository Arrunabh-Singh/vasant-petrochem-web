// Screenshots for review, at a phone (390) and a laptop (1440) width.
//   npm run shots                     every main page, full length, as the still page
//   npm run shots -- /quote /about    just these pages
//   npm run shots -- --film           the home film as contact sheets, scrolled every 4%
// Full-length captures use reduced motion: scroll-driven reveals show each
// element only as it scrolls into view, so a full-page capture with motion on
// would show everything below the first screen mid-reveal.
// Against a running site (npm run preview), or SHOTS_URL. Output: site/shots/ (git-ignored).
// Each page also reports horizontal overflow, console errors and CSP violations.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.SHOTS_URL ?? "http://localhost:4321";
const out = new URL("../shots/", import.meta.url).pathname;
const args = process.argv.slice(2);
const film = args.includes("--film");
const reduce = args.includes("--reduce") || !film;
const pages = args.filter((a) => a.startsWith("/"));
const DEFAULT = ["/", "/marketplace", "/products/base-oil-sn500", "/quote", "/source", "/contact", "/about", "/supply", "/industries", "/documents", "/search", "/no-such-page"];
const SIZES = [
  [390, 844, "phone", 195, 7],
  [1440, 900, "laptop", 360, 4],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
let failed = false;
for (const [width, height, tag, thumb, cols] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduce ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => (m.type() === "error" || /Content Security Policy/.test(m.text())) && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  for (const path of film ? ["/"] : pages.length ? pages : DEFAULT) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const name = `${out}${(path.replace(/[/?=&#]+/g, "_") || "_") + (film ? "film" : "")}-${tag}${reduce ? "-still" : ""}.png`;
    if (film) {
      const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const frames = [];
      for (let p = 0; p <= 100; p += 4) {
        await page.evaluate((y) => scrollTo(0, y), Math.round((total * p) / 100));
        await page.waitForTimeout(250);
        frames.push(await sharp(await page.screenshot()).resize(thumb).png().toBuffer());
      }
      const h = Math.round((thumb * height) / width);
      await sharp({ create: { width: cols * (thumb + 6), height: Math.ceil(frames.length / cols) * (h + 6), channels: 3, background: "#777" } })
        .composite(frames.map((input, i) => ({ input, left: (i % cols) * (thumb + 6), top: Math.floor(i / cols) * (h + 6) })))
        .png()
        .toFile(name);
    } else {
      // Scroll through first so lazy images are in the capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: name, fullPage: true });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const issues = [overflow && "HORIZONTAL OVERFLOW", ...errors.splice(0).filter((e) => !/status of 404/.test(e) || path !== "/no-such-page")].filter(Boolean);
    if (issues.length) failed = true;
    console.log(`${tag} ${path}: ${issues.length ? issues.join(" | ") : "ok"}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`shots: ${out}`);
process.exit(failed ? 1 : 0);
