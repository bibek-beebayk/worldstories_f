import { describe, expect, it } from "vitest";
import {
  DEFAULT_BLOG_LIST,
  blogStatus,
  buildBlogListParams,
  hasActiveBlogFilters,
  missingBlogParts,
  parseBlogListParams,
  toBlogApiParams,
} from "./blogList";

describe("blogStatus", () => {
  const now = new Date("2026-11-20T12:00:00Z").getTime();

  it("returns draft when is_published is false even with future publish_at", () => {
    expect(blogStatus({ is_published: false, publish_at: "2026-12-01T12:00:00Z" }, now)).toBe("draft");
  });

  it("returns scheduled when is_published is true and publish_at is in the future", () => {
    expect(blogStatus({ is_published: true, publish_at: "2026-12-01T12:00:00Z" }, now)).toBe("scheduled");
  });

  it("returns published when is_published is true and publish_at is null or past", () => {
    expect(blogStatus({ is_published: true, publish_at: null }, now)).toBe("published");
    expect(blogStatus({ is_published: true, publish_at: "2026-11-20T11:59:59Z" }, now)).toBe("published");
  });
});

describe("missingBlogParts", () => {
  it("lists only missing excerpt, topics, cover", () => {
    expect(
      missingBlogParts({
        excerpt: "   ",
        topics: [],
        topic_details: [],
        cover_image_url: "",
      }),
    ).toEqual(["excerpt", "topics", "cover"]);

    expect(
      missingBlogParts({
        excerpt: "Summary",
        topics: [1],
        topic_details: [{ id: 1, name: "Essays", slug: "essays" }],
        cover_image_url: "https://example.com/c.jpg",
      }),
    ).toEqual([]);
  });
});

describe("URL param round-trip and API conversion", () => {
  it("parses defaults and ignores invalid values", () => {
    const parsed = parseBlogListParams(
      new URLSearchParams("page=0&status=nope&sort=bad&needs=excerpt,bogus&topic=abc"),
    );
    expect(parsed).toEqual({
      page: 1,
      q: "",
      status: "all",
      needs: ["excerpt"],
      topic: null,
      sort: "newest",
    });
  });

  it("round-trips full filter state and preserves unrelated params", () => {
    const state = {
      page: 3,
      q: "folklore",
      status: "scheduled" as const,
      needs: ["excerpt" as const, "cover" as const],
      topic: 7,
      sort: "updated" as const,
    };
    const built = buildBlogListParams(state, new URLSearchParams("tab=blog"));
    expect(built.get("tab")).toBe("blog");
    expect(parseBlogListParams(built)).toEqual(state);

    expect(toBlogApiParams(state)).toEqual({
      page: 3,
      search: "folklore",
      status: "scheduled",
      has_excerpt: false,
      has_cover: false,
      topic: 7,
      sort: "updated",
    });
  });

  it("detects active filters", () => {
    expect(hasActiveBlogFilters(DEFAULT_BLOG_LIST)).toBe(false);
    expect(hasActiveBlogFilters({ ...DEFAULT_BLOG_LIST, status: "draft" })).toBe(true);
    expect(hasActiveBlogFilters({ ...DEFAULT_BLOG_LIST, topic: 2 })).toBe(true);
    expect(hasActiveBlogFilters({ ...DEFAULT_BLOG_LIST, sort: "title_asc" })).toBe(true);
  });
});
