import { test, expect } from "@playwright/test";

/**
 * The landing intro: a counter and a pile of falling fruit under a dark
 * wipe. It holds the page still while it plays, so the behaviours worth
 * pinning down are that it always finishes, always lets go, and stays out of
 * the way when it shouldn't play at all.
 */
const INTRO = ".fruit-intro";
// Counter (~1.7s), pile, wipe up and off: about 3.7s, plus loading the physics.
const PLAYS_WITHIN = { timeout: 12_000 };

test.describe("landing intro", () => {
  test("covers the page, then clears and leaves the hero", async ({ page }) => {
    await page.goto("/landing");

    await expect(page.locator(INTRO)).toBeVisible();
    await expect(page.locator(INTRO)).toBeHidden(PLAYS_WITHIN);

    // The hero's carousel is up once the curtain has gone.
    await expect(page.locator("[data-plate]").first()).toBeVisible();
    // And the page is scrollable again.
    const overflow = await page.evaluate(
      () => document.documentElement.style.overflow
    );
    expect(overflow).toBe("");
  });

  test("does not block interaction once it has gone", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator(INTRO)).toBeHidden(PLAYS_WITHIN);

    // The hero header's call to action, the first on the page.
    await page
      .getByRole("link", { name: /start planning free/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("plays again on a fresh page load", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator(INTRO)).toBeHidden(PLAYS_WITHIN);

    await page.reload();
    await expect(page.locator(INTRO)).toBeVisible();
    await expect(page.locator(INTRO)).toBeHidden(PLAYS_WITHIN);
  });

  test("does not replay on client-side navigation back", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator(INTRO)).toBeHidden(PLAYS_WITHIN);

    await page
      .getByRole("link", { name: /^sign in$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page).toHaveURL(/\/landing/);

    await expect(page.locator(INTRO)).toBeHidden();
    await expect(page.locator("[data-plate]").first()).toBeVisible();
  });

  test("is skipped entirely when reduced motion is requested", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/landing");

    await expect(page.locator(INTRO)).toBeHidden();
    await expect(page.locator("[data-plate]").first()).toBeVisible();
    await context.close();
  });
});
