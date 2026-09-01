import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady } from "./helpers";

test.describe("offline", () => {
  test("the app shell and a month page load without a network", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "service-worker offline test runs on Chromium");
    await seed(context);
    await pinClock(page);
    await gotoReady(page, "/");
    await page.waitForLoadState("networkidle");
    // Wait for the service worker to control the page, then warm the cache.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await gotoReady(page, "/milestones/16/");
    await page.waitForLoadState("networkidle");
    await gotoReady(page, "/memo/");
    await page.waitForLoadState("networkidle");

    await context.setOffline(true);
    await gotoReady(page, "/milestones/16/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Milestones");
    await page.getByRole("button", { name: /^Confirm: / }).first().click();
    await expect(page.getByRole("button", { name: /^Undo: / }).first()).toBeVisible();
    await context.setOffline(false);
  });
});
