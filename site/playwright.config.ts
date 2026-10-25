import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the built site on the local Worker (npm run
 * preview). Off the live host every form answers as a dry run, so nothing is
 * stored or emailed (src/server/http.ts isLive).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:4321", browserName: "chromium", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "laptop", use: { viewport: { width: 1440, height: 900 } } },
    // Safari's engine on an iPhone, and Firefox at phone size (Firefox has no isMobile): the film first.
    { name: "webkit-iphone", testMatch: /film\.spec\.ts/, use: { ...devices["iPhone 15"], browserName: "webkit" } },
    { name: "firefox-phone", testMatch: /film\.spec\.ts/, use: { browserName: "firefox", viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  // CI starts the preview once and shares it with Lighthouse and ZAP. Locally,
  // restart the preview after a build: wrangler dev keeps serving the old Worker.
  webServer: { command: "npm run preview", url: "http://localhost:4321", reuseExistingServer: true, timeout: 120_000 },
});
