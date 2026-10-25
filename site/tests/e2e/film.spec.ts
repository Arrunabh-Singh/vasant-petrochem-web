import { expect, test, type Page } from "@playwright/test";

/**
 * The home film, frame by frame, scrolled down and back up: one grade at a
 * time, no words on the drop or under the phone's action bar, the drop
 * centred on phones, and the road's pin quiet until the tanker leaves.
 * Runs in every project (Chromium, WebKit on an iPhone, Firefox, laptop) and
 * on the shortest common phone screens.
 */

async function problemsAt(page: Page, share: number, phone: boolean): Promise<string[]> {
  await page.evaluate((share) => {
    const film = document.querySelector<HTMLElement>(".vp-film")!;
    const top = film.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + share * (film.offsetHeight - innerHeight), behavior: "instant" });
  }, share);
  await page.waitForTimeout(80);
  return page.evaluate(
    ([share, phone]) => {
      const box = (e: Element) => e.getBoundingClientRect();
      const seen = (e: Element) => {
        let o = 1;
        for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
        return o;
      };
      const out: string[] = [];
      const grades = [...document.querySelectorAll(".vp-oil")].filter((e) => seen(e) > 0.05);
      if (grades.length > 1) out.push(`${grades.length} grades at once`);
      const drop = box(document.querySelector(".vp-film-float")!);
      const dropShown = seen(document.querySelector(".vp-film-drop")!) > 0.3;
      const bar = document.querySelector(".vp-actionbar");
      const barTop = bar && getComputedStyle(bar).display !== "none" ? box(bar).top : innerHeight;
      const words = document.querySelectorAll(
        ".vp-film-copy .vp-eyebrow, .vp-film-copy h1, .vp-film-copy .vp-lead, .vp-film-copy .vp-actions, .vp-film-title, .vp-oil-name, .vp-oil-meta, .vp-oil .vp-link",
      );
      for (const e of [...words].filter((w) => seen(w) > 0.3)) {
        const b = box(e);
        const name = e.className.toString().split(" ")[0] || e.tagName;
        const ix = Math.min(b.right, drop.right) - Math.max(b.left, drop.left);
        const iy = Math.min(b.bottom, drop.bottom) - Math.max(b.top, drop.top);
        if (dropShown && ix > 8 && iy > 8) out.push(`${name} on the drop`);
        if (b.bottom > barTop + 1 && b.top < innerHeight) out.push(`${name} under the action bar`);
        if (b.top < -1 && b.bottom > 0) out.push(`${name} cut off at the top`);
      }
      if (phone && share > 0.2 && share < 0.9 && Math.abs(drop.left + drop.width / 2 - innerWidth / 2) > 2) out.push("drop off centre");
      return out.map((p) => `${p} at ${share}`);
    },
    [share, phone] as const,
  );
}

async function playFilm(page: Page, phone: boolean) {
  await page.goto("/");
  // Browsers without scroll-driven animations get the still page until the film has an engine of its own there.
  test.skip(!(await page.evaluate(() => CSS.supports("animation-timeline: view()"))), "no scroll-driven animations in this browser");
  const shares = Array.from({ length: 41 }, (_, i) => i / 40);
  const problems = new Set<string>();
  for (const s of [...shares, ...shares.slice().reverse()]) for (const p of await problemsAt(page, s, phone)) problems.add(p);
  expect([...problems]).toEqual([]);
}

test("the film plays cleanly down and back up", async ({ page, isMobile, hasTouch }) => {
  test.setTimeout(120_000);
  await playFilm(page, isMobile || hasTouch);
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
  test.skip(!(await page.evaluate(() => CSS.supports("animation-timeline: view()"))), "no scroll-driven animations in this browser");
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
  test.skip(!(await page.evaluate(() => CSS.supports("animation-timeline: view()"))), "no scroll-driven animations in this browser");
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
