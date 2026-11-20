import { describe, expect, it } from "vitest";
import {
  buildStoryListParams,
  hasActiveListFilters,
  missingParts,
  parseStoryListParams,
  readyChecklist,
  storyStatus,
  toApiFilters,
} from "./storyList";

const NOW = new Date("2026-06-15T12:00:00Z").getTime();

describe("storyStatus", () => {
  it("matches the list badges", () => {
    expect(storyStatus({ is_published: false, publish_at: null }, NOW)).toBe("draft");
    expect(storyStatus({ is_published: false, publish_at: "2027-01-01T00:00:00Z" }, NOW)).toBe("draft");
    expect(storyStatus({ is_published: true, publish_at: null }, NOW)).toBe("published");
    expect(storyStatus({ is_published: true, publish_at: "2026-01-01T00:00:00Z" }, NOW)).toBe("published");
    expect(storyStatus({ is_published: true, publish_at: "2026-12-01T00:00:00Z" }, NOW)).toBe("scheduled");
  });
});

describe("missingParts", () => {
  it("lists only what is missing", () => {
    expect(
      missingParts({ chapter_count: 3, summary: "<p>s</p>", retrospective: "<p>r</p>", cover_image_url: "x.jpg" }),
    ).toEqual([]);
    expect(missingParts({ chapter_count: 0, summary: "", retrospective: null, cover_image_url: "" })).toEqual([
      "chapters",
      "summary",
      "retro",
      "cover",
    ]);
    expect(missingParts({ chapter_count: 2, summary: "  ", retrospective: "<p>r</p>", cover_image_url: "x" })).toEqual([
      "summary",
    ]);
  });
});

describe("readyChecklist", () => {
  const full = {
    cover_image_url: "c.jpg",
    about: "About",
    author: 4,
    genres: [1],
    summary: "<p>s</p>",
    chapter_count: 1,
  };

  it("is complete when every part is there", () => {
    expect(readyChecklist(full).every((item) => item.done)).toBe(true);
    expect(readyChecklist(full).map((item) => item.key)).toEqual([
      "cover",
      "about",
      "author",
      "genre",
      "summary",
      "chapters",
    ]);
  });

  it("marks exactly the missing parts", () => {
    const items = readyChecklist({
      ...full,
      cover_image_url: "",
      about: "  ",
      author: null,
      genres: [],
      chapter_count: 0,
    });
    expect(items.filter((item) => !item.done).map((item) => item.key)).toEqual([
      "cover",
      "about",
      "author",
      "genre",
      "chapters",
    ]);
  });
});

describe("list state in the URL", () => {
  it("is the default for no params", () => {
    expect(parseStoryListParams(new URLSearchParams(""))).toEqual({ q: "", status: "all", needs: [], sort: "newest" });
    expect(buildStoryListParams(parseStoryListParams(new URLSearchParams(""))).toString()).toBe("");
  });

  it("round-trips and keeps unrelated params such as storyId", () => {
    const params = new URLSearchParams("storyId=12&q=dragon&status=published&needs=cover,chapters&sort=title_asc");
    const state = parseStoryListParams(params);
    expect(state).toEqual({ q: "dragon", status: "published", needs: ["cover", "chapters"], sort: "title_asc" });
    const rebuilt = buildStoryListParams(state, params);
    expect(rebuilt.get("storyId")).toBe("12");
    expect(parseStoryListParams(rebuilt)).toEqual(state);
  });

  it("drops a changed filter from the URL when it returns to its default", () => {
    const base = new URLSearchParams("storyId=3&status=draft");
    const next = buildStoryListParams({ q: "", status: "all", needs: [], sort: "newest" }, base);
    expect(next.toString()).toBe("storyId=3");
  });

  it("ignores junk values", () => {
    expect(parseStoryListParams(new URLSearchParams("status=zzz&sort=sideways&needs=cover,bogus,cover"))).toEqual({
      q: "",
      status: "all",
      needs: ["cover"],
      sort: "newest",
    });
  });
});

describe("toApiFilters", () => {
  it("turns the state into API params", () => {
    expect(
      toApiFilters({ q: "x", status: "published", needs: ["summary", "retro", "cover", "chapters"], sort: "oldest" }),
    ).toEqual({
      status: "published",
      has_summary: false,
      has_retrospective: false,
      has_cover: false,
      has_chapters: false,
      sort: "oldest",
    });
    expect(toApiFilters({ q: "", status: "all", needs: [], sort: "newest" })).toEqual({});
  });

  it("knows when filters are active", () => {
    expect(hasActiveListFilters({ q: "", status: "all", needs: [], sort: "title_asc" })).toBe(false);
    expect(hasActiveListFilters({ q: "", status: "draft", needs: [], sort: "newest" })).toBe(true);
    expect(hasActiveListFilters({ q: "a", status: "all", needs: [], sort: "newest" })).toBe(true);
  });
});
