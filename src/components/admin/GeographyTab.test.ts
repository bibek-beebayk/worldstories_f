import { describe, expect, it } from "vitest";
import { legendBins } from "@/components/admin/charts/CountryHeatmapMap";
import { flagEmoji } from "@/components/admin/GeographyTab";

describe("legendBins", () => {
  it("shows the real value range each colour stands for", () => {
    expect(legendBins(100).map((bin) => bin.label)).toEqual(["1–20", "21–40", "41–60", "61–80", "81–100"]);
  });

  it("drops colours a small maximum cannot reach, keeping every bin distinct", () => {
    expect(legendBins(3).map((bin) => bin.label)).toEqual(["1", "2", "3"]);
    expect(legendBins(1).map((bin) => bin.label)).toEqual(["1"]);
  });

  it("agrees with how heatColor buckets a value", async () => {
    const { heatColor } = await import("@/lib/geoMapColors");
    const maximum = 37;
    for (const bin of legendBins(maximum)) {
      const [low, high] = bin.label.split("–").map((part) => Number(part));
      expect(heatColor(low, maximum)).toBe(bin.color);
      expect(heatColor(high ?? low, maximum)).toBe(bin.color);
    }
  });
});

describe("flagEmoji", () => {
  it("builds a flag from the country code", () => {
    expect(flagEmoji("np")).toBe("🇳🇵");
    expect(flagEmoji("US")).toBe("🇺🇸");
  });

  it("falls back for anything that is not a two-letter code", () => {
    expect(flagEmoji("")).toBe("🏳️");
    expect(flagEmoji("USA")).toBe("🏳️");
  });
});
