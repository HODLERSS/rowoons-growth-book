import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady } from "./helpers";

test.describe("settings", () => {
  test.beforeEach(async ({ context, page }) => {
    await seed(context, { memos: [{ id: "m1", title: "Hello", content: "world", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }] });
    await pinClock(page);
  });

  test("language switch updates the whole UI and persists", async ({ page }) => {
    await gotoReady(page, "/settings/");
    await page.getByRole("radio", { name: "한국어" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("설정");
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("설정");
    await page.getByRole("radio", { name: "English" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");
  });

  test("export produces a valid backup and import restores it", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "download events are not exposed in WebKit headless");
    await gotoReady(page, "/settings/");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export a backup" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^sprout-backup-\d{8}\.json$/);
    const path = await download.path();
    const fs = await import("node:fs");
    const backup = JSON.parse(fs.readFileSync(path!, "utf8"));
    expect(backup.app).toBe("sprout");
    expect(backup.profile.name).toBe("Rowoon");
    expect(backup.memos).toHaveLength(1);

    // Wipe, then restore.
    await page.getByRole("button", { name: "Delete all data" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("All data deleted.")).toBeVisible();
    await gotoReady(page, "/memo/");
    await expect(page.getByText("Nothing here yet.")).toBeVisible();

    await gotoReady(page, "/settings/");
    await page.locator('input[type="file"]').setInputFiles(path!);
    await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Backup restored.")).toBeVisible();
    await gotoReady(page, "/memo/");
    await expect(page.getByRole("link", { name: /Hello/ })).toBeVisible();
  });

  test("a bad file is rejected without changing data", async ({ page }) => {
    await gotoReady(page, "/settings/");
    await page.locator('input[type="file"]').setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"nope":true}') });
    await expect(page.getByText("That file isn’t a Sprout backup.")).toBeVisible();
    await gotoReady(page, "/memo/");
    await expect(page.getByRole("link", { name: /Hello/ })).toBeVisible();
  });

  test("legal pages are reachable and localized", async ({ page }) => {
    await gotoReady(page, "/settings/");
    await page.getByRole("link", { name: "Privacy policy" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
    await expect(page.getByText("The short version")).toBeVisible();
    await page.getByRole("link", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/settings\/$/);
    await page.getByRole("radio", { name: "한국어" }).click();
    await page.getByRole("link", { name: "이용약관" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("이용약관");
  });
});
