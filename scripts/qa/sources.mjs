#!/usr/bin/env node
// Source audit: fetch every cited page once (real browser — cdc.gov and zerotothree.org refuse plain HTTP
// clients), then check that each EN `sourceSummary` appears verbatim on its page and, for CDC age pages,
// which milestone bullet the item's title matches. Writes qa/source-audit.json and prints a summary.
//
//   node scripts/qa/sources.mjs            # uses the cache in qa/source-cache when present
//   node scripts/qa/sources.mjs --refresh  # refetch every page
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { chromium } from "@playwright/test";
import { quoteFound, bestBullet, normalize } from "./source-match.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const CACHE = path.join(ROOT, "qa/source-cache");
const OUT = path.join(ROOT, "qa/source-audit.json");
const refresh = process.argv.includes("--refresh");
const FILES = ["milestones", "play-tips", "watch-outs"];

const items = FILES.flatMap((f) => JSON.parse(readFileSync(path.join(ROOT, "src/content", `${f}.json`), "utf8")).map((x) => ({ ...x, file: f })));

// Age-specific milestone checklists we can locate a milestone on, whether or not the item cites them.
const CDC = (slug, months) => ({ url: `https://www.cdc.gov/act-early/milestones/${slug}.html`, months, org: "CDC" });
const AAP = (section, slug, months) => ({ url: `https://www.healthychildren.org/English/ages-stages/${section}/Pages/${slug}.aspx`, months, org: "AAP" });
const CANDIDATES = [
  CDC("2-months", 2), CDC("4-months", 4), CDC("6-months", 6), CDC("9-months", 9), CDC("1-year", 12), CDC("15-months", 15), CDC("18-months", 18), CDC("2-years", 24), CDC("30-months", 30), CDC("3-years", 36),
  AAP("baby", "Developmental-Milestones-1-Month", 1), AAP("baby", "Developmental-Milestones-3-Months", 3), AAP("baby", "Developmental-Milestones-4-to-7-Months", 7), AAP("baby", "Developmental-Milestones-8-to-12-Months", 12),
  AAP("toddler", "Developmental-Milestones-1-Year-Olds", 24), AAP("toddler", "Developmental-Milestones-2-Year-Olds", 36), AAP("preschool", "Developmental-Milestones-3-to-4-Year-Olds", 48),
];
const urls = [...new Set([...items.map((x) => x.sourceUrl), ...CANDIDATES.map((c) => c.url)])];
mkdirSync(CACHE, { recursive: true });

const pages = new Map();
const missing = urls.filter((u) => refresh || !existsSync(cachePath(u)));
if (missing.length) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15", locale: "en-US" });
  for (const url of missing) {
    const page = await ctx.newPage();
    let rec;
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(2500);
      const status = res?.status() ?? 0;
      const text = await page.evaluate(() => document.body?.innerText ?? "");
      const bullets = await page.evaluate(() => Array.from(document.querySelectorAll("main li, article li, li")).map((li) => li.innerText.trim()).filter((t) => t && t.length < 160));
      rec = { url, status, fetchedAt: new Date().toISOString(), text, bullets: [...new Set(bullets)] };
    } catch (e) {
      rec = { url, status: 0, fetchedAt: new Date().toISOString(), text: "", bullets: [], error: String(e.message ?? e) };
    }
    await page.close();
    writeFileSync(cachePath(url), JSON.stringify(rec));
    console.log(`${rec.status || "ERR"}  ${url}  (${rec.text.length} chars, ${rec.bullets.length} bullets)`);
  }
  await browser.close();
}
for (const u of urls) pages.set(u, JSON.parse(readFileSync(cachePath(u), "utf8")));

const CDC_AGE = /cdc\.gov\/act-early\/milestones\/([0-9]+)-(months?|years?)\.html/;
const results = items.map((x) => {
  const p = pages.get(x.sourceUrl);
  const reachable = p.status >= 200 && p.status < 400 && p.text.length > 500 && !/page not found|404/i.test(p.text.slice(0, 300));
  const verbatim = reachable && quoteFound(p.text, x.sourceSummary);
  const r = { file: x.file, id: x.id, month: x.month, title: x.title, url: x.sourceUrl, source: x.source, status: !reachable ? "unreachable" : verbatim ? "verbatim" : "paraphrase" };
  const m = CDC_AGE.exec(x.sourceUrl);
  if (m && reachable && x.file === "milestones") {
    const pageMonths = m[2].startsWith("year") ? Number(m[1]) * 12 : Number(m[1]);
    const best = bestBullet(x.title, p.bullets);
    r.cdc = { pageMonths, bullet: best.bullet, score: Number(best.score.toFixed(2)) };
  }
  if (x.file === "milestones") {
    // Where does this milestone actually appear on an age checklist? Best match across every candidate page.
    let best = null;
    for (const c of CANDIDATES) {
      const cp = pages.get(c.url);
      if (!cp || cp.status < 200 || cp.status >= 400) continue;
      const b = bestBullet(x.title, cp.bullets);
      if (!best || b.score > best.score) best = { url: c.url, org: c.org, months: c.months, bullet: b.bullet, score: Number(b.score.toFixed(2)) };
    }
    r.best = best;
  }
  return r;
});

const count = (k) => results.filter((r) => r.status === k).length;
const summary = {
  checkedAt: new Date().toISOString(),
  items: results.length,
  urls: urls.length,
  verbatim: count("verbatim"),
  paraphrase: count("paraphrase"),
  unreachable: count("unreachable"),
  byUrl: urls.map((u) => ({ url: u, status: pages.get(u).status, chars: pages.get(u).text.length, bullets: pages.get(u).bullets.length, cited: items.filter((x) => x.sourceUrl === u).length, verbatim: results.filter((r) => r.url === u && r.status === "verbatim").length })),
};
writeFileSync(OUT, JSON.stringify({ summary, results }, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log(`report: ${path.relative(ROOT, OUT)}`);

function cachePath(u) {
  return path.join(CACHE, createHash("sha1").update(normalize(u)).digest("hex").slice(0, 12) + ".json");
}
