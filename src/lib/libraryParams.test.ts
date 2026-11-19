import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyCollectionParams,
  buildLibraryParams,
  canonicalPathFor,
  hasNarrowingFilters,
  parseLibraryParams,
  toApiParams,
} from "./libraryParams";

const parse = (query: string) => parseLibraryParams(new URLSearchParams(query));

describe("parseLibraryParams", () => {
  it("returns the empty state for a bare /library", () => {
    expect(parse("")).toEqual(EMPTY_FILTERS);
  });

  it("round-trips every param through the URL", () => {
    const query =
      "q=dragons&format=listen&genre=fantasy%2Cmystery&category=folk-tales&language=ne&length=10_60&country=NP&type=3&status=completed&original=true&mood=cozy&author=7&sort=shortest&view=list";
    const filters = parse(query);
    expect(filters).toMatchObject({
      q: "dragons",
      format: "listen",
      genre: ["fantasy", "mystery"],
      category: ["folk-tales"],
      language: "ne",
      length: "10_60",
      country: "NP",
      type: "3",
      status: "completed",
      original: true,
      mood: ["cozy"],
      author: "7",
      sort: "shortest",
      view: "list",
    });
    expect(parse(buildLibraryParams(filters).toString())).toEqual(filters);
  });

  it("keeps old links working", () => {
    expect(parse("mode=read").format).toBe("read");
    expect(parse("mode=read-along").format).toBe("read_along");
    expect(parse("format=read-along").format).toBe("read_along");
    expect(parse("moods=cozy,eerie").mood).toEqual(["cozy", "eerie"]);
    expect(parse("story_type=2").type).toBe("2");
    expect(parse("genre=4").genre).toEqual(["4"]); // an id from the old page; the API accepts it
    expect(parse("language=all").language).toBe("");
    expect(parse("sort=recent").sort).toBe("newest");
    expect(parse("sort=views").sort).toBe("popular");
  });

  it("ignores junk rather than breaking", () => {
    const filters = parse("format=nope&length=huge&status=x&sort=sideways&view=cube");
    expect(filters).toMatchObject({ format: "", length: "", status: "", sort: "popular", view: "grid" });
  });
});

describe("buildLibraryParams", () => {
  it("leaves defaults out so the bare library URL stays clean", () => {
    expect(buildLibraryParams(EMPTY_FILTERS).toString()).toBe("");
    expect(buildLibraryParams({ ...EMPTY_FILTERS, sort: "popular", view: "grid" }).toString()).toBe("");
  });

  it("drops the legacy `mode` when state is rewritten", () => {
    expect(buildLibraryParams(parse("mode=read")).toString()).toBe("format=read");
  });
});

describe("toApiParams", () => {
  it("maps URL names onto the list endpoint's names", () => {
    const api = toApiParams(parse("q=x&format=watch&genre=fantasy&type=3&original=true&mood=cozy&sort=title"));
    expect(api).toEqual({ q: "x", format: "watch", genre: "fantasy", story_type: "3", original: "true", moods: "cozy", sort: "title" });
  });

  it("can leave the format out", () => {
    expect(toApiParams(parse("format=watch"), { includeFormat: false }).format).toBeUndefined();
  });
});

describe("narrowing filters", () => {
  it("counts facets but not the format tab, sort or view", () => {
    expect(activeFilterCount(parse("format=listen&sort=title&view=list"))).toBe(0);
    expect(activeFilterCount(parse("genre=a,b&language=ne&original=true"))).toBe(4);
  });

  it("hides the collections strip for a search or any facet, not for a format tab", () => {
    expect(hasNarrowingFilters(parse(""))).toBe(false);
    expect(hasNarrowingFilters(parse("format=listen"))).toBe(false);
    expect(hasNarrowingFilters(parse("q=dragon"))).toBe(true);
    expect(hasNarrowingFilters(parse("length=under_10"))).toBe(true);
  });
});

describe("applyCollectionParams", () => {
  it("replaces filters with the tile's own, keeping format, sort and view", () => {
    const current = parse("format=listen&genre=mystery&q=x&sort=title&view=list");
    const next = applyCollectionParams(current, { language: "ne" });
    expect(next).toMatchObject({ language: "ne", format: "listen", sort: "title", view: "list", genre: [], q: "" });
    expect(applyCollectionParams(current, { original: "true" }).original).toBe(true);
    expect(applyCollectionParams(current, { genre: "fantasy" }).genre).toEqual(["fantasy"]);
    expect(applyCollectionParams(current, { author: "7", length: "under_10" })).toMatchObject({ author: "7", length: "under_10" });
  });
});

describe("canonicalPathFor", () => {
  const path = (query: string, slugs = {}) => canonicalPathFor(new URLSearchParams(query), slugs);

  it("is /library for the page itself and for filtered views", () => {
    expect(path("")).toBe("/library");
    expect(path("language=ne")).toBe("/library");
    expect(path("genre=fantasy,mystery")).toBe("/library");
    expect(path("genre=fantasy&language=ne")).toBe("/library");
    expect(path("format=listen&genre=fantasy")).toBe("/library");
  });

  it("points a lone genre or category at its landing page", () => {
    expect(path("genre=fantasy")).toBe("/genre/fantasy");
    expect(path("category=folk-tales")).toBe("/category/folk-tales");
    expect(path("genre=fantasy&sort=title&view=list")).toBe("/genre/fantasy");
  });

  it("cannot name a landing page from a bare numeric id", () => {
    expect(path("genre=4")).toBe("/library");
    expect(path("genre=4", { genre: "fantasy" })).toBe("/genre/fantasy");
  });
});
