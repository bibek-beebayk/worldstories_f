import { describe, expect, it } from "vitest";
import type { DiscoverJustAdded, Story } from "@/api/types";
import { finderHref, finderLabel, formatReaders, justAddedFor, rankChangeLabel } from "./discover";
import { parseLibraryParams } from "./libraryParams";

describe("finder", () => {
  it("words the call to action for what was chosen", () => {
    expect(finderLabel("Scary", "20")).toBe("Show scary stories · under 20 min");
    expect(finderLabel("Funny", null)).toBe("Show funny stories");
    expect(finderLabel(null, "5")).toBe("Show stories · under 5 min");
    expect(finderLabel("Magical", "180")).toBe("Show magical stories · up to 3 hours");
    expect(finderLabel(null, null)).toBe("Browse the library");
  });

  it("opens the Library with the Library's own params", () => {
    expect(finderHref("scary", "20")).toBe("/library?max_minutes=20&mood=scary");
    expect(finderHref("scary", null)).toBe("/library?mood=scary");
    expect(finderHref(null, "60")).toBe("/library?max_minutes=60");
    expect(finderHref(null, null)).toBe("/library");
  });

  it("produces a URL the Library reads back as the same choice", () => {
    const url = new URL(finderHref("scary", "20"), "https://x.test");
    expect(parseLibraryParams(url.searchParams)).toMatchObject({ mood: ["scary"], maxMinutes: "20" });
  });
});

describe("trending labels", () => {
  it("pluralises readers", () => {
    expect(formatReaders(1)).toBe("1 reader");
    expect(formatReaders(3)).toBe("3 readers");
    expect(formatReaders(1200)).toBe("1,200 readers");
  });

  it("describes rank movement, including a story new to the ranking", () => {
    expect(rankChangeLabel(2)).toEqual({ kind: "up", text: "Up 2" });
    expect(rankChangeLabel(-1)).toEqual({ kind: "down", text: "Down 1" });
    expect(rankChangeLabel(0)).toEqual({ kind: "same", text: "" });
    expect(rankChangeLabel(null)).toEqual({ kind: "new", text: "New" });
  });
});

describe("justAddedFor", () => {
  const item = (id: number, format: DiscoverJustAdded["format"]): DiscoverJustAdded => ({ story: { id } as Story, format });
  const items = [item(1, "read"), item(2, "listen"), item(3, "read"), item(4, "watch")];

  it("shows everything under All, in order", () => {
    expect(justAddedFor(items, "all").map((i) => i.story.id)).toEqual([1, 2, 3, 4]);
  });

  it("narrows to one format, and a story is never in two tabs", () => {
    expect(justAddedFor(items, "read").map((i) => i.story.id)).toEqual([1, 3]);
    expect(justAddedFor(items, "watch").map((i) => i.story.id)).toEqual([4]);
    expect(justAddedFor(items, "quick_read")).toEqual([]);
  });
});
