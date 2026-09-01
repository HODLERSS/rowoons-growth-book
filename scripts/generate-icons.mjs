// Sprout icon set — generated from the brand package (html/brand/b03-sprout). Run: npm run icons
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";

const CORAL = "#E86F4A";
const CREAM = "#FFF8F3";
const INK = "#3A2A22";

/** The sprout: coral square, cream stem and two leaves (1024 grid from the brand package). `glyphScale` shrinks it for maskable icons. */
const iconSvg = (size, { radius = 0, glyphScale = 1, bg = CORAL, fg = CREAM } = {}) => {
  const s = size;
  const r = Math.round(s * radius);
  const k = s / 1024;
  const g = glyphScale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${r}" fill="${bg}"/>
  <g transform="translate(${512 * k} ${512 * k}) scale(${g}) translate(${-512 * k} ${-512 * k}) scale(${k})">
    <path d="M512 880V440" stroke="${fg}" stroke-width="72" stroke-linecap="round" fill="none"/>
    <path d="M512 520c-30-190-160-250-320-250 0 190 130 290 320 250z" fill="${fg}"/>
    <path d="M512 400c30-160 130-220 290-220 0 160-100 250-290 220z" fill="${fg}"/>
  </g>
</svg>`;
};

const badgeSvg = (size) => {
  const s = size;
  const k = s / 1024;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <g transform="scale(${k})">
    <path d="M512 920V440" stroke="#FFFFFF" stroke-width="96" stroke-linecap="round" fill="none"/>
    <path d="M512 540c-30-210-170-280-360-280 0 210 150 320 360 280z" fill="#FFFFFF"/>
    <path d="M512 400c30-180 140-250 330-250 0 180-110 290-330 250z" fill="#FFFFFF"/>
  </g>
</svg>`;
};

const ogSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CREAM}"/>
  <g transform="translate(80 155) scale(0.3125)">${iconSvg(1024, { radius: 0.22 }).replace(/<svg[^>]*>|<\/svg>/g, "")}</g>
  <text x="470" y="300" font-family="Nunito, Avenir Next, Helvetica Neue, Arial, sans-serif" font-weight="800" font-size="96" fill="${INK}">Sprout · 새싹</text>
  <text x="472" y="380" font-family="-apple-system, Helvetica Neue, Arial, sans-serif" font-size="40" fill="#6F5D52">Grow, one leaf at a time.</text>
  <text x="472" y="440" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="40" fill="#6F5D52">한 잎, 한 잎 자라요.</text>
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
await sharp(Buffer.from(iconSvg(1024, { radius: 0 }))).flatten({ background: CORAL }).removeAlpha().png().toFile("resources/icon-1024.png");
// Splash source (2732×2732 centered mark on cream; used by the LaunchScreen storyboard)
await png(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="${CREAM}"/><g transform="translate(1166 1166)">${iconSvg(400, { radius: 0.22 }).replace(/<svg[^>]*>|<\/svg>/g, "")}</g></svg>`).toFile("resources/splash-2732.png");
await png(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="#1C1512"/><g transform="translate(1166 1166)">${iconSvg(400, { radius: 0.22 }).replace(/<svg[^>]*>|<\/svg>/g, "")}</g></svg>`).toFile("resources/splash-2732-dark.png");

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
