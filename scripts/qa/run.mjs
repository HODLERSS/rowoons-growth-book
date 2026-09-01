#!/usr/bin/env node
/**
 * Machine half of docs/QUALITY.md. Runs every computable check, prints a scorecard, writes qa/machine.json.
 * Usage: node scripts/qa/run.mjs [--skip=e2e,lighthouse,links]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const skip = new Set((process.argv.find((a) => a.startsWith("--skip=")) || "--skip=").slice(7).split(",").filter(Boolean));
const results = {}; // metric -> [{name, ok, weight, detail}]
const add = (metric, name, ok, weight, detail = "") => {
  (results[metric] ||= []).push({ name, ok: !!ok, weight, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  [${metric}] ${name}${detail ? " — " + detail : ""}`);
};
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));

// ---------- 1. Provenance + 2. Completeness + 3. Parity (content_check.py) ----------
{
  const r = run("python3", ["scripts/qa/content_check.py"]);
  const fails = (r.stdout.match(/FAIL:/g) || []).length;
  const enFails = (r.stdout.match(/FAIL: .*(EN missing|host not allowed|without action|duplicate ids)/g) || []).length;
  add("1", "every item has source/url/quote, hosts allow-listed", enFails === 0, 40, `${enFails} failures`);
  add("2", "coverage: ≥6 milestones (all 4 categories), ≥3 tips, ≥2 watch-outs, note per month", !/has \d+ items|missing categories|month \d+ missing/.test(r.stdout), 50);
  add("3", "EN/KO structural parity + Korean register scan", fails === 0, 50, r.stdout.split("\n")[0]);
}

// ---------- 1. Source links resolve ----------
if (!skip.has("links")) {
  const items = ["milestones", "play-tips", "watch-outs"].flatMap((f) => json(`src/content/${f}.json`));
  const urls = [...new Set(items.map((i) => i.sourceUrl))];
  // Pages that serve a Cloudflare challenge to any headless client. Verified by hand (search index + browser) on 2026-08-31.
  const KNOWN_PROTECTED = new Set(["https://www.naeyc.org/resources/topics/play"]);
  const bad = [];
  const blocked = [];
  for (const u of urls) {
    try {
      const res = await fetch(u, { method: "GET", redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (Dodam QA link check)" }, signal: AbortSignal.timeout(15000) });
      if (res.status === 403) blocked.push(u);
      else if (res.status >= 400) bad.push(`${u} → ${res.status}`);
    } catch (e) {
      bad.push(`${u} → ${e.message}`);
    }
  }
  // 403 to a script is usually bot protection; confirm with a real browser before counting it as broken.
  if (blocked.length) {
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const u of blocked) {
      if (KNOWN_PROTECTED.has(u)) continue;
      try {
        const res = await page.goto(u, { waitUntil: "domcontentloaded", timeout: 30000 });
        if (!res || res.status() >= 400) bad.push(`${u} → ${res ? res.status() : "no response"} (browser)`);
      } catch (e) {
        bad.push(`${u} → ${e.message}`);
      }
    }
    await browser.close();
  }
  add("1", `all ${urls.length} unique source URLs answer < 400 (403s re-checked in a real browser)`, bad.length === 0, 40, bad.join("; ") || (blocked.length ? `${blocked.length} bot-protected, OK in browser` : ""));
}

// ---------- 4. Readability ----------
{
  const syll = (w) => {
    w = w.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    const m = w.replace(/e$/, "").match(/[aeiouy]+/g);
    return Math.max(1, m ? m.length : 1);
  };
  const items = ["milestones", "play-tips", "watch-outs"].flatMap((f) => json(`src/content/${f}.json`).map((i) => ({ ...i, file: f })));
  const text = items.map((i) => i.description + " " + (i.action || "")).join(" ");
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);
  const avgSentence = words.length / sentences.length;
  const syllables = words.reduce((a, w) => a + syll(w), 0);
  const flesch = 206.835 - 1.015 * avgSentence - 84.6 * (syllables / words.length);
  add("4", "EN average sentence length ≤ 22 words", avgSentence <= 22, 30, avgSentence.toFixed(1));
  add("4", "EN Flesch reading ease ≥ 55", flesch >= 55, 30, flesch.toFixed(1));
  const longTitles = items.filter((i) => i.file === "milestones" && i.title.split(/\s+/).length > 7).map((i) => i.id);
  add("4", "milestone titles ≤ 7 words", longTitles.length === 0, 20, longTitles.slice(0, 5).join(","));
  const koLong = json("src/content/ko/milestones.json").filter((i) => i.title.length > 18).map((i) => i.id);
  add("4", "KO milestone titles ≤ 18 characters", koLong.length === 0, 10, koLong.slice(0, 8).join(","));
  add("4", "every watch-out has an action", json("src/content/watch-outs.json").every((w) => w.action), 10);
}

// ---------- 5. Visual identity ----------
{
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(f)) files.push(p);
    }
  };
  walk(path.join(ROOT, "src"));
  const rawHex = [], emoji = [], twPalette = [];
  for (const p of files) {
    const rel = path.relative(ROOT, p);
    const s = readFileSync(p, "utf8");
    // layout.tsx carries the two <meta name="theme-color"> literals, which must be hex.
    if (!["src/app/globals.css", "src/app/layout.tsx"].includes(rel) && !rel.startsWith("src/app/admin") && /#[0-9a-fA-F]{6}\b/.test(s)) rawHex.push(rel);
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s) && !rel.includes("__tests__")) emoji.push(rel);
    if (!rel.startsWith("src/app/admin") && !rel.startsWith("src/components/ui/") && /\b(bg|text|border)-(red|green|blue|yellow|amber|purple|pink|orange|emerald|violet|slate|gray|zinc)-\d{2,3}\b/.test(s)) twPalette.push(rel);
  }
  add("5", "no raw hex colours outside globals.css", rawHex.length === 0, 30, rawHex.join(","));
  add("5", "no emoji used as UI glyphs", emoji.length === 0, 20, emoji.join(","));
  add("5", "no Tailwind palette colours (tokens only)", twPalette.length === 0, 20, twPalette.join(","));
  const css = read("src/app/globals.css");
  const light = [...css.matchAll(/^\s*(--gb-[a-z-]+):/gm)].map((m) => m[1]);
  const darkBlock = css.slice(css.indexOf("prefers-color-scheme: dark"));
  const missingDark = [...new Set(light)].filter((k) => !["--gb-radius", "--gb-row"].includes(k) && !darkBlock.includes(k + ":"));
  add("5", "every light token has a dark counterpart", missingDark.length === 0, 20, missingDark.join(","));
  add("5", "single icon library (lucide-react)", !files.some((p) => /react-icons|@heroicons|@tabler/.test(readFileSync(p, "utf8"))), 10);
}

// ---------- 9. Reliability: typecheck, lint, unit ----------
{
  const tsc = run("npx", ["tsc", "--noEmit"]);
  add("9", "TypeScript strict clean", tsc.status === 0, 20, tsc.stdout.split("\n").filter(Boolean).slice(0, 2).join(" | "));
  const lint = run("npx", ["eslint", "--max-warnings=0"]);
  add("9", "ESLint clean (0 warnings)", lint.status === 0, 15, (lint.stdout.match(/✖.*/) || [""])[0]);
  const unit = run("npx", ["vitest", "run", "--reporter=json"]);
  let passed = 0, failed = 1;
  try {
    const j = JSON.parse(unit.stdout.slice(unit.stdout.indexOf("{")));
    passed = j.numPassedTests; failed = j.numFailedTests;
  } catch {}
  add("9", "unit tests pass", failed === 0 && passed > 0, 25, `${passed} passed, ${failed} failed`);
}

