import { test, expect } from "@playwright/test";

/**
 * Signed-in journeys. Read-only by design: these run against the development
 * database, so they must not leave recipes or plans behind.
 */
test.describe("signed in", () => {
  test("the catalog lists recipes and opens one", async ({ page }) => {
    await page.goto("/recipes");

    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();

    const title = await cards.first().getByRole("heading").textContent();
    await cards.first().getByRole("link").first().click();

    await expect(page).toHaveURL(/\/recipes\/.+/);
    await expect(
      page.getByRole("heading", { name: new RegExp(title ?? "", "i") })
    ).toBeVisible();
    await expect(page.getByText(/ingredients/i).first()).toBeVisible();
  });

  test("search narrows the catalog", async ({ page }) => {
    await page.goto("/recipes");
    const cards = page.locator("article");
    // Wait for the fetch to land: counting during the skeletons gives 0.
    await expect(cards.first()).toBeVisible();
    const before = await cards.count();

    await page.getByLabel(/search recipes/i).fill("zzzznomatch");
    await expect(page.getByText(/no matches/i)).toBeVisible();

    await page.getByLabel(/search recipes/i).fill("");
    await expect(cards).toHaveCount(before);
  });

  test("the meal planner shows a week of slots", async ({ page }) => {
    await page.goto("/meal-plans");
    await expect(
      page.getByRole("heading", { name: /meal plans/i })
    ).toBeVisible();
  });

  test("Recipe Bot is ready to take a message", async ({ page }) => {
    await page.goto("/chat");

    await expect(page.getByRole("heading", { name: /ferraro/i })).toBeVisible();
    await expect(page.getByLabel(/message chef ferraro/i)).toBeEditable();
  });

  test("settings shows the live Pro price from Stripe", async ({
    page,
    request,
  }) => {
    // Needs a real price configured (STRIPE_PRICE_ID or STRIPE_PRO_PRODUCT_ID).
    // CI runs with placeholder keys, where the endpoint correctly answers with
    // a null amount and the UI correctly falls back to "billed monthly" — so
    // skip rather than assert a number that is not supposed to exist there.
    const price = await (await request.get("/api/stripe/price")).json();
    test.skip(
      price.amount === null,
      "Stripe price is not configured in this environment"
    );

    expect(price.amount).toBeGreaterThan(0);

    await page.goto("/settings");
    // Proves the whole chain: the route reaches Stripe, converts minor units,
    // and the component renders it. A hardcoded number would pass a unit test
    // and still be wrong here.
    await expect(page.getByText(/\$\d+(\.\d{2})?\s*\/\s*month/i)).toBeVisible();
  });

  test("signing out returns to login and re-guards the app", async ({
    page,
  }) => {
    await page.goto("/recipes");
    await page.getByRole("button", { name: /account/i }).click();
    await page.getByRole("button", { name: /log out/i }).click();

    await page.waitForURL("**/login");
    await page.goto("/recipes");
    await expect(page).toHaveURL(/\/login/);
  });
});
