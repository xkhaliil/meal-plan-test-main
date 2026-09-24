import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();

async function timeIntro(label, action) {
  const t0 = Date.now();
  await action();
  const visible = await page
    .locator(".landing-intro")
    .isVisible()
    .catch(() => false);
  if (!visible) {
    console.log(`${label}: intro did NOT play`);
    return;
  }
  await page.waitForSelector(".landing-intro", {
    state: "hidden",
    timeout: 20000,
  });
  console.log(
    `${label}: played, gone after ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
}

await timeIntro("first load ", () =>
  page.goto("http://localhost:3000/landing")
);
await timeIntro("reload    ", () => page.reload());
await timeIntro("2nd reload", () => page.reload());

// Client-side navigation away and back should NOT replay it.
await page
  .getByRole("link", { name: /get started|start planning free/i })
  .first()
  .click();
await page.waitForURL("**/register");
await page.goBack();
await page.waitForTimeout(400);
console.log(
  "after client-side back:",
  (await page.locator(".landing-intro").isVisible())
    ? "REPLAYED (bad)"
    : "skipped (good)"
);

await browser.close();
