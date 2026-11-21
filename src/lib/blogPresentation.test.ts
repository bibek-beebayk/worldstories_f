import { blogReadingLabel, wasBlogMeaningfullyUpdated } from "@/lib/blogPresentation";
import { describe, expect, it } from "vitest";

describe("blog presentation helpers", () => {
  it("only calls out updates more than a day after publication", () => {
    expect(wasBlogMeaningfullyUpdated("2025-01-01T00:00:00Z", "2025-01-02T00:00:00Z")).toBe(false);
    expect(wasBlogMeaningfullyUpdated("2025-01-01T00:00:00Z", "2025-01-02T00:00:01Z")).toBe(true);
  });

  it("omits unknown reading times", () => {
    expect(blogReadingLabel(null)).toBeNull();
    expect(blogReadingLabel(6)).toBe("6 min read");
  });
});
