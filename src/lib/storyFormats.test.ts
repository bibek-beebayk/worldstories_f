import { describe, expect, it } from "vitest";
import { availableFormats, formatStoryLength, isNewStory } from "./storyFormats";

describe("formatStoryLength", () => {
  it("phrases minutes, then hours", () => {
    expect(formatStoryLength(12)).toBe("12 min");
    expect(formatStoryLength(59.6)).toBe("1 hr");
    expect(formatStoryLength(60)).toBe("1 hr");
    expect(formatStoryLength(90)).toBe("1.5 hr");
    expect(formatStoryLength(180)).toBe("3 hr");
  });

  it("says nothing when the length is unknown", () => {
    expect(formatStoryLength(null)).toBeNull();
    expect(formatStoryLength(undefined)).toBeNull();
    expect(formatStoryLength(0)).toBeNull();
  });
});

describe("isNewStory", () => {
  const now = new Date("2026-06-30T12:00:00Z").getTime();
  const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

  it("is new for two weeks", () => {
    expect(isNewStory(daysAgo(0), now)).toBe(true);
    expect(isNewStory(daysAgo(14), now)).toBe(true);
    expect(isNewStory(daysAgo(15), now)).toBe(false);
  });

  it("is not new without a date, or for a date in the future", () => {
    expect(isNewStory(null, now)).toBe(false);
    expect(isNewStory("not a date", now)).toBe(false);
    expect(isNewStory(daysAgo(-3), now)).toBe(false);
  });
});

describe("availableFormats", () => {
  it("lists only what a story is available in, with Read only when the API says so", () => {
    expect(availableFormats({})).toEqual([]);
    expect(availableFormats({ has_audio: true, has_video: true })).toEqual(["listen", "watch"]);
    expect(availableFormats({ has_text: true, has_audio: true, has_read_along: true, summary_reading_minutes: 3 })).toEqual([
      "read",
      "listen",
      "read_along",
      "quick_read",
    ]);
    expect(availableFormats({ has_text: null })).toEqual([]);
  });
});
