import { test, expect } from '@playwright/test';

test('homepage has expected content', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.locator('h1')).toContainText('Advanced Petrochemical Solutions');
  await page.screenshot({ path: 'tests/screenshots/homepage.png', fullPage: true });
});
