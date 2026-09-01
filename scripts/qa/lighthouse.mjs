// Lighthouse (mobile) for the core routes against a running server. Prints a JSON summary on the last line.
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const routes = ["/", "/milestones/16/", "/play-tips/16/", "/watch-outs/16/", "/memo/", "/settings/"];

function playwrightChromium() {
  const dir = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(dir)) return undefined;
  const c = readdirSync(dir).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  if (!c) return undefined;
  const p = path.join(dir, c, "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium");
  const p2 = path.join(dir, c, "chrome-mac/Chromium.app/Contents/MacOS/Chromium");
  return existsSync(p) ? p : existsSync(p2) ? p2 : undefined;
}

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"], chromePath: process.env.CHROME_PATH ?? playwrightChromium() });
const out = {};
try {
  for (const r of routes) {
    const res = await lighthouse(base + r, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility", "best-practices"], formFactor: "mobile", screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 3, disabled: false } });
    const lhr = res.lhr;
    out[r] = {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories["best-practices"].score * 100),
      cls: Number(lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3)),
      lcp: Math.round(lhr.audits["largest-contentful-paint"].numericValue),
      tbt: Math.round(lhr.audits["total-blocking-time"].numericValue),
    };
    console.error(r, out[r]);
  }
} finally {
  await chrome.kill();
}
console.log(JSON.stringify(out));
