import { test, expect } from "@playwright/test";

test.describe("landing page", () => {
  test("states what the product is and how to start", async ({ page }) => {
    await page.goto("/landing");

    await expect(page.getByText(/decide what.*dinner/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /get started|start planning/i }).first()
    ).toBeVisible();
  });

  test("shows both plans", async ({ page }) => {
    await page.goto("/landing");

    const plans = page.locator("section", { hasText: "Plans" }).first();
    await expect(plans.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(plans.getByRole("heading", { name: "Pro" })).toBeVisible();
  });

  test("the primary call to action leads to registration", async ({ page }) => {
    await page.goto("/landing");

    await page
      .getByRole("link", { name: /get started|start planning free/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/register/);
  });
});
