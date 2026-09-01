/** Korean particle (조사) selection. Works for Hangul, digits, and a best-effort rule for Latin names. */

export type JosaPair = "을/를" | "이/가" | "은/는" | "과/와" | "으로/로" | "아/야" | "이/x";

const DIGIT_BATCHIM: Record<string, boolean> = {
  "0": true, "1": true, "2": false, "3": true, "4": false, "5": false, "6": true, "7": true, "8": true, "9": false,
};

/** Returns true if the word ends in a syllable with a final consonant (받침). null when unknown. */
export function hasBatchim(word: string): boolean | null {
  const w = word.trim().replace(/[)\]"'’”]+$/, "");
  if (!w) return null;
  const ch = w[w.length - 1];
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(ch)) return DIGIT_BATCHIM[ch];
  if (/[a-z]/i.test(ch)) {
    // Latin: vowels (and silent-ish e/y endings) read as open syllables; most consonants close.
    const lower = w.toLowerCase();
    if (/[aeiouy]$/.test(lower)) return false;
    if (/(h|w|r)$/.test(lower)) return false; // Noah, Matthew, Oliver → 노아, 매튜, 올리버
    return true; // Rowoon, Daniel, Sam
  }
  return null;
}

/** Ends with ㄹ 받침 (matters for 으로/로). */
function endsWithRieul(word: string): boolean {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 8;
  return false;
}

export function josa(word: string, pair: JosaPair): string {
  const b = hasBatchim(word);
  const [withB, without] = pair === "이/x" ? ["이", ""] : pair.split("/");
  if (pair === "으로/로") {
    return word + (b && !endsWithRieul(word) ? "으로" : "로");
  }
  if (b === null) {
    // Unknown script: show both forms, the conventional fallback.
    return pair === "이/x" ? word : `${word}${withB}(${without})`;
  }
  return word + (b ? withB : without);
}
