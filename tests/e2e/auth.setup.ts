import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "tests/.tmp/auth.json";

/**
 * Signs in once as the seeded free-plan account and saves the session.
 *
 * bob rather than alice: alice is the Pro account, but her seeded password no
 * longer matches TEST_INSTRUCTIONS.md, so signing in as her fails until the
 * database is reseeded.
 */
setup("authenticate", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel(/email/i).fill("bob@example.com");
  await page.getByLabel(/password/i).fill("bob2024");
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // The proxy sends a signed-in user to the catalog.
  await page.waitForURL("**/recipes");
  await expect(
    page.getByRole("heading", { name: /the catalog/i })
  ).toBeVisible();

  // Captures both the httpOnly cookie the proxy reads and the localStorage
  // token the client sends.
  await page.context().storageState({ path: AUTH_FILE });
});
