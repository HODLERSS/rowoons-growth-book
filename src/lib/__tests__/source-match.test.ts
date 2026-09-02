import { describe, expect, it } from "vitest";
// The source audit script runs under plain node, so the matching logic lives next to it as ESM.
import { normalize, quoteFound, bestBullet } from "../../../scripts/qa/source-match.mjs";

describe("normalize", () => {
  it("lowercases, straightens quotes and collapses whitespace", () => {
    expect(normalize("  Blows\n“Raspberries”   (sticks\ttongue out) — it’s fun ")).toBe("blows \"raspberries\" (sticks tongue out) - it's fun");
  });
});

describe("quoteFound", () => {
  const page = "Milestones by 6 Months\n\nBlows “raspberries” (sticks tongue out and blows)\nPuts things in her mouth to explore them";
  it("finds a quote regardless of quote style and line breaks", () => {
    expect(quoteFound(page, 'Blows "raspberries" (sticks tongue out and blows)')).toBe(true);
    expect(quoteFound(page, "puts things in her mouth to\nexplore them")).toBe(true);
  });
  it("rejects a paraphrase", () => {
    expect(quoteFound(page, "Babies blow raspberries to practice their lips")).toBe(false);
  });
  it("rejects empty quotes", () => {
    expect(quoteFound(page, "")).toBe(false);
  });
});

describe("bestBullet", () => {
  const bullets = ["Knows familiar people", "Blows “raspberries” (sticks tongue out and blows)", "Rolls from tummy to back", "Looks when you call her name"];
  it("picks the bullet sharing the most content words", () => {
    expect(bestBullet("Blows raspberries", bullets)).toMatchObject({ bullet: bullets[1] });
    expect(bestBullet("Rolls tummy to back", bullets)).toMatchObject({ bullet: bullets[2] });
  });
  it("scores an unrelated title low", () => {
    expect(bestBullet("Stacks four blocks", bullets).score).toBeLessThan(0.2);
  });
  it("ignores case and plurals", () => {
    expect(bestBullet("looks when you call their name", bullets)).toMatchObject({ bullet: bullets[3] });
    expect(bestBullet("looks when you call their name", bullets).score).toBeGreaterThan(0.5);
  });
});
