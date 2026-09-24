import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: a real browser against a real server.
 *
 * These run against the development database and the seeded accounts, so they
 * are deliberately read-only — navigation, guards, search and rendering. Tests
 * that create or delete data belong in the integration project, which gets its
 * own throwaway database.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Serial locally so a shared dev server isn't fighting itself; parallel in CI.
  fullyParallel: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Signs in once; the rest reuse the saved cookie + localStorage.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "public",
      testMatch: /(landing|guard)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "signed-in",
      testMatch: /app\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.tmp/auth.json",
      },
    },
  ],

  webServer: {
    // A production build in CI, the dev server locally — and if one is already
    // running on 3000, reuse it rather than fighting for the port.
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
