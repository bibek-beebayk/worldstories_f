import { describe, expect, it } from "vitest";
import {
  buildAudiobookParams,
  DEFAULT_AUDIOBOOK_FILTERS,
  formatAudioDuration,
  hasActiveAudiobookFilters,
  parseAudiobookParams,
} from "./audiobooks";

describe("formatAudioDuration", () => {
  it("formats minutes under an hour, exact hours, hours+minutes, and null", () => {
    expect(formatAudioDuration(42)).toBe("42 min");
    expect(formatAudioDuration(60)).toBe("1 hr");
    expect(formatAudioDuration(120)).toBe("2 hr");
    expect(formatAudioDuration(200)).toBe("3 hr 20 min");
    expect(formatAudioDuration(null)).toBeNull();
    expect(formatAudioDuration(undefined)).toBeNull();
    expect(formatAudioDuration(0)).toBeNull();
    expect(formatAudioDuration(-5)).toBeNull();
  });
});

describe("parseAudiobookParams and buildAudiobookParams", () => {
  it("returns defaults for empty or invalid params", () => {
    expect(parseAudiobookParams(new URLSearchParams())).toEqual(DEFAULT_AUDIOBOOK_FILTERS);
    expect(parseAudiobookParams(new URLSearchParams("sort=bogus&length=huge&genre=notanumber&readalong=no"))).toEqual(
      DEFAULT_AUDIOBOOK_FILTERS,
    );
  });

  it("maps valid URL params to filters and round-trips cleanly", () => {
    const parsed = parseAudiobookParams(
      new URLSearchParams("q=sherlock&genre=5&language=en&sort=audio_shortest&length=short&readalong=1"),
    );
    expect(parsed).toEqual({
      q: "sherlock",
      genre: "5",
      language: "en",
      sort: "audio_shortest",
      length: "short",
      readalong: true,
    });
    expect(hasActiveAudiobookFilters(parsed)).toBe(true);
    expect(buildAudiobookParams(parsed).toString()).toBe(
      "q=sherlock&genre=5&language=en&sort=audio_shortest&length=short&readalong=1",
    );
  });

  it("omits default values when building URLSearchParams", () => {
    expect(buildAudiobookParams(DEFAULT_AUDIOBOOK_FILTERS).toString()).toBe("");
    expect(hasActiveAudiobookFilters(DEFAULT_AUDIOBOOK_FILTERS)).toBe(false);
    expect(hasActiveAudiobookFilters({ ...DEFAULT_AUDIOBOOK_FILTERS, sort: "audio_longest" })).toBe(false);
  });
});
