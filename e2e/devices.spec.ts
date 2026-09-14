import { test, expect, devices, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { PROFILE, TODAY, CURRENT_MONTH } from "./helpers";

/**
 * Device matrix: the layout must hold on every iPhone class Apple still sells or supports, from the
 * 4.7" SE up to the 6.9" Pro Max, in both languages. Each device × route is scanned for horizontal
 * overflow, clipped text, sub-44px tap targets, a tab bar inside the viewport, and dialogs whose
 * primary action can be reached. A screenshot of every combination lands in qa/devices/ for eyeballing.
 */
const DEVICES = [
  { tag: "se", label: "iPhone SE (4.7in)", viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 },
  { tag: "mini", label: "iPhone 13 mini (5.4in)", viewport: { width: 375, height: 812 }, deviceScaleFactor: 3 },
  { tag: "15", label: "iPhone 15 (6.1in)", viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 },
  { tag: "16e", label: "iPhone 16e (6.1in)", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
  { tag: "promax", label: "iPhone 16 Pro Max (6.9in)", viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 },
  { tag: "ipadmini", label: "iPad mini (web)", viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 },
] as const;

const ROUTES = ["/", `/milestones/${CURRENT_MONTH}/`, `/play-tips/${CURRENT_MONTH}/`, `/watch-outs/${CURRENT_MONTH}/`, "/memo/", "/memo/new/", "/settings/", "/support/"];

const OUT = "qa/devices";

async function openDevice(browser: Browser, d: (typeof DEVICES)[number], lang: "en" | "ko", profile: typeof PROFILE | null = PROFILE) {
  const ctx = await browser.newContext({
    ...devices["iPhone 15"],
    viewport: d.viewport,
    deviceScaleFactor: d.deviceScaleFactor,
    isMobile: d.tag !== "ipadmini",
    hasTouch: true,
  });
  await ctx.addInitScript(
    ([p, l]) => {
      if (localStorage.getItem("e2e:seeded")) return;
      localStorage.setItem("e2e:seeded", "1");
      if (p) localStorage.setItem("sprout:profile", JSON.stringify(p));
      localStorage.setItem("sprout:language", JSON.stringify(l));
      localStorage.setItem("sprout:milestones", JSON.stringify({}));
      localStorage.setItem("sprout:memos", JSON.stringify([{ id: "m1", title: "Hello", content: "world", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }]));
    },
    [profile, lang] as const
  );
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00`));
  return { ctx, page };
}

async function ready(page: Page, url: string) {
  await page.goto(url);
  await page.waitForSelector("html[data-hydrated]", { state: "attached" });
  await page.waitForTimeout(150);
}

/** Layout problems on the current page: horizontal overflow, clipped text, small targets, chrome off-screen. */
async function scan(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const W = window.innerWidth, H = window.innerHeight;
    if (document.documentElement.scrollWidth > W + 1) out.push(`page overflows horizontally ${document.documentElement.scrollWidth} > ${W}`);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, p, span, a, button, li, time, label"))) {
      const cs = getComputedStyle(el);
      if (cs.overflowX === "auto" || cs.overflowX === "scroll" || el.closest(".scrollbar-hide")) continue;
      if (cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > W + 1 || r.left < -1) out.push(`off-screen ${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 30)}" left ${Math.round(r.left)} right ${Math.round(r.right)}`);
      if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== "hidden") out.push(`clipped ${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 30)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main a[href], main button, main [role="button"], main input, nav a, nav button, header a, header button'))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.height < 44 || r.width < 44) && !el.closest("[data-inline-link]")) out.push(`small target ${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const nav = document.querySelector("nav");
    if (nav) {
      const r = nav.getBoundingClientRect();
      if (r.bottom > H + 1 || r.top < 0) out.push(`tab bar outside the viewport (top ${Math.round(r.top)}, bottom ${Math.round(r.bottom)}, height ${H})`);
    }
    return out;
  });
}

test.describe("device matrix", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "one engine is enough for layout geometry; WebKit is covered by the iphone-webkit project");
  test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

  for (const d of DEVICES) {
    for (const lang of ["en", "ko"] as const) {
      test(`${d.label} ${lang}: every route lays out cleanly`, async ({ browser }) => {
        test.setTimeout(120_000);
        const { ctx, page } = await openDevice(browser, d, lang);
        const problems: string[] = [];
        for (const route of ROUTES) {
          await ready(page, route);
          for (const p of await scan(page)) problems.push(`${route} ${p}`);
          await page.screenshot({ path: `${OUT}/${d.tag}-${lang}${route.replace(/\//g, "_") || "_home"}.png`, fullPage: false });
        }
        await ctx.close();
        expect(problems).toEqual([]);
      });
    }

    test(`${d.label}: onboarding fits and completes`, async ({ browser }) => {
      const { ctx, page } = await openDevice(browser, d, "en", null);
      await ready(page, "/");
      const problems = await scan(page);
      await page.screenshot({ path: `${OUT}/${d.tag}-onboarding.png` });
      expect(problems).toEqual([]);
      await page.getByLabel(/name/i).first().fill("Rowoon");
      await page.getByLabel(/birth/i).first().fill("2025-04-17");
      const submit = page.getByRole("button", { name: /start|begin|open|save|continue/i }).last();
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
      await submit.click();
      await expect(page.getByRole("region", { name: "This month" })).toBeVisible();
      await ctx.close();
    });

    test(`${d.label}: dialogs keep their actions reachable`, async ({ browser }) => {
      const { ctx, page } = await openDevice(browser, d, "en");
      // source sheet on a milestone
      await ready(page, `/milestones/${CURRENT_MONTH}/`);
      await page.getByRole("button", { name: /^Source: / }).first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const close = dialog.getByRole("button", { name: /close|done|ok/i }).last();
      await close.scrollIntoViewIfNeeded();
      await expect(close).toBeInViewport();
      await page.screenshot({ path: `${OUT}/${d.tag}-dialog-source.png` });
      await page.keyboard.press("Escape");
      // profile editor from Home
      await ready(page, "/");
      await page.getByRole("button", { name: "Edit profile" }).click();
      await expect(dialog).toBeVisible();
      const save = dialog.getByRole("button", { name: /save/i }).last();
      await save.scrollIntoViewIfNeeded();
      await expect(save).toBeInViewport();
      await page.screenshot({ path: `${OUT}/${d.tag}-dialog-profile.png` });
      await page.keyboard.press("Escape");
      // sign-in sheet from Settings (accounts enabled in this build)
      await ready(page, "/settings/");
      const signIn = page.getByRole("button", { name: /sign in/i }).first();
      if (await signIn.count()) {
        await signIn.click();
        await expect(dialog).toBeVisible();
        const email = dialog.getByRole("button", { name: /email|link/i }).last();
        await email.scrollIntoViewIfNeeded();
        await expect(email).toBeInViewport();
        await page.screenshot({ path: `${OUT}/${d.tag}-dialog-signin.png` });
        expect(await scan(page)).toEqual([]);
      }
      await ctx.close();
    });
  }
});
