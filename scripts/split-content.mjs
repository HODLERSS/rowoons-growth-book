// Split the monolithic content JSON into one small file per language and month (loaded on demand).
// Runs automatically before dev/build (see package.json). Output: src/content/gen/{en,ko}/{1..36}.json
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const src = (p) => JSON.parse(readFileSync(path.join(ROOT, "src/content", p), "utf8"));
const SEVERITY = { urgent: 0, caution: 1, info: 2 };

rmSync(path.join(ROOT, "src/content/gen"), { recursive: true, force: true });
for (const lang of ["en", "ko"]) {
  const dir = lang === "en" ? "" : "ko/";
  const milestones = src(`${dir}milestones.json`);
  const playTips = src(`${dir}play-tips.json`);
  const watchOuts = src(`${dir}watch-outs.json`);
  const notes = src(`${dir}monthly-notes.json`);
  mkdirSync(path.join(ROOT, "src/content/gen", lang), { recursive: true });
  for (let m = 1; m <= 36; m++) {
    const bundle = {
      month: m,
      milestones: milestones.filter((x) => x.month === m),
      playTips: playTips.filter((x) => x.month === m),
      watchOuts: watchOuts.filter((x) => x.month === m).sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity]),
      note: notes[String(m)] ?? null,
    };
    writeFileSync(path.join(ROOT, "src/content/gen", lang, `${m}.json`), JSON.stringify(bundle));
  }
}
console.log("content split: src/content/gen/{en,ko}/1..36.json");
