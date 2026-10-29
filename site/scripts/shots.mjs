// Screenshots for review, at a phone (390) and a laptop (1440) width.
//   npm run shots                     every main page, full length, as the still page
//   npm run shots -- /quote /about    just these pages
//   npm run shots -- --film           the home film as contact sheets: every 4% of its pinned stretch, and the frames it snaps to
//   npm run shots -- --browser webkit an engine other than Chromium (webkit, firefox); WebKit uses iPhone 15 for the phone
// Full-length captures use reduced motion: scroll-driven reveals show each
// element only as it scrolls into view, so a full-page capture with motion on
// would show everything below the first screen mid-reveal.
// Against a running site (npm run preview), or SHOTS_URL. Output: site/shots/ (git-ignored).
// Each page also reports horizontal overflow, console errors and CSP violations.
import { mkdirSync } from "node:fs";
import { chromium, devices, firefox, webkit } from "@playwright/test";
import sharp from "sharp";

const base = process.env.SHOTS_URL ?? "http://localhost:4321";
const out = new URL("../shots/", import.meta.url).pathname;
const args = process.argv.slice(2);
const film = args.includes("--film");
const reduce = args.includes("--reduce") || !film;
const pages = args.filter((a) => a.startsWith("/"));
const engine = args.includes("--browser") ? args[args.indexOf("--browser") + 1] : "chromium";
const DEFAULT = ["/", "/marketplace", "/products/base-oil-sn500", "/quote", "/source", "/contact", "/about", "/supply", "/industries", "/documents", "/search", "/no-such-page"];
const SIZES = [
  [390, 844, "phone", 195, 7],
  [1440, 900, "laptop", 360, 4],
];

mkdirSync(out, { recursive: true });
// Wait up to a minute for the preview to answer, so shots can start alongside it.
for (let i = 0; ; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {}
  if (i >= 60) {
    console.error(`shots: nothing answering at ${base}. Start it with npm run preview.`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
const browserType = { chromium, webkit, firefox }[engine];
if (!browserType) throw new Error(`shots: unknown browser ${engine}`);
const browser = await browserType.launch(engine === "chromium" && process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
let failed = false;
for (const [width, height, tag, thumb, cols] of SIZES) {
  // Phones as phones: touch, a mobile viewport (Firefox has no isMobile), and on WebKit the iPhone itself.
  const phone = tag === "phone" ? (engine === "webkit" ? devices["iPhone 15"] : { viewport: { width, height }, hasTouch: true, isMobile: engine !== "firefox" }) : { viewport: { width, height } };
  const ctx = await browser.newContext({ ...phone, reducedMotion: reduce ? "reduce" : "no-preference" });
  const vh = phone.viewport.height;
  const page = await ctx.newPage();
  const errors = [];
  // WebKit notes on the report-only policy that are not problems: Playwright's own screenshot stylesheet,
  // and two directives Safari doesn't apply in report-only mode or doesn't know yet.
  const webkitNoise = /\[Report Only\] Refused to apply a stylesheet|'inline-speculation-rules'|'frame-ancestors' is ignored when delivered in a report-only policy/;
  page.on("console", (m) => (m.type() === "error" || /Content Security Policy/.test(m.text())) && !(engine === "webkit" && webkitNoise.test(m.text())) && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  for (const path of film ? ["/"] : pages.length ? pages : DEFAULT) {
    // "load", not "networkidle": a page with a Turnstile widget keeps the network busy.
    await page.goto(base + path, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const name = `${out}${(path.replace(/[/?=&#]+/g, "_") || "_") + (film ? "film" : "")}-${tag}${reduce ? "-still" : ""}${engine === "chromium" ? "" : `-${engine}`}.png`;
    if (film) {
      // Positions along the film's pinned stretch (CSS's contain range), then the rest of the page; instant, as smooth scrolling would catch frames mid-way.
      const { top, length, total } = await page.evaluate(() => {
        const f = document.querySelector(".vp-film");
        return { top: f.getBoundingClientRect().top + scrollY, length: f.offsetHeight - innerHeight, total: document.documentElement.scrollHeight - innerHeight };
      });
      const stops = [];
      for (let p = 0; p <= 100; p += 4) stops.push(Math.round(top + (length * p) / 100));
      for (let y = top + length; y < total; y += Math.round(length / 12)) stops.push(Math.min(total, y));
      const shot = async () => sharp(await page.screenshot({ caret: "initial" })).resize(thumb).png().toBuffer();
      const h = Math.round((thumb * vh) / (phone.viewport.width));
      const sheet = (frames, file) =>
        sharp({ create: { width: cols * (thumb + 6), height: Math.ceil(frames.length / cols) * (h + 6), channels: 3, background: "#777" } })
          .composite(frames.map((input, i) => ({ input, left: (i % cols) * (thumb + 6), top: Math.floor(i / cols) * (h + 6) })))
          .png()
          .toFile(file);
      // The sweep with the page's snapping off, so every position shows, not the frame it would snap to.
      await page.evaluate(() => (document.documentElement.style.scrollSnapType = "none"));
      const frames = [];
      for (const y of stops) {
        await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
        await page.waitForTimeout(250);
        frames.push(await shot());
      }
      await sheet(frames, name);
      // Then the frames a visitor lands on, one Page Down at a time, until the page lets go past the film.
      if (!reduce) {
        await page.evaluate(() => ((document.documentElement.style.scrollSnapType = ""), scrollTo({ top: 0, behavior: "instant" })));
        const landed = [];
        for (let i = 0; i < 20; i++) {
          await page.waitForTimeout(700);
          landed.push(await shot());
          if (!(await page.evaluate(() => document.documentElement.classList.contains("vp-snap")))) break;
          await page.keyboard.press("PageDown");
        }
        await sheet(landed, name.replace(/\.png$/, "-frames.png"));
      }
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
      await page.screenshot({ path: name, fullPage: true, caret: "initial" });
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
