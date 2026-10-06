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

  // A production build prefetches the landing page's links into the app
  // while the visitor is signed out, and the proxy answers those with a
  // redirect to /login. Sign-in used to replay that redirect and stay on the
  // login page. (The dev server doesn't prefetch, so this only bites in CI's
  // production build.)
  test("signing in after the landing page still opens the app", async ({
    page,
  }) => {
    await page.goto("/landing");
    await expect(page.locator(".fruit-intro")).toBeHidden({ timeout: 12_000 });
    // The footer links to /recipes; bring it into view so it is prefetched.
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight)
    );
    await page.waitForTimeout(1500);
    await page
      .getByRole("link", { name: /^sign in$/i })
      .last()
      .click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/email/i).fill("bob@example.com");
    await page.getByLabel(/^password$/i).fill("bob2024");
    await page.getByRole("button", { name: /^sign in/i }).click();

    // The fruit transition takes about three seconds before the app opens.
    await page.waitForURL("**/recipes", { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: /the catalog/i })
    ).toBeVisible();
  });
});
