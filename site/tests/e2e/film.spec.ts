import { expect, test, type Page } from "@playwright/test";
import { filmProblems, filmState, filmTop, scrollFilm } from "../film-checks.ts";

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
    document.documentElement.style.scrollSnapType = "none";
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
  await page.evaluate(scrollFilm, 0.5);
  await expect.poll(() => page.locator(".vp-film-copy").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
});

// iOS Safari's toolbar collapses mid-scroll and the screen grows taller: the
// film must keep playing (the hero's words fading, the drop growing), never
// freeze at its first frame.
test("the film keeps playing when the phone's toolbar collapses", async ({ page, hasTouch, browserName }) => {
  test.skip(!hasTouch, "phone projects only");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 393, height: 659 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const to = (share: number) => page.evaluate(scrollFilm, share);
  await to(0.02);
  await page.setViewportSize({ width: 393, height: 780 });
  await page.waitForTimeout(200);
  await to(0.3);
  await expect.poll(() => page.locator(".vp-film-copy").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
  if (browserName === "webkit") {
    // iPhones (iOS WebKit) play the film natively, on the compositor; desktop Safari only through the engine.
    const state = await page.evaluate(filmState, null);
    if (state.touch) expect(state.engine).toBe(false);
    else expect(state.native).toBe(0);
  }
  const shares = Array.from({ length: 21 }, (_, i) => i / 20);
  const problems = new Set<string>();
  for (const s of [...shares, ...shares.slice().reverse()]) for (const p of await problemsAt(page, s, true)) problems.add(p);
  expect([...problems]).toEqual([]);
});

/**
 * One input, one frame (styles/film.css, islands/film-snap.ts): from the top,
 * each wheel notch, key or flick lands on the next frame, the hero, the
 * scale's title, each grade in turn, then the statement, the way out; never
 * between two, and never two at once.
 */
test.describe("one frame per input", () => {
  /** The frame the page rests on. */
  const where = () => {
    const seen = (e: Element) => {
      let o = 1;
      for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    };
    if (scrollY < 2) return "top";
    if (Math.abs(document.querySelector(".vp-statement")!.getBoundingClientRect().top) < 2) return "statement";
    const shown = [...document.querySelectorAll(".vp-oil")].map(seen);
    const i = shown.findIndex((o) => o > 0.95);
    if (i >= 0 && shown.filter((o) => o > 0.05).length === 1) return `grade ${i}`;
    if (seen(document.querySelector(".vp-film-title")!) > 0.95) return "title";
    const film = document.querySelector<HTMLElement>(".vp-film")!;
    return `between, at ${Math.round((-film.getBoundingClientRect().top / (film.offsetHeight - innerHeight)) * 1000) / 1000}`;
  };
  /** Wait until the page has stopped moving. */
  async function settle(page: Page) {
    let last = -1;
    for (let i = 0; i < 50; i++) {
      const y = await page.evaluate(() => Math.round(scrollY));
      if (y === last) return;
      last = y;
      await page.waitForTimeout(150);
    }
  }
  async function walk(page: Page, step: () => Promise<unknown>) {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveClass(/vp-snap/);
    const n = await page.locator(".vp-oil").count();
    const seen = [await page.evaluate(where)];
    for (let i = 0; i < n + 2; i++) {
      await step();
      await settle(page);
      seen.push(await page.evaluate(where));
    }
    expect(seen).toEqual(["top", "title", ...Array.from({ length: n }, (_, i) => `grade ${i}`), "statement"]);
    // Past the film the page scrolls freely, and the anchor marks the chapter.
    await expect(page.locator("html")).not.toHaveClass(/vp-snap/);
    await expect(page.locator('.vp-chapters a[aria-current="true"]')).toHaveAttribute("data-chapter", "our-word");
  }

  test("a wheel notch moves one frame", async ({ page, hasTouch, browserName }) => {
    test.skip(hasTouch || browserName !== "chromium", "a mouse wheel: laptops");
    test.setTimeout(90_000);
    await page.mouse.move(720, 450);
    await walk(page, () => page.mouse.wheel(0, 100));
  });

  for (const key of ["Space", "PageDown"]) {
    test(`${key} moves one frame`, async ({ page, hasTouch, browserName }) => {
      test.skip(hasTouch || browserName !== "chromium", "a keyboard: laptops");
      test.setTimeout(90_000);
      await walk(page, () => page.keyboard.press(key));
    });
  }

  for (const [kind, speed, distance] of [["flick", 1600, 260], ["fast flick", 5000, 700]] as const) {
    test(`a ${kind} moves one frame`, async ({ page, hasTouch, browserName }) => {
      test.skip(!hasTouch || browserName !== "chromium", "a finger: Chromium phones (Input.synthesizeScrollGesture)");
      test.setTimeout(90_000);
      const cdp = await page.context().newCDPSession(page);
      await walk(page, () =>
        cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 560, yDistance: -distance, speed, gestureSourceType: "touch", preventFling: false }),
      );
    });
  }

  test("a swatch goes to its grade, and Skip the film to the statement", async ({ page, hasTouch }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(scrollFilm, 0.3);
    await page.evaluate(() => (document.documentElement.style.scrollSnapType = ""));
    await settle(page);
    const swatch = page.locator(".vp-swatch-link").nth(4);
    if (hasTouch) await swatch.tap();
    else await swatch.click();
    await settle(page);
    expect(await page.evaluate(where)).toBe("grade 4");
    const skip = page.locator(".vp-film-skip");
    if (hasTouch) await skip.tap();
    else await skip.click();
    await settle(page);
    expect(await page.evaluate(where)).toBe("statement");
  });

  test("a chapter dot goes to its chapter", async ({ page, hasTouch, browserName }) => {
    test.skip(hasTouch || browserName !== "chromium", "the dots: laptops");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator('.vp-chapters a[data-chapter="road"]').click();
    await settle(page);
    expect(await page.evaluate(() => Math.round(document.querySelector(".vp-road")!.getBoundingClientRect().top))).toBe(0);
    await expect(page.locator('.vp-chapters a[aria-current="true"]')).toHaveAttribute("data-chapter", "road");
    await page.locator('.vp-chapters a[data-chapter="grades"]').click();
    await settle(page);
    expect(await page.evaluate(where)).toBe("title");
    await page.evaluate(filmTop, null);
  });
});
