import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The home page's opening (components/Intro.astro). Automated browsers go
// straight in, so these tests ask for it with ?loader=on.
const OPENING = "/?loader=on";
const dialog = (page: Page) => page.locator("dialog[data-intro]");
const go = (page: Page, how: "enter" | "sound" | "skip") => page.locator(`[data-intro-go="${how}"]`);
const press = async (page: Page, how: "enter" | "sound" | "skip") =>
  test.info().project.use.hasTouch ? go(page, how).tap() : go(page, how).click();

async function ready(page: Page) {
  await expect(dialog(page)).toHaveAttribute("open", "");
  await expect(page.locator("[data-intro-state]")).toHaveText("Ready", { timeout: 8_000 });
}

/** The page beneath, once the opening has gone: no dialog, nothing held, the visit remembered. */
async function inside(page: Page) {
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/vp-opening/);
  expect(await page.evaluate(() => sessionStorage.getItem("vp-entered"))).toBe("1");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(".vp-film-drop")).toBeVisible();
}

test("agents and automated browsers go straight in", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/vp-opening/);
  await expect(dialog(page)).toBeHidden();
});

test("the opening counts to 100, then Enter flies the drop to the hero", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(OPENING);
  await expect(page.locator("[data-intro-state]")).toHaveText("Loading");
  await ready(page);
  // Focus moves to Enter, so a keyboard can go in at once.
  await expect(go(page, "enter")).toBeFocused();
  await press(page, "enter");
  await inside(page);
  expect(errors).toEqual([]);
});

test("the keyboard goes in with Enter", async ({ page }) => {
  await page.goto(OPENING);
  await ready(page);
  await page.keyboard.press("Enter");
  await inside(page);
});

test("Escape and Skip intro go straight in, before it is ready", async ({ page }) => {
  await page.goto(OPENING);
  await expect(dialog(page)).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await inside(page);

  await page.evaluate(() => sessionStorage.clear());
  await page.goto(OPENING);
  await expect(dialog(page)).toHaveAttribute("open", "");
  await press(page, "skip");
  await inside(page);
});

test("Enter with sound turns sound on, and plays", async ({ page }) => {
  await page.addInitScript(() => {
    const Base = window.AudioContext;
    window.AudioContext = class extends Base {
      constructor(options?: AudioContextOptions) {
        super(options);
        (window as unknown as { audioStarted: boolean }).audioStarted = true;
      }
    };
  });
  await page.goto(OPENING);
  await ready(page);
  await press(page, "sound");
  await inside(page);
  expect(await page.evaluate(() => localStorage.getItem("vp-sound"))).toBe("on");
  expect(await page.evaluate(() => (window as unknown as { audioStarted?: boolean }).audioStarted)).toBe(true);
  for (const toggle of await page.locator("[data-sound]").all()) await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

test("once per tab: a return goes straight in", async ({ page }) => {
  await page.goto(OPENING);
  await page.keyboard.press("Escape");
  await inside(page);
  await page.goto(OPENING);
  await expect(page.locator("html")).not.toHaveClass(/vp-opening/);
  await expect(dialog(page)).toBeHidden();
});

test("a link into the page goes straight in", async ({ page }) => {
  await page.goto(`${OPENING}#grades`);
  await expect(dialog(page)).toBeHidden();
});

test.describe("with reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("there is no opening", async ({ page }) => {
    await page.goto(OPENING);
    await expect(page.locator("html")).not.toHaveClass(/vp-opening/);
    await expect(dialog(page)).toBeHidden();
  });
});

test("never a trap: without its script, the opening fades by itself", async ({ page }) => {
  // Only the gate runs; every other script fails to load.
  await page.route(/\/_astro\/.*\.js$/, (route) => (route.request().url().includes("intro-gate") ? route.continue() : route.abort()));
  await page.goto(OPENING);
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toBeHidden({ timeout: 12_000 });
  await page.locator('main a[href="/marketplace"]').first().click();
  await expect(page).toHaveURL(/\/marketplace/);
});

test("the open opening has no accessibility violations", async ({ page }) => {
  await page.goto(OPENING);
  await ready(page);
  await expect(page.locator(".vp-intro-go")).toHaveCSS("opacity", "1");
  const axe = await new AxeBuilder({ page }).include("dialog[data-intro]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
});
