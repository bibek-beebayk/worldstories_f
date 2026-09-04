import { describe, expect, it } from "vitest";
import { clampFraction, contentScrollFraction, progressPercent } from "./readingProgress";

describe("contentScrollFraction", () => {
  const article = { contentTop: 200, contentHeight: 1000 };

  it("is zero before the content starts", () => {
    expect(contentScrollFraction({ ...article, viewportBottom: 150 })).toBe(0);
  });

  it("measures to the bottom of the viewport, not the top", () => {
    // The reader can see the first 400px of the article, so they are 40%
    // through it — even though its top has barely moved.
    expect(contentScrollFraction({ ...article, viewportBottom: 600 })).toBeCloseTo(0.4);
  });

  it("reaches the end when the last line is on screen", () => {
    // Measuring to the viewport top instead would cap a short article well
    // under 100% and never let it complete.
    expect(contentScrollFraction({ ...article, viewportBottom: 1200 })).toBe(1);
  });

  it("clamps past the end", () => {
    expect(contentScrollFraction({ ...article, viewportBottom: 99999 })).toBe(1);
  });

  it("reports the start for content with no height rather than dividing by zero", () => {
    for (const contentHeight of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(contentScrollFraction({ contentTop: 0, contentHeight, viewportBottom: 500 })).toBe(0);
    }
  });
});

describe("clampFraction", () => {
  it("keeps values inside 0–1", () => {
    expect(clampFraction(-1)).toBe(0);
    expect(clampFraction(0.5)).toBe(0.5);
    expect(clampFraction(2)).toBe(1);
  });

  it("treats non-numbers as the start", () => {
    expect(clampFraction(Number.NaN)).toBe(0);
  });
});

describe("progressPercent", () => {
  it("rounds to whole numbers", () => {
    // A reading position is an approximation; a decimal implies a precision
    // the estimate does not have.
    expect(progressPercent(0.6789)).toBe(68);
    expect(progressPercent(0)).toBe(0);
    expect(progressPercent(1)).toBe(100);
  });

  it("never reports outside 0–100", () => {
    expect(progressPercent(-3)).toBe(0);
    expect(progressPercent(4)).toBe(100);
  });
});
