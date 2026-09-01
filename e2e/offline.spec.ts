import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady } from "./helpers";

test.describe("offline", () => {
  test("the app shell and a month page load without a network", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "service-worker offline test runs on Chromium");
    await seed(context);
    await pinClock(page);
    await gotoReady(page, "/");
    // Wait for the service worker to activate (bounded), then warm the cache with the pages we will need offline.
    await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error("service worker not ready")), 15000))]));
    await gotoReady(page, "/milestones/16/");
    await gotoReady(page, "/memo/");
    // The SW caches pages after responding; wait until the month page is in the cache.
    await page.waitForFunction(
      async () => {
        const cache = await caches.open("dodam-v1");
        const keys = await cache.keys();
        return keys.some((r) => new URL(r.url).pathname === "/milestones/16/");
      },
      undefined,
      { timeout: 15000 }
    );

    await context.setOffline(true);
    await gotoReady(page, "/milestones/16/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Milestones");
    await page.getByRole("button", { name: /^Confirm: / }).first().click();
    await expect(page.getByRole("button", { name: /^Undo: / }).first()).toBeVisible();
    await context.setOffline(false);
  });
});
