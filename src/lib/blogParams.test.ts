import { describe, expect, it } from "vitest";
import { buildBlogParams, formatBlogReadTime, formatReads, isBlogFiltered, parseBlogParams } from "./blogParams";

const parse = (query: string) => parseBlogParams(new URLSearchParams(query));

describe("blog list URL state", () => {
  it("is the default for a bare /blog", () => {
    expect(parse("")).toEqual({ topic: "", sort: "newest", q: "", page: 1 });
    expect(buildBlogParams(parse("")).toString()).toBe("");
  });

  it("round-trips topic, sort, search and page", () => {
    const state = parse("topic=folklore-myth&sort=popular&q=dragons&page=3");
    expect(state).toEqual({ topic: "folklore-myth", sort: "popular", q: "dragons", page: 3 });
    expect(parse(buildBlogParams(state).toString())).toEqual(state);
  });

  it("leaves defaults out of the URL", () => {
    expect(buildBlogParams({ topic: "", sort: "newest", q: "", page: 1 }).toString()).toBe("");
    expect(buildBlogParams({ topic: "x", sort: "newest", q: "", page: 1 }).toString()).toBe("topic=x");
  });

  it("copes with junk and the retired oldest-first sort", () => {
    expect(parse("sort=oldest").sort).toBe("newest");
    expect(parse("page=abc").page).toBe(1);
    expect(parse("page=-4").page).toBe(1);
    expect(parse("page=9999").page).toBe(50);
  });

  it("treats a topic or a search as filtered, which hides the front-page row", () => {
    expect(isBlogFiltered(parse(""))).toBe(false);
    expect(isBlogFiltered(parse("sort=popular&page=2"))).toBe(false);
    expect(isBlogFiltered(parse("topic=x"))).toBe(true);
    expect(isBlogFiltered(parse("q=x"))).toBe(true);
  });
});

describe("blog labels", () => {
  it("words reads and reading time", () => {
    expect(formatReads(1)).toBe("1 read");
    expect(formatReads(2400)).toBe("2,400 reads");
    expect(formatBlogReadTime(8)).toBe("8 min read");
    expect(formatBlogReadTime(null)).toBeNull();
    expect(formatBlogReadTime(0)).toBeNull();
  });
});
