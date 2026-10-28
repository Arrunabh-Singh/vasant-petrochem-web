import { expect, test, type Page } from "@playwright/test";
import { filmProblems, scrollFilm } from "../film-checks.ts";

/**
 * The home film, frame by frame, scrolled down and back up: one grade at a
 * time, no words on the drop or under the phone's action bar, the drop
 * centred on phones, and the road's pin quiet until the tanker leaves.
 * Runs in every project (Chromium, WebKit on an iPhone, Firefox, laptop), on
 * the shortest common phone screens, and through islands/scrub.ts (?film=scrub),
 * the engine that plays the film where scroll-driven animations are missing.
 */

async function problemsAt(page: Page, share: number, phone: boolean): Promise<string[]> {
  await page.evaluate(scrollFilm, share);
  await page.waitForTimeout(80);
  return page.evaluate(filmProblems, phone);
}

async function playFilm(page: Page, phone: boolean, path = "/") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const shares = Array.from({ length: 41 }, (_, i) => i / 40);
  const problems = new Set<string>();
  for (const s of [...shares, ...shares.slice().reverse()]) for (const p of await problemsAt(page, s, phone)) problems.add(p);
  expect([...problems]).toEqual([]);
}

test("the film plays cleanly down and back up", async ({ page, isMobile, hasTouch }) => {
  test.setTimeout(120_000);
  await playFilm(page, isMobile || hasTouch);
});

// islands/scrub.ts, the engine for browsers without scroll-driven animations, forced on here.
test("the film plays the same through the scroll engine", async ({ page, isMobile, hasTouch }) => {
  test.setTimeout(120_000);
  await playFilm(page, isMobile || hasTouch, "/?film=scrub");
});

test.describe("on the shortest phones", () => {
  for (const [width, height] of [
    [320, 568],
    [360, 560],
    [375, 667],
  ] as const) {
    test.describe(`${width}×${height}`, () => {
      test.use({ viewport: { width, height } });
      test("the film still fits", async ({ page, hasTouch }) => {
        test.skip(!hasTouch, "phone projects only");
        test.setTimeout(120_000);
        await playFilm(page, true);
      });
    });
  }
});

test("the road's pin is a quiet dot until the tanker leaves", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const road = document.querySelector(".vp-road")!;
    scrollTo({ top: road.getBoundingClientRect().top + scrollY - innerHeight / 2, behavior: "instant" });
  });
  await page.waitForTimeout(150);
  const rings = await page.evaluate(() => [...document.querySelectorAll(".vp-road-pin span")].slice(1).map((s) => Number(getComputedStyle(s).opacity)));
  expect(rings.every((o) => o < 0.05)).toBe(true);
});

test("a tapped link leaves nothing frozen on the way back", async ({ page, hasTouch }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const cta = page.locator(".vp-film-copy .vp-btn-primary");
  if (hasTouch) await cta.tap();
  else await cta.click();
  await expect(page).toHaveURL(/\/marketplace$/);
  await page.goBack({ waitUntil: "load" });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".vp-film")).toBeAttached();
  // Mid-film the hero's words have gone, whatever focus the tap left behind.
  await page.evaluate(() => {
    const film = document.querySelector<HTMLElement>(".vp-film")!;
    scrollTo({ top: film.getBoundingClientRect().top + scrollY + 0.5 * (film.offsetHeight - innerHeight), behavior: "instant" });
  });
  await expect.poll(() => page.locator(".vp-film-copy").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
});

// iOS Safari's toolbar collapses mid-scroll and the screen grows taller: the
// film must keep playing (the hero's words fading, the drop growing), never
// freeze at its first frame. In Safari only the engine moves the film.
test("the film keeps playing when the phone's toolbar collapses", async ({ page, hasTouch, browserName }) => {
  test.skip(!hasTouch, "phone projects only");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 393, height: 659 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const to = (share: number) =>
    page.evaluate((share) => {
      const film = document.querySelector<HTMLElement>(".vp-film")!;
      scrollTo({ top: film.getBoundingClientRect().top + scrollY + share * (film.offsetHeight - innerHeight), behavior: "instant" });
    }, share);
  await to(0.02);
  await page.setViewportSize({ width: 393, height: 780 });
  await page.waitForTimeout(200);
  await to(0.3);
  await expect.poll(() => page.locator(".vp-film-copy").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
  if (browserName === "webkit") {
    const native = await page.evaluate(() => document.getAnimations().filter((a) => a.timeline !== document.timeline).length);
    expect(native).toBe(0);
  }
  const shares = Array.from({ length: 21 }, (_, i) => i / 20);
  const problems = new Set<string>();
  for (const s of [...shares, ...shares.slice().reverse()]) for (const p of await problemsAt(page, s, true)) problems.add(p);
  expect([...problems]).toEqual([]);
});
