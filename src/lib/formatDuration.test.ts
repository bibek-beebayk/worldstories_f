import { describe, expect, it } from "vitest";
import { formatClock, formatLeft, formatLong } from "./formatDuration";

describe("formatClock", () => {
  it("formats mm:ss and h:mm:ss and returns empty string for invalid inputs", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(119)).toBe("1:59");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(null)).toBe("");
    expect(formatClock(undefined)).toBe("");
    expect(formatClock(Number.NaN)).toBe("");
    expect(formatClock(-10)).toBe("");
  });
});

describe("formatLeft", () => {
  it("formats remaining time with 'left' suffix", () => {
    expect(formatLeft(361)).toBe("6:01 left");
    expect(formatLeft(3665)).toBe("1:01:05 left");
    expect(formatLeft(null)).toBe("");
    expect(formatLeft(-1)).toBe("");
  });
});

describe("formatLong", () => {
  it("formats long human-readable durations", () => {
    expect(formatLong(25)).toBe("under 1 min");
    expect(formatLong(42 * 60)).toBe("42 min");
    expect(formatLong(60 * 60)).toBe("1 hr");
    expect(formatLong(7 * 3600 + 52 * 60)).toBe("7 hr 52 min");
    expect(formatLong(0)).toBe("");
    expect(formatLong(null)).toBe("");
    expect(formatLong(undefined)).toBe("");
    expect(formatLong(-100)).toBe("");
  });
});
