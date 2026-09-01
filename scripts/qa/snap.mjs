// Screenshot the running app (default http://localhost:3000) at iPhone size in light and dark.
// Usage: node scripts/qa/snap.mjs <outDir> [baseUrl]
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "fs";

const out = process.argv[2] || "shots";
const base = process.argv[3] || "http://localhost:3000";
mkdirSync(out, { recursive: true });

const profile = { name: "Rowoon", nameKo: "로운", birthDate: "2025-04-17" };
const routes = [
  ["home", "/"],
  ["milestones", "/milestones/16/"],
  ["play", "/play-tips/16/"],
  ["safety", "/watch-outs/16/"],
  ["journal", "/memo/"],
  ["settings", "/settings/"],
];

const browser = await chromium.launch();
for (const lang of ["en", "ko"]) {
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ ...devices["iPhone 15"], colorScheme: scheme, locale: lang === "ko" ? "ko-KR" : "en-US" });
    await ctx.addInitScript(
      ([p, l]) => {
        localStorage.setItem("dodam:profile", JSON.stringify(p));
        localStorage.setItem("dodam:language", JSON.stringify(l));
        localStorage.setItem("dodam:milestones", JSON.stringify({ "m-16-social-1": { completed: true, completedAt: "2026-08-20T10:00:00Z" } }));
        localStorage.setItem("dodam:memos", JSON.stringify([{ id: "a1", title: "First steps", content: "Three steps toward the sofa, then a sit.", createdAt: "2026-08-29T10:00:00Z", updatedAt: "2026-08-29T10:00:00Z" }]));
      },
      [profile, lang]
    );
    const page = await ctx.newPage();
    for (const [name, path] of routes) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/${name}-${lang}-${scheme}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
// Fresh install (onboarding) light EN
const ctx = await browser.newContext({ ...devices["iPhone 15"] });
const page = await ctx.newPage();
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/onboarding-en-light.png`, fullPage: true });
await ctx.close();
await browser.close();
console.log("done →", out);
