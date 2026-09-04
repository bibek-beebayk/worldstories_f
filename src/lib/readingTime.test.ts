import { describe, expect, it } from "vitest";
import { formatMinutes, formatReadingMinutes, formatRemainingMinutes } from "./readingTime";

describe("reading-time formatting", () => {
  it("phrases an estimate for each surface", () => {
    expect(formatMinutes(12)).toBe("12 min");
    expect(formatReadingMinutes(12)).toBe("12 min read");
    expect(formatRemainingMinutes(8)).toBe("~8 min remaining");
  });

  it("returns null for a missing estimate so the label is omitted entirely", () => {
    // A story whose length is genuinely unknown must show nothing, never
    // "0 min read".
    for (const format of [formatMinutes, formatReadingMinutes, formatRemainingMinutes]) {
      expect(format(null)).toBeNull();
      expect(format(undefined)).toBeNull();
      expect(format(0)).toBeNull();
      expect(format(-5)).toBeNull();
      expect(format(Number.NaN)).toBeNull();
      expect(format(Number.POSITIVE_INFINITY)).toBeNull();
    }
  });

  it("rounds to whole minutes", () => {
    expect(formatMinutes(12.4)).toBe("12 min");
    expect(formatRemainingMinutes(7.6)).toBe("~8 min remaining");
  });
});
