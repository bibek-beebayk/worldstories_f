import type { StoryDetail } from "@/api/types";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import { plainText } from "@/lib/plainText";

export type StoryMetaMode = "hub" | "read" | "listen" | "read-along" | "watch";

const modeTitle: Record<StoryMetaMode, (title: string) => string> = {
  hub: (title) => title,
  read: (title) => `Read ${title}`,
  listen: (title) => `Listen to ${title}`,
  "read-along": (title) => `Read Along — ${title}`,
  watch: (title) => `Watch ${title}`,
};

const fallbackDescription: Record<StoryMetaMode, (title: string) => string> = {
  hub: (title) => `Read ${title} on WorldStories.`,
  read: (title) => `Read ${title} on WorldStories.`,
  listen: (title) => `Listen to ${title} on WorldStories.`,
  "read-along": (title) => `Read along with ${title} on WorldStories.`,
  watch: (title) => `Watch ${title} on WorldStories.`,
};

export function buildStoryMeta(story: StoryDetail, { mode }: { mode: StoryMetaMode }) {
  const storyPath = `/story/${story.slug}`;
  const author = story.author?.name ? ` by ${story.author.name}` : "";
  const plainTextSummary = plainText(story.summary || "");
  const fullDescription = plainText(story.about || plainTextSummary || fallbackDescription[mode](story.title));
  const datePublished = story.original_published_year
    ? [
        String(story.original_published_year),
        story.original_published_month ? String(story.original_published_month).padStart(2, "0") : null,
        story.original_published_day ? String(story.original_published_day).padStart(2, "0") : null,
      ]
        .filter(Boolean)
        .join("-")
    : story.site_published_date || undefined;

  return buildMeta({
    title: `${modeTitle[mode](story.title)}${author} | WorldStories`,
    description: fullDescription.slice(0, 160),
    path: storyPath,
    image: story.cover_image,
    type: "book",
    alternateLanguages: [
      { language: story.language, path: storyPath },
      ...story.translations.map((sibling) => ({
        language: sibling.language,
        path: `/story/${sibling.slug}`,
      })),
    ],
    structuredData: {
      "@context": "https://schema.org",
      "@type": story.has_audio ? ["CreativeWork", "Audiobook"] : "CreativeWork",
      name: story.title,
      description: fullDescription,
      abstract: plainTextSummary ? plainTextSummary.slice(0, 500) : undefined,
      url: `${SITE_URL}${storyPath}`,
      image: story.cover_image || undefined,
      genre: story.genres.map((genre) => genre.name),
      datePublished,
      author: story.author ? { "@type": "Person", name: story.author.name } : undefined,
      aggregateRating:
        story.reviews_count > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: story.rating,
              reviewCount: story.reviews_count,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
    },
  });
}

export function buildStoryNotFoundMeta(slug: string | undefined, _mode: StoryMetaMode) {
  return buildMeta({
    title: "Story Not Found | WorldStories",
    description: "The requested story could not be found.",
    path: `/story/${slug || ""}`,
    noIndex: true,
  });
}
