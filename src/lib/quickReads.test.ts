import { describe, expect, it } from "vitest";
import {
  buildQuickReadParams,
  DEFAULT_QUICK_READ_FILTERS,
  hasActiveQuickReadFilters,
  parseQuickReadParams,
  timeChipToSummaryLength,
} from "./quickReads";

describe("timeChipToSummaryLength", () => {
  it("maps time chips to summary_length API values", () => {
    expect(timeChipToSummaryLength("all")).toBe("all");
    expect(timeChipToSummaryLength("under3")).toBe("under3");
    expect(timeChipToSummaryLength("mid")).toBe("mid");
    expect(timeChipToSummaryLength("long")).toBe("long");
  });
});

describe("parseQuickReadParams and buildQuickReadParams", () => {
  it("returns defaults for empty or invalid params", () => {
    expect(parseQuickReadParams(new URLSearchParams())).toEqual(DEFAULT_QUICK_READ_FILTERS);
    expect(parseQuickReadParams(new URLSearchParams("sort=bogus&time=huge&genre=abc&unread=no&audio=0"))).toEqual(
      DEFAULT_QUICK_READ_FILTERS,
    );
    expect(hasActiveQuickReadFilters(DEFAULT_QUICK_READ_FILTERS)).toBe(false);
  });

  it("maps valid URL params to filters and round-trips", () => {
    const parsed = parseQuickReadParams(
      new URLSearchParams("q=poe&genre=4&sort=summary_shortest&time=under3&unread=1&audio=1"),
    );
    expect(parsed).toEqual({
      q: "poe",
      genre: "4",
      sort: "summary_shortest",
      time: "under3",
      unread: true,
      audio: true,
    });
    expect(hasActiveQuickReadFilters(parsed)).toBe(true);
    expect(buildQuickReadParams(parsed).toString()).toBe(
      "q=poe&genre=4&sort=summary_shortest&time=under3&unread=1&audio=1",
    );
  });

  it("treats non-default sort as active for hiding shelves", () => {
    expect(hasActiveQuickReadFilters({ ...DEFAULT_QUICK_READ_FILTERS, sort: "summary_longest" })).toBe(true);
    expect(buildQuickReadParams(DEFAULT_QUICK_READ_FILTERS).toString()).toBe("");
  });
});