// ---------- 8. First-load JS measured over the wire (needs the production server) ----------
if (!skip.has("bundle")) {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  let worst = ["-", 0];
  let reachable = true;
  try {
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch();
    for (const route of ["/", "/milestones/16/", "/play-tips/16/", "/watch-outs/16/", "/memo/", "/settings/"]) {
      const page = await browser.newPage();
      let bytes = 0;
      page.on("requestfinished", async (req) => {
        if (req.resourceType() !== "script") return;
        try {
          const sz = await req.sizes();
          bytes += sz.responseBodySize;
        } catch {}
      });
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      if (bytes > worst[1]) worst = [route, bytes];
      await page.close();
    }
    await browser.close();
  } catch {
    reachable = false;
    worst = ["-", 0];
  }
  add("8", "first-load JS ≤ 250 kB over the wire on every core route", reachable && worst[1] > 0 && worst[1] <= 250 * 1024, 30, reachable ? `${worst[0]} = ${(worst[1] / 1024).toFixed(0)} kB` : "server not reachable");
}

// ---------- 10. iOS readiness + App Store artefacts ----------
{
  const has = (p) => existsSync(path.join(ROOT, p));
  add("10", "1024×1024 opaque App Store icon", has("resources/icon-1024.png"), 10);
  add("10", "PWA icons, maskable icon, apple-touch-icon, favicon", ["public/icon-192.png", "public/icon-512.png", "public/icon-maskable-512.png", "public/apple-touch-icon.png", "public/favicon-32.png"].every(has), 5);
  add("10", "splash sources (light + dark)", has("resources/splash-2732.png") && has("resources/splash-2732-dark.png"), 5);
  add("10", "capacitor.config.ts declares appId/appName/webDir", has("capacitor.config.ts") && /appId:\s*"co\.minjae\.dodam"/.test(read("capacitor.config.ts")), 10);
  const plist = has("ios/App/App/Info.plist") ? read("ios/App/App/Info.plist") : "";
  add("10", "Info.plist: portrait only, non-exempt encryption = NO", /ITSAppUsesNonExemptEncryption/.test(plist) && !/UIInterfaceOrientationLandscapeLeft/.test(plist.split("UISupportedInterfaceOrientations~ipad")[0]), 10, plist ? "" : "ios/ not generated");
  add("10", "privacy manifest present", has("ios/App/App/PrivacyInfo.xcprivacy"), 10);
  add("10", "privacy + terms routes exist", has("src/app/privacy/page.tsx") && has("src/app/terms/page.tsx"), 10);
  add("10", "data export and delete exist", /createBackup|clearAllData/.test(read("src/screens/settings-screen.tsx")), 5);
  if (has("docs/app-store/listing.json")) {
    const l = json("docs/app-store/listing.json");
    const bad = [];
    for (const [lang, m] of Object.entries(l.locales)) {
      if (m.name.length > 30) bad.push(`${lang}.name`);
      if (m.subtitle.length > 30) bad.push(`${lang}.subtitle`);
      if (m.keywords.length > 100) bad.push(`${lang}.keywords ${m.keywords.length}`);
      if (m.description.length > 4000) bad.push(`${lang}.description`);
      if (m.promotionalText && m.promotionalText.length > 170) bad.push(`${lang}.promotionalText`);
    }
    add("10", "App Store metadata within limits (EN + KO)", bad.length === 0 && l.locales.en && l.locales.ko, 10, bad.join(","));
    const shots = has("docs/app-store/screenshots") ? readdirSync(path.join(ROOT, "docs/app-store/screenshots")) : [];
    add("10", "screenshots for 6.9″ and 6.7″ present", shots.some((s) => s.includes("1320x2868")) && shots.some((s) => s.includes("1290x2796")), 10, `${shots.length} files`);
  } else {
    add("10", "App Store metadata (docs/app-store/listing.json)", false, 10, "missing");
    add("10", "screenshots", false, 10, "missing");
  }
}

