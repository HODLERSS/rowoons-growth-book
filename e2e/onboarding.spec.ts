import { test, expect } from "@playwright/test";
import { pinClock, gotoReady } from "./helpers";

test.describe("first run", () => {
  test("asks for a profile, validates, saves, and persists across reload", async ({ page }) => {
    await pinClock(page);
    await gotoReady(page, "/");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Welcome to Sprout" })).toBeVisible();

    // Empty submit → inline errors, focus on first error.
    await dialog.getByRole("button", { name: "Get started" }).click();
    await expect(dialog.getByText("Please enter a name.")).toBeVisible();
    await expect(page.locator("#profile-name")).toBeFocused();

    // Future date → error.
    await page.locator("#profile-name").fill("Rowoon");
    await page.locator("#profile-birthday").fill("2030-01-01");
    await dialog.getByRole("button", { name: "Get started" }).click();
    await expect(dialog.getByText("The birthday can’t be in the future.")).toBeVisible();

    await page.locator("#profile-birthday").fill("2025-04-17");
    await dialog.getByRole("button", { name: "Get started" }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole("button", { name: "Edit profile" })).toContainText("Rowoon");
    await expect(page.getByRole("button", { name: "Edit profile" })).toContainText("16 months 14 days");
    await expect(page.getByText("Month 16", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "Edit profile" })).toContainText("Rowoon");
  });

  test("switching language in onboarding changes the UI immediately", async ({ page }) => {
    await gotoReady(page, "/");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "한국어" }).click();
    await expect(dialog.getByRole("heading", { name: "새싹에 오신 걸 환영해요" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await dialog.getByRole("radio", { name: "English" }).click();
    await expect(dialog.getByRole("heading", { name: "Welcome to Sprout" })).toBeVisible();
  });

  test("dismissing onboarding leaves a setup card that reopens it", async ({ page }) => {
    await gotoReady(page, "/");
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: /Set up your baby’s profile/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("small iPhone (SE-class, 375×667)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("a form taller than the screen scrolls inside the dialog so every field and the submit button stay reachable", async ({ page }) => {
    await pinClock(page);
    await gotoReady(page, "/");
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Baby’s name").fill("Rowoon");
    await dialog.getByLabel("Korean name (optional)").fill("로운");
    await dialog.getByLabel("Birthday").fill("2025-04-17");
    await dialog.getByRole("button", { name: /Born 3\+ weeks early/ }).click();
    await dialog.getByLabel("Due date").fill("2025-05-01");
    const submit = dialog.getByRole("button", { name: "Get started" });
    await submit.scrollIntoViewIfNeeded();
    const box = await submit.boundingBox();
    expect(box, "submit button has a box").not.toBeNull();
    expect(box!.y + box!.height, "submit button is inside the viewport after scrolling").toBeLessThanOrEqual(667);
    expect(box!.y, "submit button is inside the viewport after scrolling").toBeGreaterThanOrEqual(0);
    // The top of the form is reachable too (not clipped above the screen).
    const heading = dialog.getByRole("heading", { name: "Welcome to Sprout" });
    await heading.scrollIntoViewIfNeeded();
    const hb = await heading.boundingBox();
    expect(hb!.y).toBeGreaterThanOrEqual(0);
    await submit.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Edit profile" })).toContainText("Rowoon");
  });
});
