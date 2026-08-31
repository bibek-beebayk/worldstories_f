import { describe, expect, it } from "vitest";
import { clampSyncOffset, formatSyncOffset } from "./readAlongSyncOffset";

describe("clampSyncOffset", () => {
  it.each([NaN, Infinity, -Infinity, "x", null, undefined, {}])(
    "coerces non-finite input %s to 0",
    (value) => {
      expect(clampSyncOffset(value)).toBe(0);
    }
  );

  it("clamps to +/- 5 seconds", () => {
    expect(clampSyncOffset(10)).toBe(5);
    expect(clampSyncOffset(-9)).toBe(-5);
    expect(clampSyncOffset(5)).toBe(5);
    expect(clampSyncOffset(-5)).toBe(-5);
  });

  it("rounds away floating-point step drift", () => {
    expect(clampSyncOffset(0.1 + 0.2)).toBe(0.3);
    expect(clampSyncOffset(0.30000000000000004)).toBe(0.3);
  });

  it("parses numeric strings", () => {
    expect(clampSyncOffset("0.5")).toBe(0.5);
    expect(clampSyncOffset("-1.2")).toBe(-1.2);
  });
});

describe("formatSyncOffset", () => {
  it.each([
    [0, "0s"],
    [0.4, "+0.4s"],
    [-0.3, "-0.3s"],
    [2, "+2.0s"],
    [-5, "-5.0s"],
  ] as const)("formats %s as %s", (seconds, expected) => {
    expect(formatSyncOffset(seconds)).toBe(expected);
  });
});
