// Text matching for the source audit (scripts/qa/sources.mjs). Plain ESM so node can run it without a build;
// unit-tested from src/lib/__tests__/source-match.test.ts.

/** Lowercase, straighten curly quotes and dashes, collapse all whitespace. */
export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `quote` appears verbatim (after normalisation) in `pageText`. */
export function quoteFound(pageText, quote) {
  const q = normalize(quote);
  if (!q) return false;
  return normalize(pageText).includes(q);
}

const STOP = new Set(["the", "and", "with", "when", "you", "your", "her", "his", "him", "she", "they", "them", "their", "like", "for", "from", "that", "this", "into", "out", "onto", "than", "own", "can", "does", "not"]);

function tokens(s) {
  return new Set(
    normalize(s)
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(" ")
      .filter((w) => w.length >= 3 && !STOP.has(w))
      .map((w) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, ""))
  );
}

/** The bullet whose content words overlap the title most (Jaccard). `score` is 0..1. */
export function bestBullet(title, bullets) {
  const a = tokens(title);
  let best = { bullet: null, score: 0 };
  for (const b of bullets) {
    const t = tokens(b);
    let inter = 0;
    for (const w of a) if (t.has(w)) inter++;
    const union = a.size + t.size - inter;
    const score = union === 0 ? 0 : inter / union;
    if (score > best.score) best = { bullet: b, score };
  }
  return best;
}
