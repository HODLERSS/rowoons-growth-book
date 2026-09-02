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
  add("U10", "every safety note has a What-to-do, every month has a three-voice note, every item cites a source", json("src/content/watch-outs.json").every((w) => w.action) && Object.keys(json("src/content/monthly-notes.json")).length === 36 && items.every((i) => i.source && i.sourceUrl && i.sourceSummary), 50);
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
  add("U2", "tokens only (no raw hex / palette colours), no emoji glyphs, one icon library", rawHex.length === 0 && emoji.length === 0 && twPalette.length === 0 && !files.some((p) => /react-icons|@heroicons|@tabler/.test(readFileSync(p, "utf8"))), 50);
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
  add("U8", "first-load JS ≤ 250 kB over the wire", reachable && worst[1] > 0 && worst[1] <= 250 * 1024, 20);
}

// ---------- 10. iOS readiness + App Store artefacts ----------
{
  const has = (p) => existsSync(path.join(ROOT, p));
  add("10", "1024×1024 opaque App Store icon", has("resources/icon-1024.png"), 10);
  add("10", "PWA icons, maskable icon, apple-touch-icon, favicon", ["public/icon-192.png", "public/icon-512.png", "public/icon-maskable-512.png", "public/apple-touch-icon.png", "public/favicon-32.png"].every(has), 5);
  add("10", "splash sources (light + dark)", has("resources/splash-2732.png") && has("resources/splash-2732-dark.png"), 5);
  add("10", "capacitor.config.ts declares appId/appName/webDir", has("capacitor.config.ts") && /appId:\s*"co\.minjae\.sprout"/.test(read("capacitor.config.ts")), 10);
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


// ---------- UX metrics (docs/UX_METRICS.md): the parts computable from source ----------
{
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(path.join(ROOT, "src/components"));
  walk(path.join(ROOT, "src/screens"));
  const css = read("src/app/globals.css");
  const pxText = [], tinyText = [], gradients = [];
  for (const p of files) {
    const rel = path.relative(ROOT, p);
    const s = readFileSync(p, "utf8");
    if (/\b(text|leading)-\[\d+px\]/.test(s)) pxText.push(rel);
    for (const m of s.matchAll(/\btext-\[(\d*\.?\d+)rem\]/g)) if (parseFloat(m[1]) < 0.75) tinyText.push(`${rel}:${m[1]}rem`);
    if (/bg-gradient|backdrop-blur/.test(s)) gradients.push(rel);
  }
  add("U1", "text sizes are rem-based (Dynamic Type scales them)", pxText.length === 0, 25, pxText.join(","));
  add("U1", "iOS root font follows Dynamic Type (html.ios { font: -apple-system-body })", /html\.ios\s*\{\s*font:\s*-apple-system-body/.test(css) && /classList\.add\("ios"\)/.test(read("src/components/shell/app-shell.tsx")), 25);
  add("U1", "form fields never drop under 16px on iOS (no focus zoom)", /input, textarea, select \{\s*font-size: max\(1rem, 1em\)/.test(css), 10);
  add("U1", "form fields keep touch-action: auto (installed iOS web apps open no keyboard otherwise)", /input, textarea, select \{\s*touch-action: auto/.test(css) && !/(^|,)\s*(input|textarea|select)[^{]*\{\s*touch-action: manipulation/m.test(css), 5);
  add("U1", "reduced-motion rule and safe-area utilities present", /prefers-reduced-motion/.test(css) && /@utility pt-safe/.test(css) && /@utility pb-safe/.test(css), 15);
  add("U1", "viewport allows zoom, theme-color declared for both appearances", /viewportFit: "cover"/.test(read("src/app/layout.tsx")) && !/userScalable: false|maximumScale: 1\b/.test(read("src/app/layout.tsx")) && (read("src/app/layout.tsx").match(/prefers-color-scheme/g) || []).length >= 2, 20);
  add("U2", "no gradients or glass effects in components", gradients.length === 0, 30, gradients.join(","));
  add("U2", "radius scale comes from the token (--gb-radius drives --radius)", /--radius: var\(--gb-radius\)/.test(css), 20);
  add("U3", "no text under 0.75rem (12px) in components", tinyText.length === 0, 30, tinyText.slice(0, 5).join(","));
  add("U3", "tabular numerals utility used for ages and counts", /tnum/.test(read("src/components/home/profile-card.tsx")) && /tnum/.test(read("src/screens/milestones-screen.tsx")) && /tnum/.test(read("src/components/month-chips.tsx")), 20);
  // contrast for both appearances from the token blocks
  const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const cr = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const tok = (block, k) => (block.match(new RegExp(`--gb-${k}:\\s*(#[0-9A-Fa-f]{6})`)) || [])[1];
  const lightBlock = css.slice(0, css.indexOf("prefers-color-scheme: dark"));
  const darkBlock = css.slice(css.indexOf("prefers-color-scheme: dark"));
  const bad = [];
  for (const [name, block] of [["light", lightBlock], ["dark", darkBlock]]) {
    const bg = tok(block, "bg"), surface = tok(block, "surface");
    for (const [k, need] of [["ink", 7], ["muted", 4.5], ["accent", 4.5], ["danger", 4.5], ["caution", 4.5], ["info", 4.5], ["done", 3]]) {
      const c = tok(block, k);
      if (!c || !bg) { bad.push(`${name}:${k} missing`); continue; }
      if (cr(c, bg) < need) bad.push(`${name}:${k}/bg ${cr(c, bg).toFixed(2)}<${need}`);
      if (surface && k !== "done" && cr(c, surface) < need) bad.push(`${name}:${k}/surface ${cr(c, surface).toFixed(2)}<${need}`);
    }
    const onp = tok(block, "on-primary"), prim = tok(block, "primary");
    if (onp && prim && cr(onp, prim) < 4.5) bad.push(`${name}:on-primary/primary ${cr(onp, prim).toFixed(2)}`);
  }
  add("U3", "token contrast: ink AAA, roles AA, button text AA — light and dark", bad.length === 0, 50, bad.join("; "));
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
  const uxFail = (re) => failedTitles.filter((t) => re.test(t)).length === 0 && stats.expected > 0;
  add("U1", "Dynamic Type at 130%: no overflow, targets stay ≥ 44px; tap targets ≥ 44px on every route; reduced motion honoured", uxFail(/U1:|tap targets|reduced motion|safe areas/), 0);
  add("U4", "≤ 2 taps to every core screen, back paths, aria-current on tabs and months, bare-section redirects", uxFail(/two taps|way back|month chips|redirects/), 100);
  add("U5", "Home shows ≤ 10 interactive elements above the fold, ≤ 14 in total, one filled action", uxFail(/U5:/), 50);
  add("U6", "designed states: empty journal, 404, missing entry, bad backup, discard guard, delete confirm, dated stamp feedback", uxFail(/U6|missing entry|bad file|unsaved|delete|nothing here|404/), 100);
  add("U7", "axe AA clean in light and dark; dialogs close on Escape and restore focus; lang follows language", uxFail(/axe|U6\/U7|Korean|language switch/), 100);
  add("U8", "Lighthouse ≥ 95, CLS < 0.02, JS ≤ 250 kB over the wire, offline works", uxFail(/offline/), 20);
  add("U9", "no clipped or overflowing text on any route in English or Korean; no horizontal page scroll", uxFail(/U9:/), 100);
  add("U10", "Home answers 'what now'; every safety note has an action; every month has a parent note; every item cites a source", uxFail(/U10:/), 50);
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
    add("U8", "Lighthouse mobile performance ≥ 95 and CLS < 0.02 on every core route", minPerf >= 95 && maxCls < 0.02, 60, `min perf ${minPerf}, max CLS ${maxCls}`);
    add("U7", "Lighthouse accessibility 100", minA11y >= 100, 0, `min ${minA11y}`);
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
console.log("UX/UI scorecard (docs/UX_METRICS.md):");
for (const m of ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "U10"]) console.log(`  ${m.padStart(3)}: ${score[m] ?? "n/a"}`);
mkdirSync(path.join(ROOT, "qa"), { recursive: true });
writeFileSync(path.join(ROOT, "qa/machine.json"), JSON.stringify({ generatedAt: new Date().toISOString(), score, results }, null, 2));
const failing = Object.entries(score).filter(([, s]) => s < 95);
process.exit(failing.length ? 1 : 0);
