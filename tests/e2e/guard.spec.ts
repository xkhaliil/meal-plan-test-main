import { test, expect } from "@playwright/test";

/**
 * The proxy is the only thing standing between a signed-out visitor and the
 * app shell, and it can't be exercised without a real browser round trip.
 */
test.describe("route guard", () => {
  test("sends a signed-out visitor to login, remembering where they were going", async ({
    page,
  }) => {
    await page.goto("/recipes");

    await expect(page).toHaveURL(/\/login\?next=%2Frecipes/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("guards every signed-in route", async ({ page }) => {
    for (const route of ["/meal-plans", "/chat", "/settings"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("leaves the marketing page open", async ({ page }) => {
    await page.goto("/landing");
    await expect(page).toHaveURL(/\/landing/);
  });
});
