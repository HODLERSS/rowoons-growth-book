import { test, expect, type Page } from "@playwright/test";
import { seed, pinClock, gotoReady, fakeNative, setLanguage } from "./helpers";

/** The native app's soft ask for reminders (web keeps its own push card). */
const card = (page: Page) => page.getByRole("region", { name: /Get a note when/ });
const settings = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("sprout:settings") ?? "{}"));
const pending = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("e2e:pending") ?? "[]").length as number);

async function createProfile(page: Page) {
  await gotoReady(page, "/");
  const dialog = page.getByRole("dialog");
  await page.locator("#profile-name").fill("Rowoon");
  await page.locator("#profile-birthday").fill("2025-04-17");
  await dialog.getByRole("button", { name: "Get started" }).click();
  await expect(dialog).toBeHidden();
}

test.describe("native reminder ask", () => {
  test.beforeEach(async ({ page }) => {
    await pinClock(page);
  });

  test("new profile → card → Turn on → reminders on and notes scheduled", async ({ context, page }) => {
    await fakeNative(context, { answer: "granted" });
    await createProfile(page);
    await expect(card(page)).toBeVisible();
    await expect(card(page).getByRole("heading")).toHaveText("Get a note when Rowoon turns 17 months");
    // The account invite yields to the ask so Home keeps its element budget.
    await expect(page.getByRole("region", { name: "Keep a copy in the cloud" })).toHaveCount(0);
    await card(page).getByRole("button", { name: "Turn on reminders" }).click();
    await expect(card(page)).toBeHidden();
    expect(await settings(page)).toMatchObject({ reminders: true, remindersAsked: true });
    expect(await pending(page)).toBeGreaterThan(12);
    await gotoReady(page, "/settings/");
    await expect(page.getByRole("switch", { name: "Reminders" })).toHaveAttribute("aria-checked", "true");
  });

  test("iOS refuses → reminders stay off, the guidance shows once, then the card is gone", async ({ context, page }) => {
    await fakeNative(context, { answer: "denied" });
    await createProfile(page);
    await card(page).getByRole("button", { name: "Turn on reminders" }).click();
    const denied = page.getByRole("region", { name: "Reminders are off" });
    await expect(denied).toContainText("Settings › Notifications");
    expect(await settings(page)).toMatchObject({ reminders: false, remindersAsked: true });
    expect(await pending(page)).toBe(0);
    await denied.getByRole("button", { name: "OK" }).click();
    await expect(denied).toBeHidden();
    await page.reload();
    await page.getByRole("region", { name: "This month" }).waitFor();
    await expect(card(page)).toHaveCount(0);
    await expect(denied).toHaveCount(0);
  });

  test("Not now → hidden, and still hidden after reload", async ({ context, page }) => {
    await fakeNative(context, { answer: "granted" });
    await createProfile(page);
    await card(page).getByRole("button", { name: "Not now" }).click();
    await expect(card(page)).toBeHidden();
    await page.reload();
    await page.getByRole("region", { name: "This month" }).waitFor();
    await expect(card(page)).toHaveCount(0);
    expect(await settings(page)).toMatchObject({ reminders: false, remindersAsked: true });
    expect(await pending(page)).toBe(0);
  });

  test("existing native user with a baby and reminders off gets the card, in Korean too", async ({ context, page }) => {
    await seed(context);
    await fakeNative(context, { answer: "granted" });
    await gotoReady(page, "/");
    await expect(card(page)).toBeVisible();
    await setLanguage(page, "ko");
    await expect(page.getByRole("region", { name: "로운이 17개월 되는 날 알려 드릴까요?" })).toBeVisible();
  });

  test("no card when reminders are already on, or when iOS already refused", async ({ context, page }) => {
    await seed(context);
    await fakeNative(context, { answer: "denied", perm: "denied" });
    await gotoReady(page, "/");
    await page.getByRole("region", { name: "This month" }).waitFor();
    await page.waitForTimeout(300);
    await expect(card(page)).toHaveCount(0);
    await page.evaluate(() => {
      localStorage.setItem("e2e:perm", "granted");
      localStorage.setItem("sprout:settings", JSON.stringify({ reminders: true, notifyDismissed: false }));
    });
    await page.reload();
    await page.getByRole("region", { name: "This month" }).waitFor();
    await page.waitForTimeout(300);
    await expect(card(page)).toHaveCount(0);
  });

  test("never on the web", async ({ context, page }) => {
    await seed(context);
    await gotoReady(page, "/");
    await page.getByRole("region", { name: "This month" }).waitFor();
    await page.waitForTimeout(300);
    await expect(card(page)).toHaveCount(0);
  });

  test("Home stays within its element budget while the card shows", async ({ context, page, viewport }) => {
    await seed(context);
    await fakeNative(context, { answer: "granted" });
    await gotoReady(page, "/");
    await expect(card(page)).toBeVisible();
    const above = await page.evaluate((h) => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, [role="button"], input, summary'));
      return els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top < h && !el.closest("nav") && !el.closest("aside") && !el.classList.contains("skip-link");
      }).length;
    }, viewport!.height);
    expect(above).toBeLessThanOrEqual(10);
    const total = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('main a[href], main button, main [role="button"], main input, main summary')).filter((el) => el.getBoundingClientRect().width > 0).length);
    expect(total).toBeLessThanOrEqual(14);
    // One filled action on Home: the card's own button (the month pill and the progress fill are not actions).
    expect(await page.locator("main button.bg-primary, main a.bg-primary").count()).toBe(1);
  });
});
