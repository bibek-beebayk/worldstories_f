import { describe, expect, it } from "vitest";
import { audienceBadges } from "./homeSectionSchedule";
import { buildHomeClickMetadata, findClickedItem } from "./homeClicks";

const items = [
  { id: 11, type: "story" as const, slug: "the-first" },
  { id: 12, type: "story" as const, slug: "the-second" },
];

describe("home section click metadata", () => {
  it("resolves the clicked item from the link slug", () => {
    expect(findClickedItem("/read/the-second", items)?.item.id).toBe(12);
    expect(findClickedItem("/read/the-second/chapter-1?x=1", items)?.index).toBe(1);
    expect(findClickedItem("/library", items)).toBeNull();
    expect(findClickedItem(null, items)).toBeNull();
  });

  it("describes the section, its page position and the item", () => {
    expect(
      buildHomeClickMetadata({ sectionId: 4, sectionType: "stories_query", position: 3, href: "/read/the-first", items })
    ).toEqual({
      section_id: 4,
      section_type: "stories_query",
      position: 3,
      item_id: 11,
      item_type: "story",
      item_position: 1,
    });
  });

  it("marks links that are not an item, such as See all", () => {
    const meta = buildHomeClickMetadata({ sectionId: 4, sectionType: "stories_query", position: 3, href: "/originals", items });
    expect(meta.item_id).toBeNull();
    expect(meta.item_type).toBe("link");
  });
});

describe("audienceBadges", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();

  it("shows nothing for an unrestricted section", () => {
    expect(audienceBadges({ show_to: "all", starts_at: null, ends_at: null }, now)).toEqual([]);
  });

  it("names the audience", () => {
    expect(audienceBadges({ show_to: "signed_in", starts_at: null, ends_at: null }, now)).toEqual(["Signed-in only"]);
    expect(audienceBadges({ show_to: "signed_out", starts_at: null, ends_at: null }, now)).toEqual(["Signed-out only"]);
  });

  it("describes the schedule relative to now", () => {
    const badge = (starts: string | null, ends: string | null) =>
      audienceBadges({ show_to: "all", starts_at: starts, ends_at: ends }, now)[0];
    expect(badge("2026-07-01T00:00:00Z", null)).toMatch(/^Starts /);
    expect(badge("2026-06-01T00:00:00Z", "2026-07-01T00:00:00Z")).toMatch(/^Until /);
    expect(badge("2026-05-01T00:00:00Z", "2026-06-01T00:00:00Z")).toBe("Ended");
    expect(badge("2026-06-01T00:00:00Z", null)).toMatch(/^Since /);
  });
});
