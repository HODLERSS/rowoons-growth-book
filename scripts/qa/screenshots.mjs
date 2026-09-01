// App Store screenshots: framed, captioned, at the two required iPhone sizes, in EN and KO.
// Requires the production server (npm run start). Usage: node scripts/qa/screenshots.mjs [baseUrl]
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "fs";
import sharp from "sharp";

const base = process.argv[2] || "http://localhost:3000";
const OUT = "docs/app-store/screenshots";
mkdirSync(OUT, { recursive: true });

const SIZES = [
  { tag: "1320x2868", w: 1320, h: 2868, css: { w: 440, h: 956 } }, // 6.9" (iPhone 16 Pro Max) @3x
  { tag: "1290x2796", w: 1290, h: 2796, css: { w: 430, h: 932 } }, // 6.7" (iPhone 15 Plus / 14 Pro Max) @3x
];

const profile = { name: "Rowoon", nameKo: "로운", birthDate: "2025-04-17" };
const SHOTS = {
  en: [
    { path: "/", caption: "One book for the first 36 months" },
    { path: "/milestones/16/", caption: "Confirm a milestone. It’s stamped with the date." },
    { path: "/play-tips/16/", caption: "Play ideas matched to this month" },
    { path: "/watch-outs/16/", caption: "Safety notes, graded and actionable" },
    { path: "/memo/", caption: "A private journal that stays on your phone" },
  ],
  ko: [
    { path: "/", caption: "생후 36개월까지, 한 권의 책" },
    { path: "/milestones/16/", caption: "확인하면 날짜와 함께 도장이 찍혀요" },
    { path: "/play-tips/16/", caption: "이번 달에 딱 맞는 놀이" },
    { path: "/watch-outs/16/", caption: "긴급·주의·참고로 나눈 안전 정보" },
    { path: "/memo/", caption: "휴대폰에만 남는 나만의 기록" },
  ],
};

const seed = (lang) => [
  (args) => {
    const [p, l] = args;
    localStorage.setItem("sprout:profile", JSON.stringify(p));
    localStorage.setItem("sprout:language", JSON.stringify(l));
    localStorage.setItem("sprout:milestones", JSON.stringify({ "m-16-social-1": { completed: true, completedAt: "2026-08-20T10:00:00Z" }, "m-16-language-1": { completed: true, completedAt: "2026-08-24T10:00:00Z" } }));
    localStorage.setItem(
      "sprout:memos",
      JSON.stringify([
        { id: "a1", title: l === "ko" ? "첫 걸음" : "First steps", content: l === "ko" ? "소파까지 세 걸음, 그리고 털썩." : "Three steps toward the sofa, then a sit.", createdAt: "2026-08-29T10:00:00Z", updatedAt: "2026-08-29T10:00:00Z" },
        { id: "a2", title: l === "ko" ? "'엄마' 라고 했어요" : "Said “mama”", content: l === "ko" ? "아침에 분명히 들었어요." : "Clearly, at breakfast.", createdAt: "2026-08-14T10:00:00Z", updatedAt: "2026-08-14T10:00:00Z" },
      ])
    );
  },
  [profile, lang],
];

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Greedy word wrap into at most two lines (Korean wraps by character count). */
function wrap(text, lang) {
  const max = lang === "ko" ? 12 : 24;
  if (text.length <= max) return [text];
  if (lang === "ko") {
    const words = text.split(" ");
    const lines = [""];
    for (const w of words) {
      const cur = lines[lines.length - 1];
      if ((cur + " " + w).trim().length > max && cur) lines.push(w);
      else lines[lines.length - 1] = (cur + " " + w).trim();
    }
    return lines.slice(0, 2);
  }
  const words = text.split(" ");
  const lines = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + " " + w).trim().length > max && cur) lines.push(w);
    else lines[lines.length - 1] = (cur + " " + w).trim();
  }
  return lines.slice(0, 2);
}

const browser = await chromium.launch();
for (const size of SIZES) {
  for (const lang of ["en", "ko"]) {
    const ctx = await browser.newContext({
      ...devices["iPhone 15"],
      viewport: { width: size.css.w, height: size.css.h },
      deviceScaleFactor: 3,
      locale: lang === "ko" ? "ko-KR" : "en-US",
    });
    await ctx.addInitScript(...seed(lang));
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date("2026-08-31T10:00:00"));
    let i = 1;
    for (const shot of SHOTS[lang]) {
      await page.goto(base + shot.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const raw = await page.screenshot({ type: "png" }); // exactly size.w × size.h
      // Caption band (brand cream, serif) drawn over the top 16% with the app pushed down and framed.
      const bandH = Math.round(size.h * 0.16);
      const innerH = size.h - bandH;
      const scale = innerH / size.h;
      const innerW = Math.round(size.w * scale);
      const x = Math.round((size.w - innerW) / 2);
      const app = await sharp(raw).resize(innerW, innerH).png().toBuffer();
      const font = lang === "ko" ? "Apple SD Gothic Neo, Noto Sans KR, sans-serif" : "Nunito, Avenir Next, Helvetica Neue, Arial, sans-serif";
      const lines = wrap(shot.caption, lang);
      const fs = Math.round(size.w * 0.046);
      const lineH = Math.round(fs * 1.25);
      const y0 = Math.round(bandH / 2 - ((lines.length - 1) * lineH) / 2 + fs * 0.35);
      const textEls = lines.map((l, i) => `<text x="${size.w / 2}" y="${y0 + i * lineH}" text-anchor="middle" font-family="${font}" font-weight="800" font-size="${fs}" fill="#3A2A22">${escape(l)}</text>`).join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}">
        <rect width="${size.w}" height="${size.h}" fill="#FFF8F3"/>
        ${textEls}
        <rect x="${x - 6}" y="${bandH - 6}" width="${innerW + 12}" height="${innerH + 12}" rx="60" fill="#F0DED2"/>
      </svg>`;
      const out = await sharp(Buffer.from(svg))
        .composite([{ input: await sharp(app).composite([{ input: Buffer.from(`<svg width="${innerW}" height="${innerH}"><rect width="${innerW}" height="${innerH}" rx="56" fill="#fff"/></svg>`), blend: "dest-in" }]).png().toBuffer(), left: x, top: bandH }])
        .png()
        .toFile(`${OUT}/${lang}-${i}-${size.tag}.png`);
      console.log("wrote", `${OUT}/${lang}-${i}-${size.tag}.png`, out.width, out.height);
      i++;
    }
    await ctx.close();
  }
}
await browser.close();