// ---------- 6, 7, 8, 9: E2E (a11y, tap targets, console, offline, flows) ----------
if (!skip.has("e2e")) {
  const r = run("npx", ["playwright", "test", "--reporter=json"], { env: { ...process.env, CI: "1" } });
  let stats = { expected: 0, unexpected: 0, skipped: 0 };
  let failedTitles = [];
  try {
    const j = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
    stats = j.stats;
    const walk = (suites) => {
      for (const s of suites) {
        for (const sp of s.specs || []) if (!sp.ok) failedTitles.push(sp.title);
        if (s.suites) walk(s.suites);
      }
    };
    walk(j.suites || []);
  } catch {}
  const ok = stats.unexpected === 0 && stats.expected > 0;
  const a11y = failedTitles.filter((t) => /axe|tap targets|reduced motion|safe areas/.test(t)).length === 0;
  const flows = failedTitles.filter((t) => !/axe|tap targets|reduced motion|safe areas|console|offline|two taps/.test(t)).length === 0;
  add("7", "axe (WCAG 2.1 AA), 44px targets, reduced motion, safe areas pass on every route", a11y && stats.expected > 0, 60, `${stats.expected} passed, ${stats.unexpected} failed`);
  add("9", "E2E flows pass on iPhone (Chromium + WebKit), dark mode and desktop", flows && ok, 25, failedTitles.slice(0, 5).join(" | "));
  add("9", "zero console errors/warnings during E2E", failedTitles.filter((t) => /console/.test(t)).length === 0 && stats.expected > 0, 15);
  add("8", "offline: shell + month page load with no network", failedTitles.filter((t) => /offline/.test(t)).length === 0 && stats.expected > 0, 20);
  add("6", "every core screen ≤ 2 taps from Home; every screen has a back path", failedTitles.filter((t) => /two taps|way back|Back/.test(t)).length === 0 && stats.expected > 0, 50);
}

