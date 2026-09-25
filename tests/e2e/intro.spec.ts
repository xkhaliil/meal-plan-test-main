import { test, expect } from "@playwright/test";

/**
 * The opening curtain. It has three jobs: cover the page from the first paint,
 * get out of the way, and never hold anyone hostage — not a returning visitor,
 * not someone who asked for less motion.
 */
test.describe("landing intro", () => {
  test("covers the page, then lifts and leaves the hero visible", async ({
    page,
  }) => {
    await page.goto("/landing");

    const curtain = page.locator(".landing-intro");
    await expect(curtain).toBeVisible();
    await expect(
      page.getByText("Plan the week", { exact: true })
    ).toBeVisible();

    // It removes itself rather than lingering as an invisible click-blocker.
    await expect(curtain).toBeHidden({ timeout: 10_000 });

    await expect(
      page.getByRole("link", { name: /get started|start planning/i }).first()
    ).toBeVisible();
  });

  test("does not block interaction once it has gone", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator(".landing-intro")).toBeHidden({
      timeout: 10_000,
    });

    await page
      .getByRole("link", { name: /get started|start planning free/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("plays again on a fresh page load", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator(".landing-intro")).toBeHidden({
      timeout: 15_000,
    });

    // A reload is a new page load, so the curtain comes back — this is what
    // makes it visible at all during development and on a return visit.
    await page.reload();
    await expect(page.locator(".landing-intro")).toBeVisible();
    await expect(page.locator(".landing-intro")).toBeHidden({
      timeout: 15_000,
    });
  });

  test("does not replay on client-side navigation back to the page", async ({
    page,
  }) => {
    await page.goto("/landing");
    await expect(page.locator(".landing-intro")).toBeHidden({
      timeout: 15_000,
    });

    await page
      .getByRole("link", { name: /get started|start planning free/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/register/);

    // Soft navigation keeps the JS context, so the curtain stays down.
    await page.goBack();
    await expect(page).toHaveURL(/\/landing/);
    await expect(page.locator(".landing-intro")).toBeHidden();
  });

  test("is skipped entirely when reduced motion is requested", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto("/landing");
    await expect(page.locator(".landing-intro")).toBeHidden();
    await expect(
      page.getByRole("link", { name: /get started|start planning/i }).first()
    ).toBeVisible();

    await context.close();
  });
});
