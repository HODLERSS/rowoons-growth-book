import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady, setLanguage, CURRENT_MONTH } from "./helpers";
import watchOutsEn from "../src/content/watch-outs.json";
import milestonesEn from "../src/content/milestones.json";

const NEXT = CURRENT_MONTH + 1;
const SEVERITY = { urgent: 0, caution: 1, info: 2 } as const;
const nextWatchOuts = watchOutsEn.filter((w) => w.month === NEXT).sort((a, b) => SEVERITY[a.severity as keyof typeof SEVERITY] - SEVERITY[b.severity as keyof typeof SEVERITY]);
const nextMilestones = milestonesEn.filter((m) => m.month === NEXT);

test.describe("coming up card", () => {
  test.beforeEach(async ({ context, page }) => {
    await seed(context);
    await pinClock(page);
  });

  test("Home previews next month's top watch-out with its action and the next milestones", async ({ page }) => {
    await gotoReady(page, "/");
    const card = page.getByRole("region", { name: "Coming up" });
    await expect(card).toBeVisible();
    await expect(card.getByText(`Month ${NEXT}`, { exact: true })).toBeVisible();
    await expect(card.getByText(nextWatchOuts[0].title)).toBeVisible();
    await expect(card.getByText(nextWatchOuts[0].action!)).toBeVisible();
    for (const m of nextMilestones.slice(0, 2)) await expect(card.getByText(m.title)).toBeVisible();
    await expect(card.getByRole("link", { name: `See month ${NEXT}` })).toHaveAttribute("href", `/milestones/${NEXT}/`);
  });

  test("'Got it' acknowledges the watch-out, moves to the next one, and survives a reload", async ({ page }) => {
    await gotoReady(page, "/");
    const card = page.getByRole("region", { name: "Coming up" });
    await card.getByRole("button", { name: "Got it" }).click();
    await expect(card.getByText(nextWatchOuts[0].title)).toHaveCount(0);
    await expect(card.getByText(nextWatchOuts[1].title)).toBeVisible();
    await page.reload();
    await page.waitForSelector("html[data-hydrated]", { state: "attached" });
    const again = page.getByRole("region", { name: "Coming up" });
    await expect(again.getByText(nextWatchOuts[0].title)).toHaveCount(0);
    await expect(again.getByText(nextWatchOuts[1].title)).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sprout:acks") ?? "[]"))).toEqual([nextWatchOuts[0].id]);
  });

  test("still shows the milestones preview when every watch-out is acknowledged", async ({ page }) => {
    await gotoReady(page, "/");
    await page.evaluate((ids) => localStorage.setItem("sprout:acks", JSON.stringify(ids)), nextWatchOuts.map((w) => w.id));
    await page.reload();
    await page.waitForSelector("html[data-hydrated]", { state: "attached" });
    const card = page.getByRole("region", { name: "Coming up" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "Got it" })).toHaveCount(0);
    await expect(card.getByText(nextMilestones[0].title)).toBeVisible();
  });

  test("reads naturally in Korean", async ({ page }) => {
    await gotoReady(page, "/");
    await setLanguage(page, "ko");
    const card = page.getByRole("region", { name: "다음 달 미리보기" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "확인했어요" })).toBeVisible();
    await expect(card.getByRole("link", { name: `${NEXT}개월 보기` })).toBeVisible();
  });
});

test("no coming-up card in the last month the book covers", async ({ context, page }) => {
  await seed(context, { profile: { name: "Big", nameKo: "큰이", birthDate: "2023-04-17" } }); // 40 months → clamped to 36
  await pinClock(page);
  await gotoReady(page, "/");
  await page.getByRole("region", { name: "This month" }).waitFor();
  await expect(page.getByRole("region", { name: "Coming up" })).toHaveCount(0);
});

test.describe("corrected age for preterm babies", () => {
  test("an optional due date switches content to corrected age until 24 months", async ({ context, page }) => {
    await seed(context, { profile: null });
    await pinClock(page);
    await gotoReady(page, "/");
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Baby’s name").fill("Early");
    await dialog.getByLabel("Birthday").fill("2026-01-01");
    await expect(dialog.getByLabel("Due date")).toHaveCount(0); // collapsed by default so the form fits an iPhone screen
    await dialog.getByRole("button", { name: /Born 3\+ weeks early/ }).click();
    await dialog.getByLabel("Due date").fill("2026-03-01"); // born 59 days early
    await dialog.getByRole("button", { name: "Get started" }).click();
    await expect(dialog).toBeHidden();
    // TODAY is 2026-08-31: 7 months 30 days since birth, 5 months 30 days since the due date.
    await expect(page.getByText("7 months 30 days")).toBeVisible();
    await expect(page.getByText("Corrected age 5 months 30 days")).toBeVisible();
    await expect(page.getByText("Month 5", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "This month" })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sprout:profile")!).dueDate)).toBe("2026-03-01");
  });

  test("a due date less than three weeks after the birthday changes nothing", async ({ context, page }) => {
    await seed(context, { profile: { name: "Term", nameKo: "만삭", birthDate: "2026-01-01", dueDate: "2026-01-15" } as never });
    await pinClock(page);
    await gotoReady(page, "/");
    await expect(page.getByText("7 months 30 days")).toBeVisible();
    await expect(page.getByText(/Corrected age/)).toHaveCount(0);
    await expect(page.getByText("Month 7", { exact: true })).toBeVisible();
  });

  test("the due date is kept when editing the profile", async ({ context, page }) => {
    await seed(context, { profile: { name: "Early", nameKo: "이른", birthDate: "2026-01-01", dueDate: "2026-03-01" } as never });
    await pinClock(page);
    await gotoReady(page, "/");
    await page.getByRole("button", { name: "Edit profile" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Due date")).toHaveValue("2026-03-01"); // expanded because a due date is stored
    await dialog.getByLabel("Due date").fill("");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/Corrected age/)).toHaveCount(0);
    await expect(page.getByText("Month 7", { exact: true })).toBeVisible();
  });
});
