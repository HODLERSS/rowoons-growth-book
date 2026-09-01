import type { Page, BrowserContext } from "@playwright/test";

export const PROFILE = { name: "Rowoon", nameKo: "로운", birthDate: "2025-04-17" };
export const TODAY = "2026-08-31";
/** Month for PROFILE on TODAY (16 months 14 days). */
export const CURRENT_MONTH = 16;

export const ROUTES = ["/", `/milestones/${CURRENT_MONTH}/`, `/play-tips/${CURRENT_MONTH}/`, `/watch-outs/${CURRENT_MONTH}/`, "/memo/", "/memo/new/", "/settings/", "/privacy/", "/terms/"];

/** Seed a profile (and optionally language) before any page script runs, and pin the clock. */
export async function seed(ctx: BrowserContext, opts: { lang?: "en" | "ko"; profile?: typeof PROFILE | null; milestones?: Record<string, unknown>; memos?: unknown[] } = {}) {
  const { lang = "en", profile = PROFILE, milestones = {}, memos = [] } = opts;
  await ctx.addInitScript(
    ([p, l, ms, mm]) => {
      if (localStorage.getItem("e2e:seeded")) return; // seed once per context, not on every navigation
      localStorage.setItem("e2e:seeded", "1");
      if (p) localStorage.setItem("dodam:profile", JSON.stringify(p));
      localStorage.setItem("dodam:language", JSON.stringify(l));
      localStorage.setItem("dodam:milestones", JSON.stringify(ms));
      localStorage.setItem("dodam:memos", JSON.stringify(mm));
    },
    [profile, lang, milestones, memos] as const
  );
}

/** Navigate and wait until React has hydrated (clicks before that are lost, as on any SSR app). */
export async function gotoReady(page: Page, url: string) {
  const res = await page.goto(url);
  await page.waitForSelector("html[data-hydrated]", { state: "attached" });
  return res;
}

/** Switch the stored language on an already-open page and reload. */
export async function setLanguage(page: Page, lang: "en" | "ko") {
  await page.evaluate((l) => localStorage.setItem("dodam:language", JSON.stringify(l)), lang);
  await page.reload();
  await page.waitForSelector("html[data-hydrated]", { state: "attached" });
}

export async function pinClock(page: Page, iso = `${TODAY}T10:00:00`) {
  await page.clock.setFixedTime(new Date(iso));
}

/** Collect console errors/warnings and page errors for the life of the page. */
export function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));
  return problems;
}
