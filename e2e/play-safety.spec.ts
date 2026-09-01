import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady, CURRENT_MONTH } from "./helpers";

test.describe("play and safety", () => {
  test.beforeEach(async ({ context, page }) => {
    await seed(context);
    await pinClock(page);
  });

  test("play ideas render with difficulty, category and materials", async ({ page }) => {
    await gotoReady(page, `/play-tips/${CURRENT_MONTH}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Play");
    const cards = page.getByRole("article");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText(/Easy|Medium|Advanced/).first()).toBeVisible();
  });

  test("safety notes are ordered urgent → caution → info and carry actions", async ({ page }) => {
    await gotoReady(page, "/watch-outs/1/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Safety");
    const tags = await page.locator("article span:has(svg)").filter({ hasText: /Urgent|Caution|Good to know/ }).allTextContents();
    const order = tags.map((t) => ["Urgent", "Caution", "Good to know"].findIndex((x) => t.includes(x)));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    await expect(page.getByText("What to do").first()).toBeVisible();
  });

  test("parent note expands with two voices", async ({ page }) => {
    await gotoReady(page, `/watch-outs/${CURRENT_MONTH}/`);
    const note = page.locator("details").first();
    await note.locator("summary").click();
    await expect(note).toHaveAttribute("open", "");
    await expect(note.getByRole("heading", { name: "Keep an eye on" })).toBeVisible();
    await expect(note.getByRole("heading", { name: "For you" })).toBeVisible();
  });
});
