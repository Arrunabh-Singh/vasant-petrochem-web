import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * "Want more?": the doors into the site as a ring you turn (islands/ring.ts).
 * Reading the sentence turns it until the reader takes it; then the buttons,
 * the arrow keys, a drag and a tap on a side door turn it, and only a tap on
 * the door in front opens one. With reduced motion it is a plain grid.
 */

const doors = (page: Page) => page.locator(".vp-door");
const front = (page: Page) => page.evaluate(() => [...document.querySelectorAll(".vp-door")].findIndex((d) => d.classList.contains("is-front")));
const frontName = (page: Page) => page.locator(".vp-door.is-front .vp-door-name");

/** Waits until the ring has come to rest on a door. */
async function settle(page: Page) {
  await page.waitForTimeout(150);
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>(".vp-door")].every((d) => d.style.getPropertyValue("--d").endsWith(".000")));
}

/**
 * Opens the home page at the finale, as its chapter link does (from the top, a
 * jump would land on the film's snap points), with the ring at rest in the
 * middle of the screen.
 */
async function open(page: Page, centre = true) {
  await page.goto("/#explore");
  // The browser scrolls to the finale smoothly once the page has loaded, stopping short by the header's room (scroll-padding-top).
  await page.waitForFunction(() => document.fonts.status === "loaded" && document.querySelector(".vp-ring")?.classList.contains("is-live") && document.getElementById("explore")!.getBoundingClientRect().top <= parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 2);
  if (centre) await page.evaluate(() => document.querySelector(".vp-ring")!.scrollIntoView({ block: "center", behavior: "instant" }));
  await settle(page);
}

/** Scrolls until the sentence's link `name` has just been read (past the line in islands/ring.ts, 55% down the screen). */
async function read(page: Page, name: string) {
  await page.evaluate((name) => {
    const word = [...document.querySelectorAll<HTMLElement>(".vp-finale-text a")].find((a) => a.textContent === name)!;
    scrollTo({ top: word.getBoundingClientRect().top + scrollY - innerHeight * 0.55 + 4, behavior: "instant" });
  }, name);
}

test("reading the sentence turns the ring to each door it names, until the reader takes it", async ({ page }) => {
  await open(page, false);
  await read(page, "get a quote");
  await expect(frontName(page)).toHaveText("Get a quote");
  await expect(page.locator(".vp-finale-text a.is-on")).toHaveText("get a quote");
  await read(page, "marketplace");
  await expect(frontName(page)).toHaveText("Marketplace");
  await expect(page.locator("[data-ring-count]")).toHaveText("01 / 08");

  // Taking it (the button sits below, where reaching it would read the whole sentence first).
  await page.locator("[data-ring-next]").dispatchEvent("click");
  await expect(frontName(page)).toHaveText("Live offers");
  await read(page, "get a quote");
  await page.waitForTimeout(800);
  await expect(frontName(page)).toHaveText("Live offers");
});

test("the buttons turn it both ways round, and say where it is", async ({ page }) => {
  await open(page);
  const start = await front(page);
  await page.locator("[data-ring-next]").click();
  await expect.poll(() => front(page)).toBe((start + 1) % 8);
  const name = await frontName(page).textContent();
  await expect(page.locator("[data-ring-live]")).toHaveText(`${name}, ${((start + 1) % 8) + 1} of 8`);
  await expect(page.locator("[data-ring-count]")).toHaveText(`0${((start + 1) % 8) + 1} / 08`);
  for (let i = 0; i < 3; i++) await page.locator("[data-ring-prev]").click();
  await expect.poll(() => front(page)).toBe((start + 6) % 8);
});

test("the keyboard brings each door round, and Enter opens the one in front", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones have no keyboard to tab with");
  await open(page);
  // From the sentence's last link, Tab reaches the first door, and the ring brings it round.
  await page.locator(".vp-finale-text a").last().focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".vp-door").first().locator("a")).toBeFocused();
  await expect.poll(() => front(page)).toBe(0);
  await page.keyboard.press("ArrowRight");
  await expect(doors(page).nth(1).locator("a")).toBeFocused();
  await expect.poll(() => front(page)).toBe(1);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(doors(page).nth(7).locator("a")).toBeFocused();
  await expect.poll(() => front(page)).toBe(7);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/about$/);
});

test("a drag turns it, and the click that ends a drag opens nothing", async ({ page }) => {
  await open(page);
  const start = await front(page);
  const box = (await page.locator(".vp-door.is-front").boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x - i * 25, y, { steps: 2 });
  await page.mouse.up();
  await expect.poll(() => front(page)).not.toBe(start);
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/#explore$/);
  await expect(page.locator(".vp-ring")).toHaveClass(/is-used/);
});

test("a tap on a side door brings it round; a tap on the door in front opens it", async ({ page }) => {
  await open(page);
  const start = await front(page);
  const href = (i: number) => doors(page).nth(i).locator("a").getAttribute("href");
  // The door to the right, unless that one leaves the site (WhatsApp): then the one to the left.
  const right = (await href((start + 1) % 8))?.startsWith("/") ?? false;
  const target = (start + (right ? 1 : 7)) % 8;
  // Tap the part of it that shows beside the door in front.
  const side = (await doors(page).nth(target).boundingBox())!;
  const ahead = (await page.locator(".vp-door.is-front").boundingBox())!;
  const width = page.viewportSize()!.width;
  const [lo, hi] = right ? [Math.max(side.x, ahead.x + ahead.width + 2), Math.min(side.x + side.width, width - 2)] : [Math.max(side.x, 2), Math.min(side.x + side.width, ahead.x - 2)];
  await page.mouse.click((lo + hi) / 2, side.y + side.height / 2);
  await expect.poll(() => front(page)).toBe(target);
  await expect(page).toHaveURL(/#explore$/);
  await settle(page);
  const path = await href(target);
  await page.locator(".vp-door.is-front a").click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
});

test("the turning ring has no accessibility violations", async ({ page }) => {
  await open(page);
  await page.locator("[data-ring-next]").click();
  await settle(page);
  const axe = await new AxeBuilder({ page }).include(".vp-finale").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
});

test.describe("with reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("the doors are a plain grid of links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".vp-ring")).not.toHaveClass(/is-live/);
    await expect(doors(page)).toHaveCount(8);
    for (const door of await doors(page).all()) {
      await door.scrollIntoViewIfNeeded();
      await expect(door.locator("a")).toBeVisible();
      expect(await door.evaluate((d) => getComputedStyle(d).transform)).toBe("none");
    }
    await expect(page.locator(".vp-ring-bar")).toBeHidden();
  });
});
