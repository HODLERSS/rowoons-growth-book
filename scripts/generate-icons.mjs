// Dodam icon set — generated from the brand package (html/brand/b01-dodam). Run: npm run icons
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";

const CINNABAR = "#C9453A";
const CREAM = "#FAF6EE";

/** The seal: cinnabar square, cream ㄷ. `pad` scales the glyph for maskable / small sizes. */
const iconSvg = (size, { radius = 0, glyphScale = 1, bg = CINNABAR, fg = CREAM } = {}) => {
  const s = size;
  const r = Math.round(s * radius);
  // ㄷ on a 1024 grid: M640 352H384v320h256, stroke 88, square caps.
  const g = glyphScale;
  const cx = 512, cy = 512;
  const pts = { x1: 640, y1: 352, x0: 384, y2: 672 };
  const tx = (x) => ((x - cx) * g + cx) * (s / 1024);
  const ty = (y) => ((y - cy) * g + cy) * (s / 1024);
  const sw = 88 * g * (s / 1024);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${r}" fill="${bg}"/>
  <path d="M${tx(pts.x1)} ${ty(pts.y1)}H${tx(pts.x0)}V${ty(pts.y2)}H${tx(pts.x1)}" fill="none" stroke="${fg}" stroke-width="${sw}" stroke-linecap="square"/>
</svg>`;
};

const badgeSvg = (size) => {
  const s = size;
  const k = s / 1024;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect x="${64 * k}" y="${64 * k}" width="${896 * k}" height="${896 * k}" rx="${180 * k}" fill="none" stroke="#FFFFFF" stroke-width="${96 * k}"/>
  <path d="M${640 * k} ${352 * k}H${384 * k}V${672 * k}H${640 * k}" fill="none" stroke="#FFFFFF" stroke-width="${96 * k}" stroke-linecap="square"/>
</svg>`;
};

const ogSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CREAM}"/>
  <rect x="80" y="155" width="320" height="320" rx="72" fill="${CINNABAR}"/>
  <path d="M280 265H200v100h80" fill="none" stroke="${CREAM}" stroke-width="28" stroke-linecap="square"/>
  <text x="470" y="300" font-family="Noto Serif KR, Apple SD Gothic Neo, Georgia, serif" font-weight="600" font-size="96" fill="#1F3327">Dodam · 도담</text>
  <text x="472" y="380" font-family="-apple-system, Helvetica Neue, Arial, sans-serif" font-size="40" fill="#5F6356">Grow well, one month at a time.</text>
  <text x="472" y="440" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="40" fill="#5F6356">한 달 한 달, 도담도담.</text>
</svg>`;

const png = (svg) => sharp(Buffer.from(svg)).png();

mkdirSync("public", { recursive: true });
mkdirSync("resources", { recursive: true });

// Web / PWA
await png(iconSvg(512, { radius: 0.22 })).toFile("public/icon-512.png");
await png(iconSvg(192, { radius: 0.22 })).toFile("public/icon-192.png");
await png(iconSvg(512, { radius: 0, glyphScale: 0.8 })).toFile("public/icon-maskable-512.png");
await png(iconSvg(180, { radius: 0 })).toFile("public/apple-touch-icon.png"); // iOS rounds it
await png(iconSvg(32, { radius: 0.22 })).toFile("public/favicon-32.png");
await png(badgeSvg(96)).toFile("public/badge-96.png");
await png(ogSvg()).toFile("public/og.png");

// iOS App Store icon (opaque, no alpha, square — Xcode applies the mask)
await sharp(Buffer.from(iconSvg(1024, { radius: 0 }))).flatten({ background: CINNABAR }).removeAlpha().png().toFile("resources/icon-1024.png");
// Splash source (2732×2732 centered mark on cream; used by the LaunchScreen storyboard)
await png(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="${CREAM}"/><g transform="translate(1166 1166)">${iconSvg(400, { radius: 0.22 }).replace(/<svg[^>]*>|<\/svg>/g, "")}</g></svg>`).toFile("resources/splash-2732.png");
await png(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="#151A16"/><g transform="translate(1166 1166)">${iconSvg(400, { radius: 0.22 }).replace(/<svg[^>]*>|<\/svg>/g, "")}</g></svg>`).toFile("resources/splash-2732-dark.png");

// favicon.ico (16 + 32)
const png16 = await png(iconSvg(16, { radius: 0.22 })).toBuffer();
const png32 = await png(iconSvg(32, { radius: 0.22 })).toBuffer();
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = [];
  for (const { w, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(w < 256 ? w : 0, 0);
    e.writeUInt8(w < 256 ? w : 0, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}
writeFileSync("src/app/favicon.ico", ico([{ w: 16, data: png16 }, { w: 32, data: png32 }]));
console.log("icons generated: public/*.png, resources/icon-1024.png, resources/splash-2732*.png, src/app/favicon.ico");