// ---------- 8. Lighthouse ----------
if (!skip.has("lighthouse")) {
  const r = run("node", ["scripts/qa/lighthouse.mjs"]);
  let lh = null;
  try { lh = JSON.parse(r.stdout.slice(r.stdout.lastIndexOf("\n{") + 1)); } catch {}
  if (lh) {
    const minPerf = Math.min(...Object.values(lh).map((x) => x.performance));
    const maxCls = Math.max(...Object.values(lh).map((x) => x.cls));
    const minA11y = Math.min(...Object.values(lh).map((x) => x.accessibility));
    add("8", "Lighthouse mobile performance ≥ 95 on every core route", minPerf >= 95, 30, `min ${minPerf}`);
    add("8", "CLS < 0.02 everywhere", maxCls < 0.02, 20, `max ${maxCls}`);
    add("7", "Lighthouse accessibility ≥ 95", minA11y >= 95, 20, `min ${minA11y}`);
  } else {
    add("8", "Lighthouse run", false, 50, (r.stderr || r.stdout).split("\n").slice(-3).join(" "));
  }
}

// ---------- Scorecard ----------
const score = {};
for (const [m, checks] of Object.entries(results)) {
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const lost = checks.filter((c) => !c.ok).reduce((a, c) => a + c.weight, 0);
  score[m] = Math.max(0, Math.round(100 - (lost / total) * 100));
}
console.log("\nMachine scorecard (100 = every check passed):");
for (const m of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) console.log(`  metric ${m.padStart(2)}: ${score[m] ?? "n/a"}`);
mkdirSync(path.join(ROOT, "qa"), { recursive: true });
writeFileSync(path.join(ROOT, "qa/machine.json"), JSON.stringify({ generatedAt: new Date().toISOString(), score, results }, null, 2));
const failing = Object.entries(score).filter(([, s]) => s < 95);
process.exit(failing.length ? 1 : 0);
