import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady, setLanguage, CURRENT_MONTH } from "./helpers";

test.describe("milestones", () => {
  test.beforeEach(async ({ context, page }) => {
    await seed(context);
    await pinClock(page);
  });

  test("stamps, shows the date, updates progress, persists, and undoes", async ({ page }) => {
    await gotoReady(page, `/milestones/${CURRENT_MONTH}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Milestones");
    const progress = page.getByRole("progressbar").first();
    await expect(progress).toHaveAttribute("aria-valuenow", "0");

    const first = page.getByRole("button", { name: /^Confirm: / }).first();
    const title = (await first.getAttribute("aria-label"))!.replace("Confirm: ", "");
    await first.click();
    const done = page.getByRole("button", { name: `Undo: ${title}` });
    await expect(done).toHaveAttribute("aria-pressed", "true");
    await expect(done).toContainText("Confirmed Aug 31");
    await expect(progress).not.toHaveAttribute("aria-valuenow", "0");

    await page.reload();
    await expect(page.getByRole("button", { name: `Undo: ${title}` })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: `Undo: ${title}` }).click();
    await expect(page.getByRole("button", { name: `Confirm: ${title}` })).toHaveAttribute("aria-pressed", "false");
    await expect(progress).toHaveAttribute("aria-valuenow", "0");
  });

  test("home shows this month's count and stamping there is reflected on the month page", async ({ page }) => {
    await gotoReady(page, "/");
    const card = page.getByRole("region", { name: "This month" });
    await expect(card).toContainText("0 of");
    await card.getByRole("button", { name: /^Confirm: / }).first().click();
    await expect(card).toContainText("1 of");
    await card.getByRole("link", { name: /See all/ }).click();
    await expect(page).toHaveURL(new RegExp(`/milestones/${CURRENT_MONTH}/$`));
    await expect(page.getByRole("button", { name: /^Undo: / })).toHaveCount(1);
  });

  test("month chips navigate and mark the current month", async ({ page }) => {
    await gotoReady(page, `/milestones/${CURRENT_MONTH}/`);
    const current = page.getByRole("link", { name: `Month ${CURRENT_MONTH}, current` });
    await expect(current).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "Month 3", exact: true }).click();
    await expect(page).toHaveURL(/\/milestones\/3\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Milestones");
    await expect(page.getByText("Month 3 ·")).toBeVisible();
    await expect(page.getByRole("link", { name: `Month ${CURRENT_MONTH}, current` })).not.toHaveAttribute("aria-current", "page");
  });

  test("bare /milestones redirects to the current month; unknown months 404", async ({ page }) => {
    await gotoReady(page, "/milestones/");
    await expect(page).toHaveURL(new RegExp(`/milestones/${CURRENT_MONTH}/$`));
    const res = await gotoReady(page, "/milestones/99/");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "There’s nothing here." })).toBeVisible();
  });

  test("source dialog opens with a labelled summary (never a quotation), the audit date and a link", async ({ page }) => {
    await gotoReady(page, `/milestones/${CURRENT_MONTH}/`);
    await page.getByRole("button", { name: /^Source: / }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("In short, the source says")).toBeVisible();
    await expect(dialog.locator("blockquote")).toHaveCount(0);
    await expect(dialog.getByText(/^“/)).toHaveCount(0);
    await expect(dialog.getByText(/Sources checked /)).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Open the source" })).toHaveAttribute("target", "_blank");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("Korean: content, particles and dates are localized", async ({ page }) => {
    await gotoReady(page, `/milestones/${CURRENT_MONTH}/`);
    await setLanguage(page, "ko");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("발달 이정표");
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    const first = page.getByRole("button", { name: /^확인하기: / }).first();
    await first.click();
    await expect(page.getByRole("button", { name: /^확인 취소: / }).first()).toContainText("8월 31일 확인");
  });
});
