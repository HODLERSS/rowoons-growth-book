import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seed, pinClock, gotoReady, ROUTES, watchConsole } from "./helpers";

test.describe("quality gates", () => {
  test.beforeEach(async ({ context, page }) => {
    await seed(context, { memos: [{ id: "m1", title: "Hello", content: "world", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }] });
    await pinClock(page);
  });

  for (const route of ROUTES) {
    test(`axe: no serious or critical violations on ${route}`, async ({ page }) => {
      await gotoReady(page, route);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });

    test(`console is clean on ${route}`, async ({ page }) => {
      const problems = watchConsole(page);
      await gotoReady(page, route);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
      expect(problems).toEqual([]);
    });

    test(`tap targets are at least 44×44 on ${route}`, async ({ page }) => {
      await gotoReady(page, route);
      await page.waitForLoadState("networkidle");
      const small = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, [role="button"], [role="radio"], input:not([type="hidden"]), textarea, summary'));
        const out: string[] = [];
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue; // hidden
          if (el.closest("[inert]")) continue;
          if (r.height < 44 || r.width < 44) out.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
        return out;
      });
      expect(small).toEqual([]);
    });
  }

  test("every core screen is at most two taps from Home", async ({ page }) => {
    await gotoReady(page, "/");
    for (const [name, pattern] of [
      ["Milestones", /\/milestones\/16\/$/],
      ["Play", /\/play-tips\/16\/$/],
      ["Safety", /\/watch-outs\/16\/$/],
      ["Journal", /\/memo\/$/],
    ] as const) {
      await page.getByRole("navigation").getByRole("link", { name, exact: true }).filter({ visible: true }).first().click();
      await expect(page).toHaveURL(pattern);
      await gotoReady(page, "/");
    }
    await page.getByRole("link", { name: "Settings" }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/settings\/$/);
    await gotoReady(page, "/");
    await page.getByRole("link", { name: "Write" }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/memo\/new\/$/);
  });

  test("safe areas and theme are declared", async ({ page }) => {
    await gotoReady(page, "/");
    await expect(page.locator("header").first()).toHaveClass(/pt-safe/);
    await expect(page.locator("nav.fixed")).toHaveClass(/pb-safe/);
    const themeColors = await page.locator('meta[name="theme-color"]').count();
    expect(themeColors).toBeGreaterThanOrEqual(2);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
    await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute("content", /user-scalable=no|maximum-scale=1/);
  });

  test("reduced motion disables the stamp animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoReady(page, "/milestones/16/");
    await page.getByRole("button", { name: /^Confirm: / }).first().click();
    const duration = await page.locator("svg.seal-stamp").first().evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(duration)).toBeLessThan(0.01);
  });
});
