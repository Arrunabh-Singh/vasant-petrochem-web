import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  "/",
  "/marketplace",
  "/marketplace/compare?p=base-oil-sn500,base-oil-sn150",
  "/marketplace/offers",
  "/products/base-oil-sn500",
  "/products/base-oil-sn500/datasheet",
  "/quote",
  "/sent",
  "/source",
  "/contact",
  "/about",
  "/supply",
  "/industries",
  "/industries/road-construction",
  "/documents",
  "/search",
  "/no-such-page",
];

/** Console errors, uncaught exceptions and CSP violations (enforced or report-only). */
function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || /Content Security Policy/.test(m.text())) problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

test.describe("every page", () => {
  // The still page: scroll-driven reveals would hold content mid-fade for axe.
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  for (const path of PAGES) {
    test(`${path} has no accessibility violations, errors or sideways scroll`, async ({ page }) => {
      const problems = watch(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(path === "/no-such-page" ? 404 : 200);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(problems.filter((p) => !(path === "/no-such-page" && /status of 404/.test(p)))).toEqual([]);
    });
  }
});

test("each page names its own address, and the header marks where you are", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.vasantpetrochem.com/about");
  await expect(page.locator('.vp-nav-links a[href="/about"]')).toHaveAttribute("aria-current", "page");
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.vasantpetrochem.com/");
});

test("the home film plays without errors", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/");
  for (let y = 0; y < 24; y++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(80);
  }
  expect(problems).toEqual([]);
});

/** Scrolls the film to a share of its pinned stretch (CSS's `contain` range). */
async function filmAt(page: Page, share: number) {
  await page.evaluate((share) => {
    const film = document.querySelector<HTMLElement>(".vp-film")!;
    const top = film.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + share * (film.offsetHeight - innerHeight), behavior: "instant" });
  }, share);
  await page.waitForTimeout(300);
}

test("the hero's buttons work over the film, and only the grade on screen takes a click", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Browse the marketplace/ }).first().click();
  await expect(page).toHaveURL(/\/marketplace$/);

  await page.goto("/");
  // The first grade, darkest on the scale, holds the middle of its slot (22% + 72% / n / 2).
  const n = await page.locator(".vp-oil").count();
  await filmAt(page, 0.22 + 0.72 / n / 2);
  const first = page.locator(".vp-oil").first();
  const name = (await first.locator("h3").textContent())?.trim() ?? "";
  await first.getByRole("link").click();
  await expect(page).toHaveURL(/\/products\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("keyboard focus brings each grade of the film on screen", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones have no keyboard to tab with");
  await page.goto("/");
  // A key press first, as a keyboard user's would be: only keyboard focus (:focus-visible) moves the film.
  await page.keyboard.press("Shift");
  for (const grade of (await page.locator(".vp-oil").all()).slice(0, 3)) {
    await grade.getByRole("link").focus();
    await expect(grade.locator("h3")).toBeInViewport();
    await expect.poll(() => grade.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.99);
  }
});

test.describe("with reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("the home page shows every grade, darkest to lightest, each with its link", async ({ page }) => {
    await page.goto("/");
    const grades = page.locator(".vp-oil");
    expect(await grades.count()).toBeGreaterThan(1);
    for (const grade of await grades.all()) {
      await expect(grade.getByRole("heading", { level: 3 })).toBeVisible();
      await expect(grade.getByRole("link")).toBeVisible();
    }
  });
});

test("filters narrow the marketplace, and the view survives a reload", async ({ page, isMobile }) => {
  await page.goto("/marketplace");
  const total = await page.locator("[data-results] > li").count();
  if (isMobile) await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByRole("button", { name: /^Fuels/ }).click();
  if (isMobile) await page.locator("[data-done]").click();
  const shown = page.locator("[data-results] > li:visible");
  await expect(page.locator("[data-count]")).toHaveText(new RegExp(`^${await shown.count()} of ${total} products$`));
  for (const card of await shown.locator("[data-product]").all()) await expect(card).toHaveAttribute("data-family", "fuels");
  await expect(page).toHaveURL(/family=fuels/);
  await page.reload();
  await expect(page.locator("[data-count]")).toHaveText(/ of /);
});

