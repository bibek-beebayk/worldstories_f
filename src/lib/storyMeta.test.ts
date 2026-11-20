import { describe, expect, it } from "vitest";
import type { StoryDetail } from "@/api/types";
import { SITE_URL } from "@/lib/buildMeta";
import { buildStoryMeta, buildStoryNotFoundMeta, type StoryMetaMode } from "@/lib/storyMeta";

const story = {
  slug: "the-raven",
  title: "The Raven",
  author: { name: "Edgar Allan Poe" },
  about: "A midnight visitor.",
  summary: "A poem about grief.",
  cover_image: "/raven.jpg",
  language: "en",
  translations: [{ id: 2, slug: "le-corbeau", language: "fr", title: "Le Corbeau" }],
  genres: [{ name: "Poetry" }],
  has_audio: true,
  reviews_count: 4,
  rating: 4.8,
  original_published_year: 1845,
  original_published_month: 1,
  original_published_day: 29,
} as StoryDetail;

const titles: Record<StoryMetaMode, string> = {
  hub: "The Raven by Edgar Allan Poe | WorldStories",
  read: "Read The Raven by Edgar Allan Poe | WorldStories",
  listen: "Listen to The Raven by Edgar Allan Poe | WorldStories",
  "read-along": "Read Along — The Raven by Edgar Allan Poe | WorldStories",
  watch: "Watch The Raven by Edgar Allan Poe | WorldStories",
};

describe("buildStoryMeta", () => {
  for (const mode of Object.keys(titles) as StoryMetaMode[]) {
    it(`builds canonical metadata for ${mode}`, () => {
      const meta = buildStoryMeta(story, { mode });
      const canonical = `${SITE_URL}/story/the-raven`;
      expect(meta).toContainEqual({ title: titles[mode] });
      expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: canonical });
      expect(meta).toContainEqual({ property: "og:url", content: canonical });
      expect(meta.some((entry) => "script:ld+json" in entry)).toBe(true);
    });
  }

  it("marks missing stories noindex", () => {
    expect(buildStoryNotFoundMeta("missing", "read")).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  });
});
