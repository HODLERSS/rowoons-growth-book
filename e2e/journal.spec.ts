import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady } from "./helpers";

test.describe("journal", () => {
  test.beforeEach(async ({ context, page }) => {
    await seed(context);
    await pinClock(page);
  });

  test("create → view → edit → delete", async ({ page }) => {
    await gotoReady(page, "/memo/");
    await expect(page.getByText("The book is open.")).toBeVisible();
    await page.getByRole("link", { name: "New entry" }).click();
    await expect(page).toHaveURL(/\/memo\/new\/$/);
    const save = page.getByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();
    await page.locator("#memo-title").fill("First smile");
    await page.locator("#memo-content").fill("Day 41. **Real** smile, not gas.");
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.locator(".prose-dodam strong")).toHaveText("Real");
    await save.click();
    await expect(page).toHaveURL(/\/memo\/view\/\?id=/);
    await expect(page.getByRole("heading", { name: "First smile" })).toBeVisible();

    await page.clock.setFixedTime(new Date("2026-08-31T11:30:00")); // later, so the entry counts as edited
    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("#memo-title").fill("First smile!");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "First smile!" })).toBeVisible();
    await expect(page.getByText(/Edited/)).toBeVisible();

    await gotoReady(page, "/memo/");
    await expect(page.getByText("1 entry")).toBeVisible();
    await page.getByRole("link", { name: /First smile!/ }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("“First smile!” will be removed.");
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/memo\/$/);
    await expect(page.getByText("The book is open.")).toBeVisible();
  });

  test("cancelling with unsaved text asks first", async ({ page }) => {
    await gotoReady(page, "/memo/new/");
    await page.locator("#memo-content").fill("draft");
    await page.getByRole("link", { name: "Cancel" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Discard changes?");
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.locator("#memo-content")).toHaveValue("draft");
    await page.getByRole("link", { name: "Cancel" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
    await expect(page).toHaveURL(/\/memo\/$/);
  });

  test("a missing entry shows a way back", async ({ page }) => {
    await gotoReady(page, "/memo/view/?id=nope");
    await expect(page.getByText("This entry doesn’t exist anymore.")).toBeVisible();
    await page.getByRole("link", { name: "Journal" }).last().click();
    await expect(page).toHaveURL(/\/memo\/$/);
  });
});
