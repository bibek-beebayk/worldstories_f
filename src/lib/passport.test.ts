import { describe, expect, it } from "vitest";
import type { PassportCountry, Story } from "@/api/types";
import {
  filterCountries,
  formatStampDate,
  pickNextStamps,
  pluralStories,
  sortByShortest,
  sortCountries,
} from "./passport";

const country = (overrides: Partial<PassportCountry> = {}): PassportCountry => ({
  code: "JP",
  name: "Japan",
  stories_available: 4,
  stories_completed: 0,
  explored: false,
  unlocked_at: null,
  next_story: {
    slug: "short-story",
    title: "Short Story",
    reading_time_minutes: 10,
  },
  ...overrides,
});

const story = (slug: string, readingTime: number | null): Story => ({
  id: slug.length,
  slug,
  title: slug,
  story_type: "Story",
  language: "en",
  description: "",
  cover_image: "",
  rating: 0,
  views: 0,
  is_completed: false,
  reading_time_minutes: readingTime,
});

describe("formatStampDate", () => {
  it("formats a valid date with a short English month", () => {
    expect(formatStampDate("2026-11-12T12:00:00Z")).toBe("Nov 12");
  });

  it("returns an empty string for null and invalid dates", () => {
    expect(formatStampDate(null)).toBe("");
    expect(formatStampDate("not-a-date")).toBe("");
  });
});

describe("pickNextStamps", () => {
  it("selects unexplored countries shortest-first, with nulls last", () => {
    const input = [
      country({
        code: "FR",
        name: "France",
        stories_available: 3,
        next_story: { slug: "fr", title: "FR", reading_time_minutes: null },
      }),
      country({
        code: "NP",
        name: "Nepal",
        stories_available: 8,
        next_story: { slug: "np", title: "NP", reading_time_minutes: 5 },
      }),
      country({
        code: "JP",
        name: "Japan",
        stories_available: 2,
        next_story: { slug: "jp", title: "JP", reading_time_minutes: 5 },
      }),
      country({ code: "CN", name: "China", explored: true }),
      country({ code: "US", name: "United States", next_story: null }),
    ];

    expect(pickNextStamps(input).map((item) => item.code)).toEqual(["JP", "NP", "FR"]);
    expect(input.map((item) => item.code)).toEqual(["FR", "NP", "JP", "CN", "US"]);
  });

  it("uses name after equal time and story count, respects limit, and handles empty input", () => {
    const input = [
      country({ code: "ZW", name: "Zimbabwe", stories_available: 2 }),
      country({ code: "AR", name: "Argentina", stories_available: 2 }),
    ];
    expect(pickNextStamps(input, 1).map((item) => item.code)).toEqual(["AR"]);
    expect(pickNextStamps([], 3)).toEqual([]);
    expect(pickNextStamps(input, -1)).toEqual([]);
  });
});

describe("sortCountries", () => {
  const input = [
    country({ code: "FR", name: "France", stories_available: 10, stories_completed: 2, explored: true }),
    country({ code: "JP", name: "Japan", stories_available: 2, stories_completed: 1, explored: true }),
    country({ code: "AR", name: "Argentina", stories_available: 2, stories_completed: 0, explored: false }),
  ];

  it("keeps server order for most without returning the original array", () => {
    const result = sortCountries(input, "most");
    expect(result.map((item) => item.code)).toEqual(["FR", "JP", "AR"]);
    expect(result).not.toBe(input);
  });

  it("sorts alphabetically and by progress without mutating input", () => {
    expect(sortCountries(input, "az").map((item) => item.code)).toEqual(["AR", "FR", "JP"]);
    expect(sortCountries(input, "progress").map((item) => item.code)).toEqual(["JP", "FR", "AR"]);
    expect(input.map((item) => item.code)).toEqual(["FR", "JP", "AR"]);
  });

  it("handles an empty array", () => {
    expect(sortCountries([], "progress")).toEqual([]);
  });
});

describe("filterCountries", () => {
  const input = [country({ code: "JP", explored: true }), country({ code: "FR", explored: false })];

  it("filters all three states and does not mutate the input", () => {
    expect(filterCountries(input, "all").map((item) => item.code)).toEqual(["JP", "FR"]);
    expect(filterCountries(input, "explored").map((item) => item.code)).toEqual(["JP"]);
    expect(filterCountries(input, "unexplored").map((item) => item.code)).toEqual(["FR"]);
    expect(input.map((item) => item.code)).toEqual(["JP", "FR"]);
  });

  it("handles an empty array", () => {
    expect(filterCountries([], "all")).toEqual([]);
  });
});

describe("sortByShortest", () => {
  it("sorts ascending, puts nulls last, stays stable, and does not mutate", () => {
    const input = [story("unknown", null), story("five-a", 5), story("long", 20), story("five-b", 5)];
    expect(sortByShortest(input).map((item) => item.slug)).toEqual(["five-a", "five-b", "long", "unknown"]);
    expect(input.map((item) => item.slug)).toEqual(["unknown", "five-a", "long", "five-b"]);
  });

  it("handles an empty array", () => {
    expect(sortByShortest([])).toEqual([]);
  });
});

describe("pluralStories", () => {
  it("uses the singular only for one", () => {
    expect(pluralStories(0)).toBe("0 stories");
    expect(pluralStories(1)).toBe("1 story");
    expect(pluralStories(2)).toBe("2 stories");
  });
});