test("two grades go side by side in the comparison", async ({ page }) => {
  await page.goto("/marketplace");
  const boxes = page.locator("[data-compare]");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.locator("[data-tray-go]").click();
  await expect(page).toHaveURL(/\/marketplace\/compare\?p=[a-z0-9-]+,[a-z0-9-]+/);
  await expect(page.locator(".vp-compare thead th[scope=col]")).toHaveCount(3);
});

test("a product joins the quote list, and the enquiry answers as a dry run", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/products/base-oil-sn500");
  await page.locator("[data-add]").first().click();
  await expect(page.locator("[data-basket-count]")).toHaveText("1");
  await page.goto("/quote");
  await expect(page.locator("[data-lines] > li")).toHaveCount(1);
  // The grade is in, so the request opens on its second step, and a tap fills a tanker's worth.
  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  // The phone's bar offers WhatsApp here, not a link back to this page.
  await expect(page.locator(".vp-actionbar")).toContainText("Chat on WhatsApp");
  await expect(page.locator(".vp-actionbar")).not.toContainText("Get a quote");
  await page.getByRole("button", { name: /^One tanker/ }).click();
  await expect(page.locator('[data-field="qty"]')).toHaveValue("20");
  // The draft is saved as the visitor types, and says so only then.
  await expect(page.getByText("Saved on this device")).toBeHidden();
  await page.getByLabel("Delivery city or PIN").fill("Pithampur");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.getByLabel("Your name").fill("Test Buyer");
  await page.getByLabel("Work email").fill("buyer@example.com");
  await expect(page.getByText("Ready to send")).toBeVisible();
  await page.waitForTimeout(3100); // the time-to-submit window (src/server/bot.ts)
  await page.getByRole("button", { name: "Send enquiry" }).click();
  // "Request received": the reference, both WhatsApp next steps, and what was sent.
  const peak = page.getByRole("region", { name: "Request received" });
  await expect(peak.locator("[data-reference]")).toHaveText("VP-ENQ-TEST-0000");
  await expect(peak.getByRole("link", { name: "Chat now on WhatsApp" })).toHaveAttribute("href", /VP-ENQ-TEST-0000/);
  await expect(peak.getByRole("link", { name: "Get today’s lots on WhatsApp" })).toBeVisible();
  await expect(peak.locator("[data-sent-lines] li")).toHaveText([/Base Oil SN500\s*One tanker \(20 kL\)/, /Pithampur/]);
  await expect(page.locator(".vp-actionbar")).toBeHidden();
  expect(problems).toEqual([]);
});

test("no sound until the visitor turns it on, and then it is remembered", async ({ page, hasTouch }) => {
  await page.addInitScript(() => {
    const w = window as Window & { audioContexts?: number };
    w.audioContexts = 0;
    window.AudioContext = class extends AudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        w.audioContexts! += 1;
      }
    };
  });
  const contexts = () => page.evaluate(() => (window as Window & { audioContexts?: number }).audioContexts);
  await page.goto("/products/base-oil-sn500");
  await page.locator("[data-add]").first().click();
  expect(await contexts()).toBe(0);
  if (hasTouch) await page.getByRole("button", { name: "Open menu" }).click();
  const sound = page.locator("[data-sound]:visible");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  expect(await contexts()).toBe(1);
  await page.goto("/quote");
  await expect(page.locator("[data-sound]").first()).toHaveAttribute("aria-pressed", "true");
});

test("the skip link takes keyboard users to the content", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard path");
  await page.goto("/marketplace");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("the offers board points to sourcing when it has no lots", async ({ page }) => {
  await page.goto("/marketplace/offers");
  await expect(page.locator("main a[href='/source']").first()).toBeVisible();
});

test("the buyer account is the site's 404 page until it launches", async ({ page }) => {
  test.skip(JSON.parse(readFileSync("../content/pages/account.json", "utf8")).status === "published", "the portal is live");
  const res = await page.goto("/account");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("This page doesn’t exist.");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the marketplace lists every product and the quote form takes free text", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.locator("[data-filters]")).toBeHidden();
    const items = page.locator("[data-results] > li");
    for (const li of await items.all()) await expect(li).toBeVisible();
    await page.goto("/quote");
    await expect(page.locator("[data-add-wrap]")).toBeHidden();
    await expect(page.getByLabel("Other products or details")).toBeVisible();
  });
});
