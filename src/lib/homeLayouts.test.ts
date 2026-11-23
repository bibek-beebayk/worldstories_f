import { describe, expect, it } from "vitest";
import { bentoSpan, effectiveCardStyle, effectiveLayout } from "./homeLayouts";

describe("effectiveLayout", () => {
  it("falls back to grid for layouts unsupported by the section type", () => {
    expect(effectiveLayout("trending", 10, 4, "videos")).toBe("grid");
    expect(effectiveLayout("covers", 10, 4, "videos")).toBe("grid");
    expect(effectiveLayout("trending", 10, 4, "blogs")).toBe("grid");
    expect(effectiveLayout("covers", 10, 4, "blogs")).toBe("grid");
    expect(effectiveLayout("featured", 10, 4, "banner")).toBe("grid");
  });

  it("keeps grid, rail, list, and trending when supported", () => {
    expect(effectiveLayout("grid", 1, 4, "stories_query")).toBe("grid");
    expect(effectiveLayout("rail", 2, 4, "videos")).toBe("rail");
    expect(effectiveLayout("list", 1, 4, "blogs")).toBe("list");
    expect(effectiveLayout("trending", 3, 4, "stories_manual")).toBe("trending");
  });

  it("requires at least 3 items for featured and bento", () => {
    expect(effectiveLayout("featured", 2, 4, "stories_query")).toBe("grid");
    expect(effectiveLayout("featured", 3, 4, "stories_query")).toBe("featured");
    expect(effectiveLayout("bento", 2, 4, "videos")).toBe("grid");
    expect(effectiveLayout("bento", 3, 4, "videos")).toBe("bento");
  });

  it("requires strictly more than columnsDesktop * 2 items for tworow", () => {
    expect(effectiveLayout("tworow", 8, 4, "stories_query")).toBe("grid");
    expect(effectiveLayout("tworow", 9, 4, "stories_query")).toBe("tworow");
    expect(effectiveLayout("tworow", 6, 3, "blogs")).toBe("grid");
    expect(effectiveLayout("tworow", 7, 3, "blogs")).toBe("tworow");
  });

  it("falls back to grid for carousel when items <= columnsDesktop", () => {
    expect(effectiveLayout("carousel", 4, 4, "stories_query")).toBe("grid");
    expect(effectiveLayout("carousel", 5, 4, "stories_query")).toBe("carousel");
  });

  it("requires at least 2 items for covers (stories only)", () => {
    expect(effectiveLayout("covers", 1, 4, "stories_query")).toBe("grid");
    expect(effectiveLayout("covers", 2, 4, "stories_query")).toBe("covers");
    expect(effectiveLayout("covers", 5, 4, "stories_manual")).toBe("covers");
  });
});

describe("bentoSpan", () => {
  it("follows the 7-item pattern across indexes 0 to 14", () => {
    const expected = [
      { colSpan: 2, rowSpan: 2 }, // 0
      { colSpan: 1, rowSpan: 1 }, // 1
      { colSpan: 1, rowSpan: 1 }, // 2
      { colSpan: 2, rowSpan: 1 }, // 3
      { colSpan: 1, rowSpan: 1 }, // 4
      { colSpan: 1, rowSpan: 1 }, // 5
      { colSpan: 1, rowSpan: 1 }, // 6
      { colSpan: 2, rowSpan: 2 }, // 7
      { colSpan: 1, rowSpan: 1 }, // 8
      { colSpan: 1, rowSpan: 1 }, // 9
      { colSpan: 2, rowSpan: 1 }, // 10
      { colSpan: 1, rowSpan: 1 }, // 11
      { colSpan: 1, rowSpan: 1 }, // 12
      { colSpan: 1, rowSpan: 1 }, // 13
      { colSpan: 2, rowSpan: 2 }, // 14
    ];
    for (let i = 0; i <= 14; i++) {
      expect(bentoSpan(i)).toEqual(expected[i]);
    }
  });
});

describe("effectiveCardStyle", () => {
  it("allows compact only for stories and falls back to default otherwise", () => {
    expect(effectiveCardStyle("compact", "stories_query")).toBe("compact");
    expect(effectiveCardStyle("compact", "stories_manual")).toBe("compact");
    expect(effectiveCardStyle("compact", "videos")).toBe("default");
    expect(effectiveCardStyle("compact", "blogs")).toBe("default");
    expect(effectiveCardStyle("overlay", "videos")).toBe("overlay");
    expect(effectiveCardStyle("wide", "blogs")).toBe("wide");
    expect(effectiveCardStyle("text", "blogs")).toBe("text");
    expect(effectiveCardStyle("overlay", "banner")).toBe("default");
  });
});
