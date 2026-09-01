import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady, setLanguage, ROUTES } from "./helpers";

/** UX/UI metric checks (docs/UX_METRICS.md): U5 minimalism, U6 feedback, U7 dialogs, U9 bilingual layout parity, U10 helpfulness. */
test.describe("ux metrics", () => {
  test.beforeEach(async ({ context, page }) => {
    await seed(context, { memos: [{ id: "m1", title: "Hello", content: "world", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }] });
    await pinClock(page);
  });

  test("U5: Home shows at most 10 interactive elements above the fold, 14 in total, and one filled primary action", async ({ page, viewport }) => {
    await gotoReady(page, "/");
    await page.getByRole("region", { name: "This month" }).waitFor();
    const count = await page.evaluate((h) => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, [role="button"], input, summary'));
      return els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top < h && !el.closest("nav") && !el.closest("aside") && !el.classList.contains("skip-link");
      }).length;
    }, viewport!.height);
    expect(count).toBeLessThanOrEqual(10);
    const total = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('main a[href], main button, main [role="button"], main input, main summary')).filter((el) => el.getBoundingClientRect().width > 0).length);
    expect(total).toBeLessThanOrEqual(14);
    const primary = await page.locator("main .bg-primary").filter({ has: page.locator(":scope") }).count();
    expect(primary).toBeLessThanOrEqual(2); // the month pill and at most one filled action
  });

  for (const lang of ["en", "ko"] as const) {
    test(`U9: no clipped or overflowing text on any route (${lang})`, async ({ page }) => {
      await gotoReady(page, "/");
      if (lang === "ko") await setLanguage(page, "ko");
      for (const route of ROUTES) {
        await gotoReady(page, route);
        const problems = await page.evaluate(() => {
          const out: string[] = [];
          if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`page overflows horizontally: ${document.documentElement.scrollWidth} > ${window.innerWidth}`);
          const els = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, p, span, a, button, li, time, label"));
          for (const el of els) {
            const cs = getComputedStyle(el);
            if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue; // intentional scrollers (month chips)
            if (el.closest(".scrollbar-hide")) continue;
            if (cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none") continue; // designed truncation
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== "hidden") out.push(`${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 40)}" ${el.scrollWidth}>${el.clientWidth}`);
          }
          return out;
        });
        expect(problems, route).toEqual([]);
      }
    });
  }

  test("U10: Home answers 'what now' — progress, next milestones, this month's note, journal entry point", async ({ page }) => {
    await gotoReady(page, "/");
    const month = page.getByRole("region", { name: "This month" });
    await expect(month.getByRole("progressbar")).toBeVisible();
    await expect(month.getByRole("button", { name: /^Confirm: / }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: /A note for month/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Journal" }).getByRole("link", { name: "Write" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit profile" })).toContainText("Month 16");
  });

  test("U6/U7: confirming gives dated feedback; dialogs close on Escape and return focus", async ({ page }) => {
    await gotoReady(page, "/milestones/16/");
    const first = page.getByRole("button", { name: /^Confirm: / }).first();
    await first.click();
    await expect(page.getByRole("button", { name: /^Undo: / }).first()).toContainText("Confirmed Aug 31");
    const src = page.getByRole("button", { name: /^Source: / }).first();
    await src.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(src).toBeFocused();
  });

  test("U1: Dynamic Type — the layout survives a 130% root font size without overflow", async ({ page }) => {
    await gotoReady(page, "/");
    await page.addStyleTag({ content: "html { font-size: 20.8px !important; }" });
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    const small = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("a[href], button"));
      return els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
      }).length;
    });
    expect(small).toBe(0);
  });
});
